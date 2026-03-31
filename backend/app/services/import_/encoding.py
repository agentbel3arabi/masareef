"""Encoding detection for bank statement files (handles Windows-1256 Arabic CSVs)."""

import chardet


def detect_encoding(raw_bytes: bytes) -> str:
    """Return best-guess encoding. Normalises Windows-1256 variants. Falls back to utf-8."""
    result = chardet.detect(raw_bytes)
    encoding = (result.get("encoding") or "utf-8").lower()
    # ASCII is a subset of UTF-8
    if encoding == "ascii":
        return "utf-8"
    if encoding in ("windows-1256", "cp1256"):
        return "windows-1256"
    return encoding


def decode_bytes(raw_bytes: bytes) -> tuple[str, str]:
    """Decode raw bytes. Returns (text, encoding_used). Never raises."""
    encoding = detect_encoding(raw_bytes)
    try:
        return raw_bytes.decode(encoding), encoding
    except (UnicodeDecodeError, LookupError):
        return raw_bytes.decode("utf-8", errors="replace"), "utf-8"
