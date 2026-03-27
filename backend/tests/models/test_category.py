from sqlalchemy import inspect

from app.models.category import Category


def test_category_table_name():
    assert Category.__tablename__ == "categories"


def test_category_has_required_columns():
    mapper = inspect(Category)
    column_names = {c.key for c in mapper.column_attrs}
    required = {
        "id", "household_id", "name_en", "name_ar", "type",
        "icon", "color", "is_predefined", "is_active", "sort_order", "created_at",
    }
    assert required.issubset(column_names)


def test_category_household_id_is_nullable():
    """Predefined categories have household_id = NULL."""
    col = Category.__table__.c.household_id
    assert col.nullable is True


def test_category_is_predefined_default_false():
    col = Category.__table__.c.is_predefined
    assert col.server_default.arg == "false"
