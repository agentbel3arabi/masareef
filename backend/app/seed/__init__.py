"""Seed data: predefined categories, supported currencies, sample exchange rates."""

CURRENCIES: dict[str, dict] = {
    "EGP": {"name": "Egyptian Pound", "name_ar": "جنيه مصري", "exponent": 2, "symbol": "EGP"},
    "USD": {"name": "US Dollar", "name_ar": "دولار أمريكي", "exponent": 2, "symbol": "$"},
    "EUR": {"name": "Euro", "name_ar": "يورو", "exponent": 2, "symbol": "€"},
    "GBP": {"name": "British Pound", "name_ar": "جنيه إسترليني", "exponent": 2, "symbol": "£"},
    "SAR": {"name": "Saudi Riyal", "name_ar": "ريال سعودي", "exponent": 2, "symbol": "SAR"},
    "AED": {"name": "UAE Dirham", "name_ar": "درهم إماراتي", "exponent": 2, "symbol": "AED"},
    "KWD": {"name": "Kuwaiti Dinar", "name_ar": "دينار كويتي", "exponent": 3, "symbol": "KWD"},
}

PREDEFINED_CATEGORIES: list[dict] = [
    # Expense (12)
    {
        "name_en": "Food & Dining",
        "name_ar": "طعام ومطاعم",
        "type": "expense",
        "icon": "utensils",
        "color": "#EF4444",
        "sort_order": 1,
    },
    {
        "name_en": "Groceries",
        "name_ar": "بقالة",
        "type": "expense",
        "icon": "shopping-cart",
        "color": "#F97316",
        "sort_order": 2,
    },
    {
        "name_en": "Transportation",
        "name_ar": "مواصلات",
        "type": "expense",
        "icon": "car",
        "color": "#EAB308",
        "sort_order": 3,
    },
    {
        "name_en": "Utilities",
        "name_ar": "مرافق",
        "type": "expense",
        "icon": "zap",
        "color": "#84CC16",
        "sort_order": 4,
    },
    {
        "name_en": "Housing/Rent",
        "name_ar": "سكن/إيجار",
        "type": "expense",
        "icon": "home",
        "color": "#22C55E",
        "sort_order": 5,
    },
    {
        "name_en": "Healthcare",
        "name_ar": "رعاية صحية",
        "type": "expense",
        "icon": "heart-pulse",
        "color": "#14B8A6",
        "sort_order": 6,
    },
    {
        "name_en": "Shopping",
        "name_ar": "تسوق",
        "type": "expense",
        "icon": "shopping-bag",
        "color": "#06B6D4",
        "sort_order": 7,
    },
    {
        "name_en": "Education",
        "name_ar": "تعليم",
        "type": "expense",
        "icon": "graduation-cap",
        "color": "#3B82F6",
        "sort_order": 8,
    },
    {
        "name_en": "Entertainment",
        "name_ar": "ترفيه",
        "type": "expense",
        "icon": "film",
        "color": "#8B5CF6",
        "sort_order": 9,
    },
    {
        "name_en": "Telecommunications",
        "name_ar": "اتصالات",
        "type": "expense",
        "icon": "phone",
        "color": "#A855F7",
        "sort_order": 10,
    },
    {
        "name_en": "Fuel",
        "name_ar": "وقود",
        "type": "expense",
        "icon": "fuel",
        "color": "#EC4899",
        "sort_order": 11,
    },
    {
        "name_en": "Government/Fees",
        "name_ar": "حكومة/رسوم",
        "type": "expense",
        "icon": "landmark",
        "color": "#F43F5E",
        "sort_order": 12,
    },
    # Income (3)
    {
        "name_en": "Salary",
        "name_ar": "راتب",
        "type": "income",
        "icon": "banknote",
        "color": "#22C55E",
        "sort_order": 13,
    },
    {
        "name_en": "Freelance Income",
        "name_ar": "دخل حر",
        "type": "income",
        "icon": "laptop",
        "color": "#10B981",
        "sort_order": 14,
    },
    {
        "name_en": "Other Income",
        "name_ar": "دخل آخر",
        "type": "income",
        "icon": "plus-circle",
        "color": "#34D399",
        "sort_order": 15,
    },
    # Special (3)
    {
        "name_en": "Transfer",
        "name_ar": "تحويل",
        "type": "special",
        "icon": "arrow-left-right",
        "color": "#94A3B8",
        "sort_order": 16,
    },
    {
        "name_en": "Uncategorized",
        "name_ar": "غير مصنف",
        "type": "special",
        "icon": "help-circle",
        "color": "#94A3B8",
        "sort_order": 17,
    },
    {
        "name_en": "Savings",
        "name_ar": "ادخار",
        "type": "special",
        "icon": "piggy-bank",
        "color": "#22C55E",
        "sort_order": 18,
    },
    # Debt-related (2)
    {
        "name_en": "Debt Payment",
        "name_ar": "سداد دين",
        "type": "expense",
        "icon": "banknote",
        "color": "#dc2626",
        "sort_order": 130,
    },
    {
        "name_en": "Debt Collection",
        "name_ar": "تحصيل دين",
        "type": "income",
        "icon": "hand-coins",
        "color": "#16a34a",
        "sort_order": 131,
    },
]

SAMPLE_EXCHANGE_RATES: list[dict] = [
    {"from_currency": "USD", "to_currency": "EGP", "rate_scaled": 500000},
    {"from_currency": "USD", "to_currency": "SAR", "rate_scaled": 37510},
    {"from_currency": "USD", "to_currency": "AED", "rate_scaled": 36725},
    {"from_currency": "USD", "to_currency": "KWD", "rate_scaled": 3082},
    {"from_currency": "USD", "to_currency": "EUR", "rate_scaled": 9200},
    {"from_currency": "USD", "to_currency": "GBP", "rate_scaled": 7890},
]


async def seed_categories(session) -> int:
    """Insert predefined categories if they don't exist. Returns count of inserted rows."""
    from sqlalchemy import select

    from app.models.category import Category

    existing = await session.execute(select(Category).where(Category.is_predefined.is_(True)))
    if existing.scalars().first() is not None:
        return 0

    count = 0
    for cat_data in PREDEFINED_CATEGORIES:
        category = Category(
            household_id=None,
            name_en=cat_data["name_en"],
            name_ar=cat_data["name_ar"],
            type=cat_data["type"],
            icon=cat_data["icon"],
            color=cat_data["color"],
            is_predefined=True,
            sort_order=cat_data["sort_order"],
        )
        session.add(category)
        count += 1

    await session.flush()
    return count
