import uuid

from app.models.import_template import AccountImportTemplate, ImportTemplate


def test_import_template_fields():
    t = ImportTemplate(
        household_id=uuid.uuid4(),
        name="CIB CSV",
        format="csv",
        columns={"date": "Date", "debit": "Withdrawal"},
        date_format="DD/MM/YYYY",
        encoding="utf-8",
        skip_rows=0,
    )
    assert t.name == "CIB CSV"
    assert t.format == "csv"
    assert t.columns["date"] == "Date"


def test_account_import_template_fields():
    link = AccountImportTemplate(account_id=1, template_id=2)
    assert link.account_id == 1
    assert link.template_id == 2
