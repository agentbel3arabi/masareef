import io
from unittest.mock import MagicMock, patch

import pytest

from app.services.import_.pdf_parser import is_scanned


def _make_mock_pdf(pages_text: list[str]):
    """Create a mock pdfplumber PDF object with specified text per page."""
    mock_pages = []
    for text in pages_text:
        page = MagicMock()
        page.extract_text.return_value = text
        page.extract_words.return_value = []
        mock_pages.append(page)
    mock_pdf = MagicMock()
    mock_pdf.pages = mock_pages
    mock_pdf.__enter__ = lambda s: s
    mock_pdf.__exit__ = MagicMock(return_value=False)
    return mock_pdf


def test_text_pdf_not_scanned():
    rich_text = "Transaction Date Description Debit Credit Balance\n" * 10
    mock_pdf = _make_mock_pdf([rich_text])
    with patch("app.services.import_.pdf_parser.pdfplumber") as mock_lib:
        mock_lib.open.return_value = mock_pdf
        result = is_scanned(b"fake_pdf")
    assert result is False


def test_scanned_pdf_detected():
    # Less than 50 chars per page on average
    mock_pdf = _make_mock_pdf(["", "   ", ""])
    with patch("app.services.import_.pdf_parser.pdfplumber") as mock_lib:
        mock_lib.open.return_value = mock_pdf
        result = is_scanned(b"fake_pdf")
    assert result is True


def test_empty_pdf_is_scanned():
    mock_pdf = _make_mock_pdf([])
    with patch("app.services.import_.pdf_parser.pdfplumber") as mock_lib:
        mock_lib.open.return_value = mock_pdf
        result = is_scanned(b"fake_pdf")
    assert result is True
