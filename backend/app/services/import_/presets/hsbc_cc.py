"""HSBC Credit Card PDF preset — stub for registry import (Task 12 implements fully)."""

from app.services.import_.presets.base import BankPreset


class HsbcCcPreset(BankPreset):
    @property
    def preset_id(self) -> str:
        return "hsbc_cc"

    @property
    def name(self) -> str:
        return "HSBC Credit Card"

    @property
    def name_ar(self) -> str:
        return "بطاقة إتش إس بي سي"

    @property
    def formats(self) -> list[str]:
        return ["pdf"]

    def detect(self, content: bytes, headers: list[str] | None = None) -> bool:
        return False  # Stub — Task 12 implements real detection
