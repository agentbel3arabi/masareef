import pytest
from datetime import date

from app.services.debt import generate_equal_splits, generate_lump_sum_split


class TestGenerateEqualSplits:
    def test_even_division(self):
        """1,200,000 / 6 = 200,000 each."""
        splits = generate_equal_splits(
            principal_minor=1200000,
            split_count=6,
            start_date=date(2024, 6, 1),
        )
        assert len(splits) == 6
        assert all(s["amount_minor"] == 200000 for s in splits)
        assert splits[0]["due_date"] == date(2024, 7, 1)
        assert splits[5]["due_date"] == date(2024, 12, 1)

    def test_remainder_absorbed_by_last_split(self):
        """1,000,000 / 3 = 333,333 + 333,333 + 333,334."""
        splits = generate_equal_splits(
            principal_minor=1000000,
            split_count=3,
            start_date=date(2024, 6, 1),
        )
        assert len(splits) == 3
        total = sum(s["amount_minor"] for s in splits)
        assert total == 1000000
        assert splits[0]["amount_minor"] == 333333
        assert splits[1]["amount_minor"] == 333333
        assert splits[2]["amount_minor"] == 333334

    def test_single_split(self):
        """split_count=1 means single payment."""
        splits = generate_equal_splits(
            principal_minor=500000,
            split_count=1,
            start_date=date(2024, 6, 1),
        )
        assert len(splits) == 1
        assert splits[0]["amount_minor"] == 500000
        assert splits[0]["due_date"] == date(2024, 7, 1)

    def test_dates_are_monthly(self):
        splits = generate_equal_splits(
            principal_minor=400000,
            split_count=4,
            start_date=date(2024, 11, 15),
        )
        assert splits[0]["due_date"] == date(2024, 12, 15)
        assert splits[1]["due_date"] == date(2025, 1, 15)
        assert splits[2]["due_date"] == date(2025, 2, 15)
        assert splits[3]["due_date"] == date(2025, 3, 15)


class TestGenerateLumpSumSplit:
    def test_single_split_at_due_date(self):
        splits = generate_lump_sum_split(
            principal_minor=500000,
            due_date=date(2024, 12, 31),
        )
        assert len(splits) == 1
        assert splits[0]["amount_minor"] == 500000
        assert splits[0]["due_date"] == date(2024, 12, 31)
