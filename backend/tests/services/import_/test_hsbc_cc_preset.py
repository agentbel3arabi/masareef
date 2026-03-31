from unittest.mock import MagicMock, patch

from app.services.import_.presets.hsbc_cc import HsbcCcPreset

preset = HsbcCcPreset()


def _mock_pdf(first_page_text: str):
    page = MagicMock()
    page.extract_text.return_value = first_page_text
    page.extract_words.return_value = []
    mock_pdf = MagicMock()
    mock_pdf.pages = [page]
    mock_pdf.__enter__ = lambda s: s
    mock_pdf.__exit__ = MagicMock(return_value=False)
    return mock_pdf


def test_detect_cashback_variant():
    with patch("app.services.import_.presets.hsbc_cc.pdfplumber") as mock_lib:
        mock_lib.open.return_value = _mock_pdf("HSBC CASHBACK CREDIT CARD STATEMENT")
        assert preset.detect(b"fake_pdf") is True


def test_detect_platinum_variant():
    with patch("app.services.import_.presets.hsbc_cc.pdfplumber") as mock_lib:
        mock_lib.open.return_value = _mock_pdf("HSBC PLATINUM CREDIT CARD")
        assert preset.detect(b"fake_pdf") is True


def test_detect_premier_variant():
    with patch("app.services.import_.presets.hsbc_cc.pdfplumber") as mock_lib:
        mock_lib.open.return_value = _mock_pdf("HSBC PREMIER CREDIT CARD")
        assert preset.detect(b"fake_pdf") is True


def test_no_match_returns_false():
    with patch("app.services.import_.presets.hsbc_cc.pdfplumber") as mock_lib:
        mock_lib.open.return_value = _mock_pdf("BANK MISR STATEMENT")
        assert preset.detect(b"fake_pdf") is False


def test_detect_variant_cashback():
    with patch("app.services.import_.presets.hsbc_cc.pdfplumber") as mock_lib:
        mock_lib.open.return_value = _mock_pdf("CASHBACK REWARDS STATEMENT")
        result = preset.detect_variant(b"fake_pdf")
    assert result == "cashback"


def test_preset_metadata():
    assert preset.preset_id == "hsbc_cc"
    assert "pdf" in preset.formats
    assert preset.name_ar != ""
