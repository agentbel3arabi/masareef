import enum


class AccountType(enum.StrEnum):
    BANK_ACCOUNT = "bank_account"
    CREDIT_CARD = "credit_card"
    CASH_WALLET = "cash_wallet"
    DIGITAL_WALLET = "digital_wallet"
    FINANCING_APP = "financing_app"


class TransactionType(enum.StrEnum):
    DEBIT = "debit"
    CREDIT = "credit"


class CategoryType(enum.StrEnum):
    EXPENSE = "expense"
    INCOME = "income"
    SPECIAL = "special"


class HouseholdRole(enum.StrEnum):
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"
    CHILD = "child"
