from datetime import date

from app.schemas.debt import DebtCreate, P2PDebtSplitResponse, SplitInput


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
