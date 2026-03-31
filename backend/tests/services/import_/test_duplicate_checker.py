"""Tests for duplicate transaction detection in import pipeline."""

import datetime

from app.schemas.import_ import ParsedRow
from app.services.import_.duplicate_checker import _make_hash, is_duplicate, mark_duplicates


def test_make_hash_same_inputs_same_hash():
    """Same inputs should produce same hash."""
    h1 = _make_hash(1, datetime.date(2026, 3, 15), -125000, "CARREFOUR")
    h2 = _make_hash(1, datetime.date(2026, 3, 15), -125000, "CARREFOUR")
    assert h1 == h2


def test_make_hash_different_account_different_hash():
    """Different account_id should produce different hash."""
    h1 = _make_hash(1, datetime.date(2026, 3, 15), -125000, "CARREFOUR")
    h2 = _make_hash(2, datetime.date(2026, 3, 15), -125000, "CARREFOUR")
    assert h1 != h2


def test_is_duplicate_match():
    """Matching transaction should be detected as duplicate."""
    existing = {_make_hash(1, datetime.date(2026, 3, 15), -125000, "CARREFOUR")}
    assert is_duplicate(1, datetime.date(2026, 3, 15), -125000, "CARREFOUR", existing) is True


def test_is_duplicate_no_match():
    """Non-matching transaction should not be detected as duplicate."""
    existing = {_make_hash(1, datetime.date(2026, 3, 15), -125000, "CARREFOUR")}
    assert is_duplicate(1, datetime.date(2026, 3, 16), -125000, "CARREFOUR", existing) is False


def test_mark_duplicates_sets_status():
    """mark_duplicates should mark matching rows as duplicate and deselect them."""
    existing = {_make_hash(1, datetime.date(2026, 3, 15), -125000, "CARREFOUR")}
    rows = [
        ParsedRow(
            row_index=0,
            date=datetime.date(2026, 3, 15),
            amount_minor=-125000,
            description="CARREFOUR",
            status="valid",
        ),
        ParsedRow(
            row_index=1,
            date=datetime.date(2026, 3, 16),
            amount_minor=-50000,
            description="ATM",
            status="valid",
        ),
    ]
    result = mark_duplicates(rows, 1, existing)
    assert result[0].status == "duplicate"
    assert result[0].selected is False
    assert result[1].status == "valid"


def test_mark_duplicates_skips_error_rows():
    """mark_duplicates should skip rows that already have error status."""
    existing = {_make_hash(1, datetime.date(2026, 3, 15), -125000, "CARREFOUR")}
    rows = [
        ParsedRow(
            row_index=0,
            date=datetime.date(2026, 3, 15),
            amount_minor=-125000,
            description="CARREFOUR",
            status="error",
        ),  # already error — skip dedup
    ]
    result = mark_duplicates(rows, 1, existing)
    assert result[0].status == "error"  # unchanged
