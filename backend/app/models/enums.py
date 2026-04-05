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


class DebtType(enum.StrEnum):
    BANK_LOAN = "bank_loan"
    PERSONAL_LENT = "personal_lent"
    PERSONAL_BORROWED = "personal_borrowed"


class DebtStatus(enum.StrEnum):
    ACTIVE = "active"
    PAID_OFF = "paid_off"


class InstallmentType(enum.StrEnum):
    CREDIT_CARD = "credit_card"
    STORE = "store"
    FINANCING_APP = "financing_app"


class LifecycleStatus(enum.StrEnum):
    ACTIVE = "active"
    COMPLETED = "completed"


class PersonRelationship(enum.StrEnum):
    FAMILY = "family"
    FRIEND = "friend"
    COLLEAGUE = "colleague"
    BUSINESS = "business"
    OTHER = "other"


class RepaymentMode(enum.StrEnum):
    LUMP_SUM = "lump_sum"
    EQUAL_SPLITS = "equal_splits"
    CUSTOM_SPLITS = "custom_splits"


class PaymentFrequency(enum.StrEnum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    SEMI_ANNUAL = "semi_annual"
    ANNUAL = "annual"


class InstitutionType(enum.StrEnum):
    BANK = "bank"
    BNPL = "bnpl"
    DIGITAL_WALLET_PROVIDER = "digital_wallet_provider"
