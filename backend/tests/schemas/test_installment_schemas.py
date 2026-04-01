import pytest
from pydantic import ValidationError

from app.schemas.installment import InstallmentCreate


def _valid_cc_payload(**overrides):
    payload = {
        "type": "credit_card",
        "name": "iPhone 16 Pro",
        "merchant_name": "B.TECH",
        "source_account_id": 1,
        "total_amount_minor": 5400000,
        "monthly_amount_minor": 450000,
        "total_months": 12,
        "start_month": "2024-06-01",
        "currency": "EGP",
    }
    payload.update(overrides)
    return payload


def test_valid_cc_installment():
    schema = InstallmentCreate(**_valid_cc_payload())
    assert schema.type == "credit_card"
    assert schema.total_amount_minor == 5400000


def test_valid_store_installment():
    schema = InstallmentCreate(
        type="store",
        name="Washing Machine",
        merchant_name="B.TECH",
        total_amount_minor=1200000,
        monthly_amount_minor=100000,
        total_months=12,
        start_month="2024-06-01",
        currency="EGP",
    )
    assert schema.type == "store"
    assert schema.source_account_id is None


def test_valid_financing_app_installment():
    schema = InstallmentCreate(
        type="financing_app",
        name="Air Conditioner",
        merchant_name="Samsung Store",
        source_account_id=5,
        total_amount_minor=1500000,
        monthly_amount_minor=125000,
        total_months=12,
        start_month="2024-06-01",
        currency="EGP",
    )
    assert schema.type == "financing_app"


def test_total_amount_must_be_positive():
    with pytest.raises(ValidationError, match="greater_than"):
        InstallmentCreate(**_valid_cc_payload(total_amount_minor=0))


def test_invalid_type_rejected():
    with pytest.raises(ValidationError):
        InstallmentCreate(**_valid_cc_payload(type="invalid"))
