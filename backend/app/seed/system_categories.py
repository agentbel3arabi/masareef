"""Seed data for system-only categories."""

SYSTEM_CATEGORIES = [
    {
        "name_en": "Opening Balance",
        "name_ar": "رصيد افتتاحي",
        "type": "special",
        "icon": "landmark",
        "color": "#94A3B8",
        "is_predefined": True,
        "is_system": True,
    },
    {
        "name_en": "Reconciliation Adjustment",
        "name_ar": "تسوية رصيد",
        "type": "special",
        "icon": "scale",
        "color": "#94A3B8",
        "is_predefined": True,
        "is_system": True,
    },
]

# Existing predefined categories that should be marked as system
EXISTING_SYSTEM_CATEGORY_NAMES = ["Transfer", "Uncategorized"]
