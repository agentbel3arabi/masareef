"""Preset registry. Presets are tried in order — first match wins."""

import logging

from app.services.import_.presets.base import BankPreset
from app.services.import_.presets.hsbc_cc import HsbcCcPreset

logger = logging.getLogger(__name__)

_PRESETS: list[BankPreset] = [
    HsbcCcPreset(),
]


def detect_preset(content: bytes, headers: list[str] | None = None) -> BankPreset | None:
    """Return the first preset that matches the file, or None."""
    for preset in _PRESETS:
        try:
            if preset.detect(content, headers):
                return preset
        except Exception as exc:
            logger.warning("Preset %s detection failed: %s", preset.preset_id, exc)
            continue
    return None


def list_presets() -> list[BankPreset]:
    """Return all registered presets."""
    return list(_PRESETS)
