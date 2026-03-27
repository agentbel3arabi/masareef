import enum

from app.models.enums import AccountType, CategoryType, HouseholdRole, TransactionType


def test_account_type_has_all_variants():
    expected = {"bank_account", "credit_card", "cash_wallet", "digital_wallet", "financing_app"}
    assert {e.value for e in AccountType} == expected


def test_transaction_type_has_debit_and_credit():
    assert TransactionType.DEBIT.value == "debit"
    assert TransactionType.CREDIT.value == "credit"


def test_category_type_has_all_variants():
    expected = {"expense", "income", "special"}
    assert {e.value for e in CategoryType} == expected


def test_household_role_has_all_variants():
    expected = {"admin", "member", "viewer", "child"}
    assert {e.value for e in HouseholdRole} == expected


def test_enums_are_string_enums():
    for enum_class in (AccountType, TransactionType, CategoryType, HouseholdRole):
        assert issubclass(enum_class, str)
        assert issubclass(enum_class, enum.Enum)
