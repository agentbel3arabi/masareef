from sqlalchemy import inspect

from app.models.household import Household, HouseholdMember


def test_household_table_name():
    assert Household.__tablename__ == "households"


def test_household_has_required_columns():
    mapper = inspect(Household)
    column_names = {c.key for c in mapper.column_attrs}
    assert "id" in column_names
    assert "name" in column_names
    assert "base_currency" in column_names
    assert "created_at" in column_names


def test_household_base_currency_default():
    col = Household.__table__.c.base_currency
    assert col.server_default.arg == "EGP"


def test_household_member_table_name():
    assert HouseholdMember.__tablename__ == "household_members"


def test_household_member_has_required_columns():
    mapper = inspect(HouseholdMember)
    column_names = {c.key for c in mapper.column_attrs}
    required = {"id", "household_id", "user_id", "role", "display_name", "joined_at"}
    assert required.issubset(column_names)
