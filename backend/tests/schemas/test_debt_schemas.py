from datetime import date

import pytest
from pydantic import ValidationError

from app.schemas.debt import DebtCreate, P2PDebtSplitResponse, PaymentCreate, SplitInput


class TestDebtCreateP2P:
    def test_personal_lent_lump_sum_accepted(self):
        data = DebtCreate(
            type="personal_lent",
            name="Loan to Ahmed",
            principal_minor=500000,
            currency="EGP",
            annual_rate_percent=0,
            tenure_months=1,
            start_date=date(2024, 6, 1),
            person_id=1,
            repayment_mode="lump_sum",
            due_date=date(2024, 7, 1),
        )
        assert data.type == "personal_lent"
        assert data.repayment_mode == "lump_sum"

    def test_personal_borrowed_equal_splits_accepted(self):
        data = DebtCreate(
            type="personal_borrowed",
            name="Borrowed from Sara",
            principal_minor=1200000,
            currency="EGP",
            annual_rate_percent=0,
            tenure_months=6,
            start_date=date(2024, 6, 1),
            person_id=2,
            repayment_mode="equal_splits",
            split_count=6,
        )
        assert data.type == "personal_borrowed"
        assert data.split_count == 6

    def test_custom_splits_with_split_input(self):
        splits = [
            SplitInput(amount_minor=300000, due_date=date(2024, 7, 1)),
            SplitInput(amount_minor=200000, due_date=date(2024, 8, 1)),
        ]
        data = DebtCreate(
            type="personal_lent",
            name="Custom split debt",
            principal_minor=500000,
            currency="EGP",
            annual_rate_percent=0,
            tenure_months=2,
            start_date=date(2024, 6, 1),
            person_id=1,
            repayment_mode="custom_splits",
            splits=splits,
        )
        assert data.splits is not None and len(data.splits) == 2
        assert data.splits[0].amount_minor == 300000

    def test_bank_loan_type_still_accepted(self):
        data = DebtCreate(
            type="bank_loan",
            name="Car Loan",
            principal_minor=5000000,
            currency="EGP",
            annual_rate_percent=14.5,
            tenure_months=60,
            start_date=date(2024, 1, 1),
        )
        assert data.type == "bank_loan"

    def test_p2p_split_response_schema(self):
        resp = P2PDebtSplitResponse(
            id=1,
            debt_id=10,
            amount_minor=100000,
            due_date=date(2024, 7, 1),
            paid=False,
            payment_id=None,
            status="upcoming",
        )
        assert resp.status == "upcoming"


class TestPaymentCreateSchema:
    def test_payment_create_requires_account_id(self):
        """PaymentCreate must require account_id."""
        with pytest.raises(ValidationError, match="account_id"):
            PaymentCreate(date="2026-04-01", amount_minor=100000)

    def test_payment_create_with_account_id(self):
        p = PaymentCreate(date="2026-04-01", amount_minor=100000, account_id=1)
        assert p.account_id == 1
        assert p.link_existing_transaction_id is None

    def test_payment_create_with_link_existing(self):
        p = PaymentCreate(
            date="2026-04-01",
            amount_minor=100000,
            account_id=1,
            link_existing_transaction_id=42,
        )
        assert p.link_existing_transaction_id == 42


class TestDebtCreateAccountId:
    def test_debt_create_p2p_has_account_id(self):
        d = DebtCreate(
            type="personal_lent",
            name="Lent to Ahmed",
            principal_minor=500000,
            currency="EGP",
            tenure_months=1,
            start_date="2026-04-01",
            person_id=1,
            repayment_mode="lump_sum",
            due_date="2026-05-01",
            account_id=5,
        )
        assert d.account_id == 5

    def test_debt_create_account_id_optional(self):
        d = DebtCreate(
            type="bank_loan",
            name="Car Loan",
            principal_minor=5000000,
            currency="EGP",
            annual_rate_percent=14.5,
            tenure_months=60,
            start_date="2026-01-01",
        )
        assert d.account_id is None
