"""Abstract base class for all bank import presets."""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class PdfColumnConfig:
    """X-coordinate column ranges for pdfplumber positional word extraction.

    ⚠️  X-ranges must be calibrated against a real bank PDF.
    Use the eval_pdf_library.py script + pdfplumber's debug visualisation to
    determine accurate ranges. Values here are illustrative starting points.
    """

    date_x_range: tuple[float, float]
    description_x_range: tuple[float, float]
    debit_x_range: tuple[float, float]
    credit_x_range: tuple[float, float]
    balance_x_range: tuple[float, float] | None = None
    y_tolerance: float = 3.0  # Group words within 3pt vertically into same row


class BankPreset(ABC):
    """Abstract base for all bank import presets."""

    @property
    @abstractmethod
    def preset_id(self) -> str:
        """Unique identifier, e.g. 'hsbc_cc'."""

    @property
    @abstractmethod
    def name(self) -> str:
        """English display name."""

    @property
    @abstractmethod
    def name_ar(self) -> str:
        """Arabic display name."""

    @property
    @abstractmethod
    def formats(self) -> list[str]:
        """Supported formats: subset of ['csv', 'excel', 'pdf']."""

    @abstractmethod
    def detect(self, content: bytes, headers: list[str] | None = None) -> bool:
        """Return True if this file matches this preset's signature."""

    def get_column_mapping(self) -> dict[str, str] | None:
        """Column header mapping for CSV/Excel. None for PDF-only presets."""
        return None

    def get_pdf_config(self) -> PdfColumnConfig | None:
        """X-range config for PDF positional extraction. None for CSV/Excel presets."""
        return None

    def get_date_format(self) -> str:
        """Expected date format string (user-facing notation)."""
        return "DD/MM/YYYY"
