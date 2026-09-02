from datetime import date

from scripts.seed_demo import MONTHS, RNG_SEED, add_months, build_plan

ANCHOR = date(2026, 9, 1)


def test_same_anchor_and_seed_give_identical_plan():
    assert build_plan(ANCHOR, RNG_SEED) == build_plan(ANCHOR, RNG_SEED)


def test_different_seed_gives_different_plan():
    assert build_plan(ANCHOR, RNG_SEED) != build_plan(ANCHOR, RNG_SEED + 1)


def test_plan_covers_eighteen_months_up_to_anchor():
    plan = build_plan(ANCHOR)
    dates = [t.date for t in plan.transactions]
    assert plan.start == add_months(ANCHOR, -(MONTHS - 1)) == date(2025, 4, 1)
    assert min(dates) == plan.start
    assert max(dates) <= ANCHOR
    assert 600 <= len(plan.transactions) <= 1300
    assert 2 * (MONTHS - 1) <= len(plan.transfers) <= 2 * MONTHS


def test_amounts_are_positive_integers_and_some_rows_are_uncategorized():
    plan = build_plan(ANCHOR)
    assert all(isinstance(t.amount_minor, int) and t.amount_minor > 0 for t in plan.transactions)
    uncategorized = sum(1 for t in plan.transactions if t.category is None)
    assert 0 < uncategorized < len(plan.transactions) * 0.1
