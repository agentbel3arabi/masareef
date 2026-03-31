"""Pydantic schemas for the import pipeline."""

import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ParsedRow(BaseModel):
    row_index: int
    date: datetime.date | None = None
    description: str = ""
    debit_raw: str = ""
    credit_raw: str = ""
    amount_minor: int | None = None
    currency: str = "EGP"
    type: str = "debit"  # "debit" | "credit"
    status: str = "valid"  # "valid" | "duplicate" | "error"
    error_message: str | None = None
    selected: bool = True
    apply_to_balance: bool = True
    original_currency: str | None = None
    original_amount_minor: int | None = None
    fx_rate: int | None = None


class NeedsMappingResponse(BaseModel):
    result_type: Literal["needs_mapping"] = "needs_mapping"
    headers: list[str]
    sheet_names: list[str] = []
    selected_sheet: str | None = None
    auto_suggest: dict[str, str] = {}  # {field_name: suggested_header}


class ScannedResponse(BaseModel):
    result_type: Literal["scanned"] = "scanned"
    scanned: bool = True


class ParseCompleteResponse(BaseModel):
    result_type: Literal["complete"] = "complete"
    rows: list[ParsedRow]
    detected_preset: str | None = None
    total_rows: int
    valid_rows: int
    error_rows: int
    duplicate_rows: int


class CommitRow(BaseModel):
    date: datetime.date
    description: str = ""
    amount_minor: int
    currency: str
    type: str  # "debit" | "credit"
    apply_to_balance: bool = True
    original_currency: str | None = None
    original_amount_minor: int | None = None
    fx_rate: int | None = None


class CommitRequest(BaseModel):
    account_id: int
    rows: list[CommitRow] = Field(min_length=1)


class CommitResponse(BaseModel):
    batch_id: str
    count: int
    first_transaction_id: int
    balance_delta: int


class PresetInfo(BaseModel):
    id: str
    name: str
    name_ar: str
    formats: list[str]
