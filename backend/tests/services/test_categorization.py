"""Unit tests for rule engine — mocked DB, no actual Postgres connection."""

import uuid
from unittest.mock import AsyncMock, MagicMock, call

import pytest

from app.ai.rule_engine import apply_rule_engine, load_active_rules, upsert_rule
from app.models.categorization_rule import CategorizationRule


def _make_rule(
    *,
    rule_id: int = 1,
    pattern: str = "CARREFOUR",
    match_type: str = "contains",
    category_id: int = 5,
    confidence: float = 1.0,
    hit_count: int = 0,
    is_active: bool = True,
    household_id: uuid.UUID | None = None,
) -> MagicMock:
    rule = MagicMock(spec=CategorizationRule)
    rule.id = rule_id
    rule.pattern = pattern
    rule.match_type = match_type
    rule.category_id = category_id
    rule.confidence = confidence
    rule.hit_count = hit_count
    rule.is_active = is_active
    rule.household_id = household_id or uuid.uuid4()
    return rule


# ---------------------------------------------------------------------------
# apply_rule_engine
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_rule_engine_contains_match():
    """apply_rule_engine returns (category_id, confidence) on case-insensitive match."""
    rule = _make_rule(pattern="CARREFOUR", category_id=5, confidence=0.95)
    household_id = uuid.uuid4()

    session = AsyncMock()
    # load_active_rules calls session.execute once; apply_rule_engine calls it again for UPDATE
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = [rule]

    result_mock = MagicMock()
    result_mock.scalars.return_value = scalars_mock

    session.execute.return_value = result_mock

    cat_id, confidence = await apply_rule_engine(session, household_id, "CARREFOUR CITY STARS")

    assert cat_id == 5
    assert confidence == 0.95


@pytest.mark.asyncio
async def test_rule_engine_no_match():
    """apply_rule_engine returns (None, None) when no rule matches."""
    household_id = uuid.uuid4()

    session = AsyncMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = []

    result_mock = MagicMock()
    result_mock.scalars.return_value = scalars_mock

    session.execute.return_value = result_mock

    cat_id, confidence = await apply_rule_engine(session, household_id, "UNKNOWN MERCHANT")

    assert cat_id is None
    assert confidence is None


@pytest.mark.asyncio
async def test_rule_hit_count_increments():
    """apply_rule_engine calls UPDATE to increment hit_count on match."""
    rule = _make_rule(pattern="starbucks", category_id=3, confidence=1.0)
    household_id = uuid.uuid4()

    session = AsyncMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = [rule]

    result_mock = MagicMock()
    result_mock.scalars.return_value = scalars_mock

    session.execute.return_value = result_mock

    await apply_rule_engine(session, household_id, "STARBUCKS CAIRO")

    # session.execute must be called at least twice:
    # once for SELECT (load rules), once for UPDATE (increment hit_count)
    assert session.execute.call_count >= 2


@pytest.mark.asyncio
async def test_rule_engine_case_insensitive():
    """apply_rule_engine matches case-insensitively (rule.pattern.lower() in description.lower())."""
    rule = _make_rule(pattern="carrefour", category_id=5, confidence=1.0)
    household_id = uuid.uuid4()

    session = AsyncMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = [rule]

    result_mock = MagicMock()
    result_mock.scalars.return_value = scalars_mock

    session.execute.return_value = result_mock

    cat_id, _ = await apply_rule_engine(session, household_id, "CARREFOUR CITY STARS")

    assert cat_id == 5


# ---------------------------------------------------------------------------
# upsert_rule
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_upsert_rule_creates_new():
    """upsert_rule calls session.add when no existing rule found."""
    household_id = uuid.uuid4()

    session = AsyncMock()
    scalar_mock = MagicMock()
    scalar_mock.scalar_one_or_none.return_value = None

    session.execute.return_value = scalar_mock

    result = await upsert_rule(session, household_id, "UBER", "contains", 7, 1.0)

    session.add.assert_called_once()
    added = session.add.call_args[0][0]
    assert added.pattern == "UBER"
    assert added.category_id == 7


@pytest.mark.asyncio
async def test_upsert_rule_updates_existing():
    """upsert_rule updates category_id on existing rule without calling session.add."""
    household_id = uuid.uuid4()
    existing = _make_rule(pattern="UBER", category_id=7, confidence=0.9)

    session = AsyncMock()
    scalar_mock = MagicMock()
    scalar_mock.scalar_one_or_none.return_value = existing

    session.execute.return_value = scalar_mock

    result = await upsert_rule(session, household_id, "UBER", "contains", 10, 1.0)

    session.add.assert_not_called()
    assert result.category_id == 10
    assert result.confidence == 1.0


@pytest.mark.asyncio
async def test_correction_creates_rule_with_full_confidence():
    """upsert_rule with confidence=1.0 (D-04: user correction always gets full confidence)."""
    household_id = uuid.uuid4()

    session = AsyncMock()
    scalar_mock = MagicMock()
    scalar_mock.scalar_one_or_none.return_value = None

    session.execute.return_value = scalar_mock

    result = await upsert_rule(session, household_id, "CARREFOUR", "contains", 5, confidence=1.0)

    added = session.add.call_args[0][0]
    assert added.confidence == 1.0
