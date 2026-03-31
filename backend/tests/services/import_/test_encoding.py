import pytest
from app.services.import_.encoding import decode_bytes, detect_encoding


def test_detect_utf8_returns_utf8():
    raw = "CARREFOUR CITY STARS 1,250.00".encode("utf-8")
    enc = detect_encoding(raw)
    assert "utf" in enc.lower()


def test_detect_windows1256():
    raw = "سوبر ماركت".encode("windows-1256")
    enc = detect_encoding(raw)
    assert enc == "windows-1256"


def test_decode_utf8_round_trip():
    original = "CARREFOUR CITY STARS 1,250.00"
    raw = original.encode("utf-8")
    text, enc = decode_bytes(raw)
    assert text == original


def test_decode_arabic_windows1256():
    original = "سوبر ماركت"
    raw = original.encode("windows-1256")
    text, enc = decode_bytes(raw)
    assert "سوبر" in text
    assert enc == "windows-1256"


def test_decode_fallback_on_undecodable():
    # Bytes that cannot be decoded as detected encoding → fallback
    raw = b"\xff\xfe\xfd"
    text, enc = decode_bytes(raw)
    assert isinstance(text, str)  # must not raise
