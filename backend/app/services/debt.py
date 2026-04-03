"""Debt business logic. No HTTP awareness."""

import uuid
from datetime import date, timedelta

from dateutil.relativedelta import relativedelta
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.debt import Debt
from app.models.debt_payment import DebtPayment
from app.models.enums import AccountType, DebtStatus, DebtType, RepaymentMode, TransactionType
from app.models.p2p_debt_split import P2PDebtSplit
from app.models.person import Person
from app.models.transaction import Transaction
from app.schemas.debt import DebtCreate, DebtUpdate
from app.schemas.transaction import TransactionCreate
from app.services.account import get_balance_cutoff_date
from app.services.amortization import (
    FREQUENCY_MONTHS,
    compute_periodic_payment,
    generate_schedule,
)
from app.services.transaction import create_transaction


async def list_debts(
    session: AsyncSession,
    household_id: uuid.UUID,
    debt_type: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 50,
    exclude_types: list[str] | None = None,
) -> tuple[list[Debt], int]:
    base = select(Debt).where(
        Debt.household_id == household_id,
        Debt.is_active.is_(True),
    )
    count_base = select(func.count(Debt.id)).where(
        Debt.household_id == household_id,
        Debt.is_active.is_(True),
    )
    if debt_type:
        base = base.where(Debt.type == debt_type)
        count_base = count_base.where(Debt.type == debt_type)
    if exclude_types:
        base = base.where(Debt.type.notin_(exclude_types))
        count_base = count_base.where(Debt.type.notin_(exclude_types))
    if status:
        base = base.where(Debt.status == status)
        count_base = count_base.where(Debt.status == status)

    total = (await session.execute(count_base)).scalar_one()
    q = base.offset((page - 1) * page_size).limit(page_size).order_by(Debt.id)
    result = await session.execute(q)
    return list(result.scalars().all()), total


async def get_debt(
    session: AsyncSession,
    household_id: uuid.UUID,
    debt_id: int,
) -> Debt | None:
    q = select(Debt).where(
        Debt.id == debt_id,
        Debt.household_id == household_id,
        Debt.is_active.is_(True),
    )
    result = await session.execute(q)
    return result.scalar_one_or_none()


async def create_bank_loan(
    session: AsyncSession,
    household_id: uuid.UUID,
    data: DebtCreate,
) -> Debt:
    """Create a bank loan debt with computed periodic payment."""
    annual_rate_bps = int(round(data.annual_rate_percent * 100))
    frequency_months = FREQUENCY_MONTHS.get(data.payment_frequency, 1)
    periodic_payment = compute_periodic_payment(
        data.principal_minor, annual_rate_bps, data.tenure_months, frequency_months
    )

    # Default payment_day_of_month from start_date if not provided
    payment_day = data.payment_day_of_month
    if payment_day is None:
        payment_day = min(data.start_date.day, 28)

    # Validate linked_account_id if provided
    if data.linked_account_id:
        await _validate_linked_account(
            session, household_id, data.linked_account_id, AccountType.BANK_ACCOUNT
        )

    debt = Debt(
        household_id=household_id,
        type=DebtType.BANK_LOAN,
        name=data.name,
        institution=data.institution,
        principal_minor=data.principal_minor,
        currency=data.currency,
        annual_rate_bps=annual_rate_bps,
        tenure_months=data.tenure_months,
        start_date=data.start_date,
        payment_day_of_month=payment_day,
        payment_frequency=data.payment_frequency,
        monthly_payment_minor=periodic_payment,
        linked_account_id=data.linked_account_id,
        notes=data.notes,
        status=DebtStatus.ACTIVE,
    )
    session.add(debt)
    await session.flush()
    return debt


async def create_p2p_debt(
    session: AsyncSession,
    household_id: uuid.UUID,
    data: DebtCreate,
) -> Debt:
    """Create a P2P debt with splits based on repayment mode."""
    if not data.account_id:
        raise ValueError("ACCOUNT_ID_REQUIRED")
    if not data.person_id:
        raise ValueError("PERSON_REQUIRED")

    person_q = select(Person).where(
        Person.id == data.person_id,
        Person.household_id == household_id,
        Person.is_active.is_(True),
    )
    person = (await session.execute(person_q)).scalar_one_or_none()
    if not person:
        raise ValueError("PERSON_NOT_FOUND")

    mode = data.repayment_mode
    valid_modes = {"lump_sum", "equal_splits", "custom_splits"}
    if not mode or mode not in valid_modes:
        raise ValueError("INVALID_REPAYMENT_MODE")
    if mode == "lump_sum" and not data.due_date:
        raise ValueError("DUE_DATE_REQUIRED")
    if mode == "equal_splits" and not data.split_count:
        raise ValueError("SPLIT_COUNT_REQUIRED")
    if mode == "custom_splits":
        if not data.splits:
            raise ValueError("SPLITS_REQUIRED")
        splits_total = sum(s.amount_minor for s in data.splits)
        if splits_total != data.principal_minor:
            raise ValueError("SPLITS_SUM_MISMATCH")

    monthly_payment = data.principal_minor // data.tenure_months

    debt_type = (
        DebtType.PERSONAL_LENT if data.type == "personal_lent" else DebtType.PERSONAL_BORROWED
    )
    repayment_mode_enum = RepaymentMode(mode) if mode else None

    debt = Debt(
        household_id=household_id,
        type=debt_type,
        person_id=data.person_id,
        name=data.name,
        institution=data.institution,
        principal_minor=data.principal_minor,
        currency=data.currency,
        annual_rate_bps=0,
        tenure_months=data.tenure_months,
        start_date=data.start_date,
        monthly_payment_minor=monthly_payment,
        repayment_mode=repayment_mode_enum,
        due_date=data.due_date,
        linked_account_id=data.linked_account_id,
        notes=data.notes,
        status=DebtStatus.ACTIVE,
    )
    session.add(debt)
    await session.flush()

    raw_splits: list[dict] = []
    if mode == "lump_sum" and data.due_date is not None:
        raw_splits = generate_lump_sum_split(data.principal_minor, data.due_date)
    elif mode == "equal_splits" and data.split_count is not None:
        raw_splits = generate_equal_splits(data.principal_minor, data.split_count, data.start_date)
    elif mode == "custom_splits" and data.splits is not None:
        raw_splits = [{"amount_minor": s.amount_minor, "due_date": s.due_date} for s in data.splits]

    for s in raw_splits:
        split = P2PDebtSplit(
            debt_id=debt.id,
            amount_minor=s["amount_minor"],
            due_date=s["due_date"],
        )
        session.add(split)
    await session.flush()

    # Auto-create initial transaction
    if data.type == "personal_lent":
        tx_type = TransactionType.DEBIT
        tx_desc = f"Lent to: {debt.name}"
    else:
        tx_type = TransactionType.CREDIT
        tx_desc = f"Borrowed from: {debt.name}"

    debt_category_id = await _get_debt_category_id(session, tx_type)
    tx_data = TransactionCreate(
        account_id=data.account_id,
        date=data.start_date,
        description=tx_desc,
        amount_minor=data.principal_minor,
        type=tx_type,
        category_id=debt_category_id,
    )
    await create_transaction(session, household_id, tx_data)

    return debt


async def get_splits(
    session: AsyncSession,
    debt_id: int,
) -> list[P2PDebtSplit]:
    """Return all splits for a debt, ordered by due_date."""
    q = select(P2PDebtSplit).where(P2PDebtSplit.debt_id == debt_id).order_by(P2PDebtSplit.due_date)
    result = await session.execute(q)
    return list(result.scalars().all())


async def update_debt(
    session: AsyncSession,
    household_id: uuid.UUID,
    debt: Debt,
    data: DebtUpdate,
) -> Debt:
    """Update mutable fields."""
    update_data = data.model_dump(exclude_unset=True)

    # Validate linked_account_id change
    if "linked_account_id" in update_data and update_data["linked_account_id"] is not None:
        expected_type = AccountType.BANK_ACCOUNT if debt.type == DebtType.BANK_LOAN else None
        if expected_type:
            await _validate_linked_account(
                session, household_id, update_data["linked_account_id"], expected_type
            )

    for field, value in update_data.items():
        setattr(debt, field, value)
    await session.flush()
    return debt


async def has_payments(session: AsyncSession, debt_id: int) -> bool:
    q = select(func.count(DebtPayment.id)).where(DebtPayment.debt_id == debt_id)
    count = (await session.execute(q)).scalar_one()
    return count > 0


async def count_payments(session: AsyncSession, debt_id: int) -> int:
    q = select(func.count(DebtPayment.id)).where(DebtPayment.debt_id == debt_id)
    return (await session.execute(q)).scalar_one()


async def soft_delete_debt(session: AsyncSession, debt: Debt) -> None:
    debt.is_active = False
    await session.flush()


async def get_amortization_schedule(session: AsyncSession, debt: Debt) -> list[dict]:
    payments = await _get_payments(session, debt.id)
    freq = debt.payment_frequency
    frequency_months = FREQUENCY_MONTHS.get(
        freq.value if hasattr(freq, "value") else (freq or "monthly"), 1
    )
    return generate_schedule(
        principal_minor=debt.principal_minor,
        annual_rate_bps=debt.annual_rate_bps,
        tenure_months=debt.tenure_months,
        start_date=debt.start_date,
        payments=payments,
        frequency_months=frequency_months,
        payment_day_of_month=debt.payment_day_of_month,
    )


def _payment_transaction_details(debt: Debt, notes: str | None) -> tuple[str, str]:
    """Return (transaction_type, description) for auto-created payment transaction."""
    if debt.type == DebtType.PERSONAL_LENT:
        return TransactionType.CREDIT, f"Debt collection: {debt.name}"
    else:
        return TransactionType.DEBIT, f"Debt payment: {debt.name}"


async def _get_debt_category_id(session: AsyncSession, tx_type: str) -> int | None:
    """Find the predefined Debt Payment or Debt Collection category."""
    from app.models.category import Category

    target_name = "Debt Collection" if tx_type == TransactionType.CREDIT else "Debt Payment"
    q = select(Category).where(
        Category.is_predefined.is_(True),
        Category.name_en == target_name,
    )
    cat = (await session.execute(q)).scalar_one_or_none()
    return cat.id if cat else None


async def record_payment(
    session: AsyncSession,
    household_id: uuid.UUID,
    debt: Debt,
    payment_date: date,
    amount_minor: int,
    account_id: int,
    link_existing_transaction_id: int | None = None,
    notes: str | None = None,
    applies_to_balance_override: bool | None = None,
) -> DebtPayment:
    """Record a payment, auto-computing principal/interest split for bank loans."""
    # Use principal-paid sum (not total-paid) so that interest portions in prior
    # payments don't cause remaining to go negative on interest-bearing loans.
    principal_paid = await _principal_paid(session, debt.id)
    remaining_principal = debt.principal_minor - principal_paid

    if remaining_principal <= 0:
        raise ValueError("DEBT_ALREADY_PAID")
    # For 0% loans every payment is pure principal; guard against overpayment.
    if debt.annual_rate_bps == 0 and amount_minor > remaining_principal:
        raise ValueError("PAYMENT_EXCEEDS_REMAINING")

    principal_portion: int | None = None
    interest_portion: int | None = None

    if debt.type == DebtType.BANK_LOAN and debt.annual_rate_bps > 0:
        # Generate theoretical schedule without recorded payments to obtain the
        # canonical principal/interest split per installment.  Passing payments=[]
        # is intentional — all rows will have status != "paid", which is what we
        # need to find the matching month's ratio without previous-payment state.
        freq = debt.payment_frequency
        fm = FREQUENCY_MONTHS.get(freq.value if hasattr(freq, "value") else (freq or "monthly"), 1)
        schedule = generate_schedule(
            principal_minor=debt.principal_minor,
            annual_rate_bps=debt.annual_rate_bps,
            tenure_months=debt.tenure_months,
            start_date=debt.start_date,
            payments=[],
            frequency_months=fm,
            payment_day_of_month=debt.payment_day_of_month,
        )
        # Find the matching schedule row by calendar month
        matching_row = None
        for row in schedule:
            if row["date"].month == payment_date.month and row["date"].year == payment_date.year:
                matching_row = row
                break
        if not matching_row:
            # Fallback: use first row (handles off-schedule payments)
            matching_row = schedule[0] if schedule else None

        if matching_row and matching_row["payment_minor"] > 0:
            # Integer round-to-nearest: avoid float division for money
            numerator = amount_minor * matching_row["interest_minor"]
            denominator = matching_row["payment_minor"]
            interest_portion = int((numerator + denominator // 2) // denominator)
            principal_portion = amount_minor - interest_portion
        else:
            principal_portion = amount_minor
            interest_portion = 0
    elif debt.type == DebtType.BANK_LOAN:
        # 0% interest — entire payment reduces principal
        principal_portion = amount_minor
        interest_portion = 0
    else:
        # P2P debts — no interest, entire payment is principal
        principal_portion = amount_minor
        interest_portion = 0

    payment = DebtPayment(
        debt_id=debt.id,
        date=payment_date,
        amount_minor=amount_minor,
        principal_minor=principal_portion,
        interest_minor=interest_portion,
        notes=notes,
    )
    session.add(payment)
    await session.flush()

    # --- Auto-create or link transaction ---
    if link_existing_transaction_id is not None:
        existing_tx = await session.get(Transaction, link_existing_transaction_id)
        if (
            existing_tx is None
            or not existing_tx.is_active
            or existing_tx.household_id != household_id
            or existing_tx.account_id != account_id
        ):
            raise ValueError("TRANSACTION_NOT_FOUND")
        payment.transaction_id = existing_tx.id
        await session.flush()
    else:
        # Determine whether this payment affects the account balance
        if applies_to_balance_override is not None:
            affects_balance = applies_to_balance_override
        else:
            account = await session.get(Account, account_id)
            if account is None or not account.is_active or account.household_id != household_id:
                raise ValueError("ACCOUNT_NOT_FOUND")
            cutoff = get_balance_cutoff_date(account)
            affects_balance = payment_date >= cutoff if cutoff else True

        tx_type, tx_description = _payment_transaction_details(debt, notes)
        debt_category_id = await _get_debt_category_id(session, tx_type)
        tx_data = TransactionCreate(
            account_id=account_id,
            date=payment_date,
            description=tx_description,
            amount_minor=amount_minor,
            type=tx_type,
            category_id=debt_category_id,
            notes=notes,
            applies_to_balance=affects_balance,
        )
        new_tx = await create_transaction(session, household_id, tx_data)
        payment.transaction_id = new_tx.id
        await session.flush()

    # For P2P debts, find the earliest unpaid split and mark it paid
    if debt.type in (DebtType.PERSONAL_LENT, DebtType.PERSONAL_BORROWED):
        unpaid_q = (
            select(P2PDebtSplit)
            .where(
                P2PDebtSplit.debt_id == debt.id,
                P2PDebtSplit.paid.is_(False),
            )
            .order_by(P2PDebtSplit.due_date)
            .limit(1)
        )
        unpaid_split = (await session.execute(unpaid_q)).scalar_one_or_none()
        if unpaid_split:
            unpaid_split.paid = True
            unpaid_split.payment_id = payment.id
            await session.flush()

    # Check if debt is fully paid off using principal balance, not total cash paid.
    principal_portion_value = principal_portion if principal_portion is not None else amount_minor
    new_principal_paid = principal_paid + principal_portion_value
    if new_principal_paid >= debt.principal_minor:
        debt.status = DebtStatus.PAID_OFF
        await session.flush()

    return payment


async def bulk_record_past_payments(
    session: AsyncSession,
    household_id: uuid.UUID,
    debt: Debt,
    installment_numbers: list[int],
    account_id: int,
) -> dict:
    """Record multiple past payments in bulk, respecting balance cutoff dates."""
    # Validate account
    account = await session.get(Account, account_id)
    if account is None or not account.is_active or account.household_id != household_id:
        raise ValueError("ACCOUNT_NOT_FOUND")

    cutoff = get_balance_cutoff_date(account)

    # Generate the amortization schedule
    freq = debt.payment_frequency
    frequency_months = FREQUENCY_MONTHS.get(
        freq.value if hasattr(freq, "value") else (freq or "monthly"), 1
    )
    payments_list = await _get_payments(session, debt.id)
    schedule = generate_schedule(
        principal_minor=debt.principal_minor,
        annual_rate_bps=debt.annual_rate_bps,
        tenure_months=debt.tenure_months,
        start_date=debt.start_date,
        payments=payments_list,
        frequency_months=frequency_months,
        payment_day_of_month=debt.payment_day_of_month,
    )
    schedule_by_num = {row["payment_number"]: row for row in schedule}

    recorded_count = 0
    balance_affecting_count = 0
    history_only_count = 0
    total_balance_impact_minor = 0

    for num in sorted(installment_numbers):
        row = schedule_by_num.get(num)
        if row is None:
            continue
        payment_date = row["date"]
        amount = row["payment_minor"]
        affects_balance = payment_date >= cutoff if cutoff else True

        await record_payment(
            session=session,
            household_id=household_id,
            debt=debt,
            payment_date=payment_date,
            amount_minor=amount,
            account_id=account_id,
            applies_to_balance_override=affects_balance,
        )
        recorded_count += 1
        if affects_balance:
            balance_affecting_count += 1
            total_balance_impact_minor += amount
        else:
            history_only_count += 1

    return {
        "recorded_count": recorded_count,
        "balance_affecting_count": balance_affecting_count,
        "history_only_count": history_only_count,
        "total_balance_impact_minor": total_balance_impact_minor,
    }


async def bulk_payment(
    session: AsyncSession,
    household_id: uuid.UUID,
    items: list[dict],
    fee_minor: int,
    account_id: int,
    payment_date: date,
    link_existing_transaction_id: int | None = None,
) -> dict:
    """Process a bulk BNPL payment across multiple debts, with optional fee transaction."""
    payments_created = 0
    total_minor = 0

    for item in items:
        debt = await get_debt(session, household_id, item["debt_id"])
        if not debt:
            raise ValueError(f"DEBT_NOT_FOUND:{item['debt_id']}")

        await record_payment(
            session=session,
            household_id=household_id,
            debt=debt,
            payment_date=payment_date,
            amount_minor=item["amount_minor"],
            account_id=account_id,
            link_existing_transaction_id=link_existing_transaction_id,
        )
        payments_created += 1
        total_minor += item["amount_minor"]

    fee_transaction_id: int | None = None
    if fee_minor > 0:
        from app.models.category import Category

        q = select(Category).where(
            Category.is_predefined.is_(True),
            Category.name_en == "Fees & Charges",
        )
        fee_cat = (await session.execute(q)).scalar_one_or_none()
        fee_category_id = fee_cat.id if fee_cat else None

        tx_data = TransactionCreate(
            account_id=account_id,
            date=payment_date,
            description="BNPL Payment Fees",
            amount_minor=fee_minor,
            type=TransactionType.DEBIT,
            category_id=fee_category_id,
        )
        fee_tx = await create_transaction(session, household_id, tx_data)
        fee_transaction_id = fee_tx.id
        total_minor += fee_minor

    return {
        "payments_created": payments_created,
        "total_minor": total_minor,
        "fee_transaction_id": fee_transaction_id,
    }


async def get_payments(session: AsyncSession, debt_id: int) -> list[DebtPayment]:
    return await _get_payments(session, debt_id)


async def mark_paid(session: AsyncSession, debt: Debt) -> Debt:
    debt.status = DebtStatus.PAID_OFF
    await session.flush()
    return debt


async def get_match_suggestions(
    session: AsyncSession,
    household_id: uuid.UUID,
    debt: Debt,
) -> list[dict]:
    """Find transactions that may match upcoming payments."""
    if not debt.linked_account_id:
        return []

    schedule = await get_amortization_schedule(session, debt)
    unpaid_rows = [r for r in schedule if r["status"] in ("overdue", "upcoming")]
    if not unpaid_rows:
        return []

    suggestions = []
    for row in unpaid_rows[:3]:  # Check next 3 unpaid periods
        window_start = row["date"] - timedelta(days=5)
        window_end = row["date"] + timedelta(days=5)
        expected = row["payment_minor"]
        tolerance = int(expected * 0.05)

        q = select(Transaction).where(
            Transaction.household_id == household_id,
            Transaction.account_id == debt.linked_account_id,
            Transaction.is_active.is_(True),
            Transaction.date >= window_start,
            Transaction.date <= window_end,
            Transaction.amount_minor < 0,  # Debits only
        )
        txs = (await session.execute(q)).scalars().all()

        for tx in txs:
            tx_amount = abs(tx.amount_minor)
            if abs(tx_amount - expected) <= tolerance:
                if tx_amount == expected:
                    score = 1.0
                else:
                    score = 0.8 + 0.2 * (1 - abs(tx_amount - expected) / tolerance)
                suggestions.append(
                    {
                        "transaction_id": tx.id,
                        "date": tx.date,
                        "amount_minor": tx_amount,
                        "description": tx.description,
                        "score": round(score, 2),
                    }
                )

    # Deduplicate by transaction_id, keeping the highest-score suggestion.
    best: dict[int, dict] = {}
    for s in suggestions:
        tid = s["transaction_id"]
        if tid not in best or s["score"] > best[tid]["score"]:
            best[tid] = s

    result = list(best.values())
    result.sort(key=lambda s: s["score"], reverse=True)
    return result


async def compute_debt_totals(
    session: AsyncSession, debt_id: int, principal_minor: int
) -> tuple[int, int]:
    """Return (total_paid, remaining_principal) for a debt.

    total_paid     — sum of all payment amounts (principal + interest cash out)
    remaining      — outstanding principal balance (not total future cash owed)

    Callers must pass principal_minor from the already-loaded Debt object to
    avoid a redundant query and prevent NoResultFound on concurrent soft-deletes.
    """
    total_paid = await _total_paid(session, debt_id)
    principal_paid = await _principal_paid(session, debt_id)
    return total_paid, max(principal_minor - principal_paid, 0)


async def batch_compute_debt_totals(
    session: AsyncSession, debts: list[tuple[int, int]]
) -> dict[int, tuple[int, int]]:
    """Batch version of compute_debt_totals — single GROUP BY query for all debts."""
    if not debts:
        return {}
    debt_ids = [d[0] for d in debts]
    principal_map = {d[0]: d[1] for d in debts}

    q = (
        select(
            DebtPayment.debt_id,
            func.coalesce(func.sum(DebtPayment.amount_minor), 0).label("total_paid"),
            func.coalesce(func.sum(DebtPayment.principal_minor), 0).label("principal_paid"),
        )
        .where(DebtPayment.debt_id.in_(debt_ids))
        .group_by(DebtPayment.debt_id)
    )
    rows = (await session.execute(q)).all()
    result: dict[int, tuple[int, int]] = {}
    for row in rows:
        principal_minor = principal_map[row.debt_id]
        principal_paid = row.principal_paid if row.principal_paid is not None else 0
        remaining = max(principal_minor - principal_paid, 0)
        result[row.debt_id] = (row.total_paid, remaining)

    # Fill in debts with no payments
    for debt_id, principal_minor in principal_map.items():
        if debt_id not in result:
            result[debt_id] = (0, max(principal_minor, 0))
    return result


def generate_equal_splits(
    principal_minor: int,
    split_count: int,
    start_date: date,
) -> list[dict]:
    """Generate N equal monthly splits. Last split absorbs rounding remainder.

    Pure computation — no DB access.
    """
    base_amount = principal_minor // split_count
    remainder = principal_minor - (base_amount * split_count)
    splits = []
    for i in range(split_count):
        amount = base_amount + (remainder if i == split_count - 1 else 0)
        due = start_date + relativedelta(months=i + 1)
        splits.append({"amount_minor": amount, "due_date": due})
    return splits


def generate_lump_sum_split(
    principal_minor: int,
    due_date: date,
) -> list[dict]:
    """Single split at the given due date.

    Pure computation — no DB access.
    """
    return [{"amount_minor": principal_minor, "due_date": due_date}]


# --- Private helpers ---


async def _get_payments(session: AsyncSession, debt_id: int) -> list[DebtPayment]:
    q = select(DebtPayment).where(DebtPayment.debt_id == debt_id).order_by(DebtPayment.date)
    result = await session.execute(q)
    return list(result.scalars().all())


async def _total_paid(session: AsyncSession, debt_id: int) -> int:
    q = select(func.coalesce(func.sum(DebtPayment.amount_minor), 0)).where(
        DebtPayment.debt_id == debt_id
    )
    return (await session.execute(q)).scalar_one()


async def _principal_paid(session: AsyncSession, debt_id: int) -> int:
    """Sum of principal_minor already recorded — used for remaining-balance checks."""
    q = select(func.coalesce(func.sum(DebtPayment.principal_minor), 0)).where(
        DebtPayment.debt_id == debt_id
    )
    result = (await session.execute(q)).scalar_one()
    # coalesce guarantees non-null at runtime; guard satisfies pyright (principal_minor is nullable)
    return result if result is not None else 0


async def _validate_linked_account(
    session: AsyncSession,
    household_id: uuid.UUID,
    account_id: int,
    expected_type: AccountType,
) -> None:
    """Validate that linked account exists, is active, and has the expected type."""
    q = select(Account).where(
        Account.id == account_id,
        Account.household_id == household_id,
        Account.is_active.is_(True),
    )
    account = (await session.execute(q)).scalar_one_or_none()
    if not account:
        raise ValueError("LINKED_ACCOUNT_NOT_FOUND")

    # Account.type is an AccountType enum member, compare with expected_type
    if account.type != expected_type:
        raise ValueError("INVALID_ACCOUNT_TYPE")
