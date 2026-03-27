from sqlalchemy import inspect

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


# Create a test model that uses both mixins
class _TestModel(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "test_model"

    from sqlalchemy import Integer
    from sqlalchemy.orm import Mapped, mapped_column

    id: Mapped[int] = mapped_column(Integer, primary_key=True)


def test_timestamp_mixin_has_created_at_and_updated_at():
    mapper = inspect(_TestModel)
    column_names = [c.key for c in mapper.column_attrs]
    assert "created_at" in column_names
    assert "updated_at" in column_names


def test_soft_delete_mixin_has_is_active():
    mapper = inspect(_TestModel)
    column_names = [c.key for c in mapper.column_attrs]
    assert "is_active" in column_names


def test_soft_delete_default_is_true():
    col = _TestModel.__table__.c.is_active
    assert col.default.arg is True


def test_timestamp_columns_are_not_nullable():
    col_created = _TestModel.__table__.c.created_at
    col_updated = _TestModel.__table__.c.updated_at
    assert col_created.nullable is False
    assert col_updated.nullable is False
