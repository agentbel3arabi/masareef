"""Seed a deterministic demo household: 18 months of Egyptian personal-finance activity.

Creates (or finds) the Supabase demo user, provisions its household, seeds the
predefined/system reference data, then writes accounts, ~900 transactions, a car
loan with its payment history, two installment plans, and two P2P debts. The
transaction plan comes from a fixed RNG seed, so the same anchor date always
yields the same dataset — record the anchor in the demo plan and re-runs match.

Usage:
    cd backend
    uv run python -m scripts.seed_demo                       # anchor = today
    uv run python -m scripts.seed_demo --anchor 2026-09-01   # reproducible
    uv run python -m scripts.seed_demo --user-id <uuid>      # skip Supabase; use an existing user

Reset: docker compose -f ../docker-compose.dev.yml down -v, then migrate and re-seed.
"""

import argparse
import asyncio
import calendar
import random
import uuid
from dataclasses import dataclass
from datetime import date

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.database import async_session_factory, engine
from app.models.account import Account
from app.models.category import Category
from app.models.enums import HouseholdRole, PersonRelationship, TransactionType
from app.models.financial_institution import FinancialInstitution
from app.models.household import Household, HouseholdMember
from app.schemas.account import AccountCreate
from app.schemas.debt import DebtCreate
from app.schemas.installment import InstallmentCreate
from app.schemas.person import PersonCreate
from app.schemas.transaction import TransactionCreate
from app.schemas.transfer import TransferCreate
from app.seed import PREDEFINED_CATEGORIES
from app.seed.run_seeds import seed_institutions, seed_system_categories
from app.services.account import create_account
from app.services.debt import create_bank_loan, create_p2p_debt, record_payment
from app.services.installment import create_installment
from app.services.person import create_person
from app.services.transaction import create_transaction
from app.services.transfer import create_transfer

RNG_SEED = 20260327  # the repo's birthday
MONTHS = 18
DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "masareef-demo"

DEBIT = TransactionType.DEBIT
CREDIT = TransactionType.CREDIT

# key, AccountCreate fields, institution slug. Amounts are minor units (piastres / cents).
ACCOUNTS: list[tuple[str, dict, str]] = [
    (
        "hsbc",
        {
            "name": "HSBC Current Account",
            "name_ar": "حساب HSBC الجاري",
            "type": "bank_account",
            "currency": "EGP",
            "opening_balance": 4_250_000,
        },
        "hsbc",
    ),
    (
        "cib_cc",
        {
            "name": "CIB Credit Card",
            "name_ar": "بطاقة CIB الائتمانية",
            "type": "credit_card",
            "currency": "EGP",
            "opening_balance": 824_000,
            "credit_limit": 6_000_000,
            "billing_cycle_day": 25,
            "payment_due_day": 15,
        },
        "cib",
    ),
    (
        "vfcash",
        {
            "name": "Vodafone Cash",
            "name_ar": "فودافون كاش",
            "type": "digital_wallet",
            "currency": "EGP",
            "opening_balance": 120_000,
        },
        "vodafone-cash",
    ),
    (
        "usd",
        {
            "name": "USD Savings",
            "name_ar": "توفير بالدولار",
            "type": "bank_account",
            "currency": "USD",
            "opening_balance": 300_000,
        },
        "cib",
    ),
    (
        "valu",
        {
            "name": "ValU",
            "name_ar": "ﭬاليو",
            "type": "financing_app",
            "currency": "EGP",
            "opening_balance": 0,
        },
        "valu",
    ),
]

# Variable monthly spend: category, merchants, per-month count range, amount range, account weights.
SPEND: list[tuple[str, list[str], tuple[int, int], tuple[int, int], dict[str, int]]] = [
    (
        "Groceries",
        ["Carrefour", "Seoudi Market", "Spinneys", "Kazyon", "Metro Market"],
        (6, 10),
        (25_000, 180_000),
        {"hsbc": 3, "cib_cc": 5},
    ),
    (
        "Food & Dining",
        [
            "Talabat",
            "Breadfast",
            "Cilantro",
            "Zooba",
            "Buffalo Burger",
            "Koshary Abou Tarek",
            "Bazooka",
        ],
        (8, 14),
        (12_000, 65_000),
        {"cib_cc": 6, "vfcash": 2, "hsbc": 1},
    ),
    (
        "Transportation",
        ["Uber", "Careem", "Swvl", "Cairo Metro"],
        (4, 10),
        (4_500, 30_000),
        {"vfcash": 4, "cib_cc": 3},
    ),
    (
        "Fuel",
        ["Mobil", "TotalEnergies", "Wataniya", "Chillout"],
        (2, 4),
        (70_000, 130_000),
        {"cib_cc": 1},
    ),
    (
        "Shopping",
        ["Amazon.eg", "Noon", "Jumia", "B.TECH", "Zara", "LC Waikiki", "IKEA"],
        (1, 3),
        (40_000, 500_000),
        {"cib_cc": 1},
    ),
    (
        "Healthcare",
        ["El Ezaby Pharmacy", "Seif Pharmacy", "Cleopatra Hospital"],
        (0, 2),
        (15_000, 250_000),
        {"cib_cc": 2, "hsbc": 1},
    ),
    (
        "Entertainment",
        ["VOX Cinemas", "Steam", "PlayStation Store", "Galaxy Cinemas"],
        (0, 2),
        (20_000, 120_000),
        {"cib_cc": 1},
    ),
    (
        "Education",
        ["Udemy", "Coursera", "Diwan Bookstore"],
        (0, 1),
        (30_000, 90_000),
        {"cib_cc": 1},
    ),
    (
        "Government/Fees",
        ["Traffic Department", "Bank fees", "Notary office"],
        (0, 1),
        (10_000, 150_000),
        {"hsbc": 1},
    ),
]

UNCATEGORIZED_SHARE = 0.05  # bank-feed noise the categorizer never resolved


@dataclass(frozen=True)
class PlannedTx:
    account: str
    date: date
    description: str
    amount_minor: int
    type: TransactionType
    category: str | None


@dataclass(frozen=True)
class PlannedTransfer:
    from_account: str
    to_account: str
    date: date
    description: str
    amount_minor: int


@dataclass(frozen=True)
class Plan:
    start: date  # first day of the first month with activity
    anchor: date  # last day with activity
    transactions: tuple[PlannedTx, ...]
    transfers: tuple[PlannedTransfer, ...]


def add_months(d: date, n: int) -> date:
    """First day of the month n months from d."""
    y, m = divmod(d.month - 1 + n, 12)
    return date(d.year + y, m + 1, 1)


def _on(month: date, day: int) -> date:
    return month.replace(day=min(day, calendar.monthrange(month.year, month.month)[1]))


def build_plan(anchor: date, seed: int = RNG_SEED) -> Plan:
    """Pure: same (anchor, seed) → same plan."""
    rng = random.Random(seed)
    first = add_months(anchor, -(MONTHS - 1))
    rows: list[PlannedTx] = []
    transfers: list[PlannedTransfer] = []

    def move(src: str, dst: str, d: date, desc: str, amount: int) -> None:
        if d <= anchor:
            transfers.append(PlannedTransfer(src, dst, d, desc, amount))

    def add(
        account: str, d: date, desc: str, amount: int, typ: TransactionType, category: str | None
    ) -> None:
        if d <= anchor:
            rows.append(PlannedTx(account, d, desc, amount, typ, category))

    for i in range(MONTHS):
        month = add_months(first, i)
        salary = 3_800_000 if i < 12 else 4_200_000
        add("hsbc", _on(month, 25), "Salary", salary, CREDIT, "Salary")
        add("hsbc", _on(month, 1), "Rent - Madinaty", 950_000, DEBIT, "Housing/Rent")
        add(
            "hsbc",
            _on(month, 5),
            "Electricity bill",
            rng.randint(60_000, 140_000),
            DEBIT,
            "Utilities",
        )
        add("hsbc", _on(month, 10), "WE Internet", 45_000, DEBIT, "Telecommunications")
        add("vfcash", _on(month, 14), "Vodafone bill", 35_000, DEBIT, "Telecommunications")
        add("cib_cc", _on(month, 3), "Netflix", 20_000, DEBIT, "Entertainment")
        add("cib_cc", _on(month, 3), "Spotify", 9_000, DEBIT, "Entertainment")
        move("hsbc", "cib_cc", _on(month, 12), "CIB card payment", 1_800_000)
        move("hsbc", "vfcash", _on(month, 2), "Vodafone Cash top-up", 200_000)
        if i % 3 == 2:
            add("usd", _on(month, 28), "Quarterly bonus (USD)", 50_000, CREDIT, "Other Income")
        if rng.random() < 0.4:
            add(
                "hsbc",
                _on(month, rng.randint(6, 27)),
                "Freelance - Upwork payout",
                rng.randint(800_000, 1_500_000),
                CREDIT,
                "Freelance Income",
            )

        for category, merchants, (lo, hi), (amin, amax), weights in SPEND:
            accounts = list(weights)
            for _ in range(rng.randint(lo, hi)):
                account = rng.choices(accounts, weights=[weights[a] for a in accounts])[0]
                day = rng.randint(1, 28)
                amount = rng.randint(amin, amax) // 100 * 100  # whole pounds, mostly
                if rng.random() < UNCATEGORIZED_SHARE:
                    desc = f"POS PURCHASE {rng.randint(1000, 9999)} CAIRO EG"
                    add(account, _on(month, day), desc, amount, DEBIT, None)
                else:
                    add(account, _on(month, day), rng.choice(merchants), amount, DEBIT, category)

    rows.sort(key=lambda t: (t.date, t.account, t.description))
    return Plan(start=first, anchor=anchor, transactions=tuple(rows), transfers=tuple(transfers))


async def ensure_supabase_user(settings: Settings, email: str, password: str) -> uuid.UUID:
    """Create the demo user via the GoTrue admin API, or find it if it already exists."""
    key = settings.SUPABASE_SERVICE_ROLE_KEY
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    async with httpx.AsyncClient(
        base_url=f"{settings.SUPABASE_URL}/auth/v1", headers=headers, timeout=20
    ) as client:
        resp = await client.post(
            "/admin/users", json={"email": email, "password": password, "email_confirm": True}
        )
        if resp.status_code in (200, 201):
            return uuid.UUID(resp.json()["id"])
        if resp.status_code == 422 and "already" in resp.text.lower():
            listing = await client.get("/admin/users", params={"page": 1, "per_page": 1000})
            listing.raise_for_status()
            for user in listing.json()["users"]:
                if user["email"].lower() == email.lower():
                    return uuid.UUID(user["id"])
        resp.raise_for_status()
        raise RuntimeError(f"Unexpected Supabase response: {resp.status_code} {resp.text}")


async def ensure_household(session: AsyncSession, user_id: uuid.UUID) -> uuid.UUID:
    existing = await session.execute(
        select(HouseholdMember.household_id).where(HouseholdMember.user_id == user_id).limit(1)
    )
    household_id = existing.scalar_one_or_none()
    if household_id:
        return household_id
    household = Household(name="Demo Household", base_currency="EGP")
    session.add(household)
    await session.flush()
    session.add(
        HouseholdMember(
            household_id=household.id,
            user_id=user_id,
            role=HouseholdRole.ADMIN,
            display_name="Demo",
        )
    )
    await session.flush()
    return household.id


async def _institution_ids(session: AsyncSession) -> dict[str, int]:
    rows = await session.execute(
        select(FinancialInstitution.slug, FinancialInstitution.id).where(
            FinancialInstitution.is_predefined.is_(True)
        )
    )
    return {slug: iid for slug, iid in rows.all()}


async def _category_ids(session: AsyncSession) -> dict[str, int]:
    rows = await session.execute(
        select(Category.name_en, Category.id).where(Category.household_id.is_(None))
    )
    return {name: cid for name, cid in rows.all()}


async def seed_predefined_categories(session: AsyncSession) -> None:
    # app.seed.seed_categories() is a no-op once *any* predefined row exists, and
    # migration c1b77ba111ff already inserts Transfer/Uncategorized. Insert by name.
    existing = set((await _category_ids(session)).keys())
    for cat in PREDEFINED_CATEGORIES:
        if cat["name_en"] in existing:
            continue
        session.add(
            Category(
                household_id=None,
                name_en=cat["name_en"],
                name_ar=cat["name_ar"],
                type=cat["type"],
                icon=cat["icon"],
                color=cat["color"],
                is_predefined=True,
                sort_order=cat["sort_order"],
            )
        )
    await session.flush()


async def apply_plan(session: AsyncSession, household_id: uuid.UUID, plan: Plan) -> dict[str, int]:
    institutions = await _institution_ids(session)
    categories = await _category_ids(session)
    opened = plan.start.replace(day=1)

    accounts: dict[str, Account] = {}
    for key, fields, slug in ACCOUNTS:
        data = AccountCreate(institution_id=institutions[slug], opened_at=opened, **fields)
        accounts[key] = await create_account(session, household_id, data)

    for tx in plan.transactions:
        await create_transaction(
            session,
            household_id,
            TransactionCreate(
                account_id=accounts[tx.account].id,
                date=tx.date,
                description=tx.description,
                amount_minor=tx.amount_minor,
                type=tx.type,
                category_id=categories[tx.category] if tx.category else None,
            ),
        )

    for tr in plan.transfers:
        await create_transfer(
            session,
            household_id,
            TransferCreate(
                from_account_id=accounts[tr.from_account].id,
                to_account_id=accounts[tr.to_account].id,
                amount_minor=tr.amount_minor,
                date=tr.date,
                description=tr.description,
            ),
        )

    anchor_month = plan.anchor.replace(day=1)

    loan_start = _on(add_months(anchor_month, -14), 10)
    loan = await create_bank_loan(
        session,
        household_id,
        DebtCreate(
            type="bank_loan",
            name="Car loan",
            institution="NBE",
            principal_minor=35_000_000,
            currency="EGP",
            annual_rate_percent=12.675,
            tenure_months=60,
            start_date=loan_start,
            linked_account_id=accounts["hsbc"].id,
        ),
    )
    paid = 0
    for i in range(1, 15):
        pay_date = _on(add_months(loan_start, i), 10)
        if pay_date > plan.anchor:
            break
        await record_payment(
            session, household_id, loan, pay_date, loan.monthly_payment_minor, accounts["hsbc"].id
        )
        paid += 1

    await create_installment(
        session,
        household_id,
        InstallmentCreate(
            type="credit_card",
            name="iPhone 16",
            merchant_name="Tradeline",
            source_account_id=accounts["cib_cc"].id,
            total_amount_minor=6_200_000,
            monthly_amount_minor=516_667,
            total_months=12,
            start_month=add_months(anchor_month, -5),
            currency="EGP",
        ),
    )
    await create_installment(
        session,
        household_id,
        InstallmentCreate(
            type="financing_app",
            name='Samsung 65" TV',
            merchant_name="B.TECH",
            source_account_id=accounts["valu"].id,
            total_amount_minor=2_800_000,
            monthly_amount_minor=116_667,
            total_months=24,
            start_month=add_months(anchor_month, -9),
            currency="EGP",
        ),
    )

    omar = await create_person(
        session,
        household_id,
        PersonCreate(name="Omar Hassan", relationship=PersonRelationship.FRIEND),
    )
    sara = await create_person(
        session,
        household_id,
        PersonCreate(name="Sara Adel", relationship=PersonRelationship.COLLEAGUE),
    )
    await create_p2p_debt(
        session,
        household_id,
        DebtCreate(
            type="personal_lent",
            name="Lent to Omar",
            principal_minor=600_000,
            currency="EGP",
            tenure_months=3,
            start_date=_on(add_months(anchor_month, -2), 15),
            person_id=omar.id,
            repayment_mode="equal_splits",
            split_count=3,
            account_id=accounts["hsbc"].id,
        ),
    )
    await create_p2p_debt(
        session,
        household_id,
        DebtCreate(
            type="personal_borrowed",
            name="Borrowed from Sara",
            principal_minor=250_000,
            currency="EGP",
            tenure_months=1,
            start_date=_on(add_months(anchor_month, -1), 20),
            person_id=sara.id,
            repayment_mode="lump_sum",
            due_date=_on(add_months(anchor_month, 1), 1),
            account_id=accounts["vfcash"].id,
        ),
    )

    return {
        "accounts": len(accounts),
        "transactions": len(plan.transactions),
        "transfers": len(plan.transfers),
        "loan_payments": paid,
        "installments": 2,
        "p2p_debts": 2,
    }


async def main(args: argparse.Namespace) -> None:
    settings = Settings()  # type: ignore[call-arg]
    user_id = args.user_id or await ensure_supabase_user(settings, args.email, args.password)
    plan = build_plan(args.anchor)

    async with async_session_factory() as session:
        async with session.begin():
            household_id = await ensure_household(session, user_id)
            has_accounts = await session.execute(
                select(Account.id).where(Account.household_id == household_id).limit(1)
            )
            if has_accounts.scalar_one_or_none() is not None:
                print(
                    f"Household {household_id} already has data. Reset the database "
                    f"(docker compose -f ../docker-compose.dev.yml down -v) or run "
                    f"scripts.clear_user_data --household-id {household_id} first."
                )
                return
            await seed_predefined_categories(session)
            await seed_institutions(session)
            await seed_system_categories(session)
            counts = await apply_plan(session, household_id, plan)
    await engine.dispose()

    print(f"Seeded household {household_id} for user {user_id}")
    print(f"  anchor {plan.anchor} (from {plan.start}), seed {RNG_SEED}")
    print("  " + ", ".join(f"{k}={v}" for k, v in counts.items()))
    if not args.user_id:
        print(f"Log in with {args.email} / {args.password}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed the deterministic demo household")
    parser.add_argument(
        "--anchor",
        type=date.fromisoformat,
        default=date.today(),
        help="Last day with activity (YYYY-MM-DD). Default: today.",
    )
    parser.add_argument("--email", default=DEMO_EMAIL)
    parser.add_argument("--password", default=DEMO_PASSWORD)
    parser.add_argument(
        "--user-id",
        type=uuid.UUID,
        default=None,
        help="Existing Supabase user id; skips the admin API call.",
    )
    asyncio.run(main(parser.parse_args()))
