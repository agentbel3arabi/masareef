import enum

from app.models.enums import (
    AccountType,
    CategoryType,
    DebtStatus,
    DebtType,
    HouseholdRole,
    InstallmentType,
    LifecycleStatus,
    PersonRelationship,
    RepaymentMode,
    TransactionType,
)


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


def test_debt_type_values():
    assert DebtType.BANK_LOAN == "bank_loan"
    assert DebtType.PERSONAL_LENT == "personal_lent"
    assert DebtType.PERSONAL_BORROWED == "personal_borrowed"
    assert len(DebtType) == 3


def test_debt_status_values():
    assert DebtStatus.ACTIVE == "active"
    assert DebtStatus.PAID_OFF == "paid_off"
    assert len(DebtStatus) == 2


def test_installment_type_values():
    assert InstallmentType.CREDIT_CARD == "credit_card"
    assert InstallmentType.STORE == "store"
    assert InstallmentType.FINANCING_APP == "financing_app"
    assert len(InstallmentType) == 3


def test_lifecycle_status_values():
    assert LifecycleStatus.ACTIVE == "active"
    assert LifecycleStatus.COMPLETED == "completed"
    assert len(LifecycleStatus) == 2


def test_person_relationship_values():
    assert PersonRelationship.FAMILY == "family"
    assert PersonRelationship.FRIEND == "friend"
    assert PersonRelationship.COLLEAGUE == "colleague"
    assert PersonRelationship.BUSINESS == "business"
    assert PersonRelationship.OTHER == "other"
    assert len(PersonRelationship) == 5


def test_repayment_mode_values():
    assert RepaymentMode.LUMP_SUM == "lump_sum"
    assert RepaymentMode.EQUAL_SPLITS == "equal_splits"
    assert RepaymentMode.CUSTOM_SPLITS == "custom_splits"
    assert len(RepaymentMode) == 3
