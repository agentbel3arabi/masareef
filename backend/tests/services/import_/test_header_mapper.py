from app.services.import_.header_mapper import get_auto_suggest


def test_exact_match_date():
    result = get_auto_suggest(["Date", "Description", "Debit", "Credit", "Balance"])
    assert result.get("date") == "Date"


def test_exact_match_all_fields():
    headers = ["Date", "Description", "Debit", "Credit", "Balance"]
    result = get_auto_suggest(headers)
    assert result["date"] == "Date"
    assert result["description"] == "Description"
    assert result["debit"] == "Debit"
    assert result["credit"] == "Credit"
    assert result["balance"] == "Balance"


def test_fuzzy_match_narration():
    # "Narration" should map to "description"
    result = get_auto_suggest(["Transaction Date", "Narration", "Withdrawal Amt", "Deposit Amt"])
    assert result.get("description") == "Narration"


def test_fuzzy_match_withdrawal():
    result = get_auto_suggest(["Date", "Details", "Withdrawal", "Deposit"])
    assert result.get("debit") == "Withdrawal"
    assert result.get("credit") == "Deposit"


def test_low_confidence_omitted():
    # "Ref" has no meaningful match to any field → omitted
    result = get_auto_suggest(["Ref", "XYZ_Col", "Foo"])
    assert len(result) == 0


def test_arabic_header_date():
    result = get_auto_suggest(["تاريخ", "البيان", "سحب", "إيداع"])
    assert result.get("date") == "تاريخ"
