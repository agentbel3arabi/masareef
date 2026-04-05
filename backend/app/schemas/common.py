from typing import Any

from pydantic import BaseModel


class PaginationMeta(BaseModel):
    total: int
    page: int = 1
    page_size: int = 50


class SuccessResponse(BaseModel):
    data: Any
    meta: PaginationMeta | None = None
    warnings: list[Any] | None = None


class Warning(BaseModel):
    code: str
    message: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: list[Any] = []


class ErrorResponse(BaseModel):
    error: ErrorDetail
