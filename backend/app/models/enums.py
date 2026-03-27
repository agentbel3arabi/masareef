import enum


class AccountType(str, enum.Enum):
    BANK_ACCOUNT = "bank_account"
    CREDIT_CARD = "credit_card"
    CASH_WALLET = "cash_wallet"
    DIGITAL_WALLET = "digital_wallet"
    FINANCING_APP = "financing_app"


class TransactionType(str, enum.Enum):
    DEBIT = "debit"
    CREDIT = "credit"


class CategoryType(str, enum.Enum):
    EXPENSE = "expense"
    INCOME = "income"
    SPECIAL = "special"


class HouseholdRole(str, enum.Enum):
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"
    CHILD = "child"
