"""Import pipeline orchestrator.

parse_upload() runs the decision tree and returns one of:
  - ScannedResponse      → frontend shows upgrade prompt
  - NeedsMappingResponse → frontend shows column mapper
  - ParseCompleteResponse → frontend shows preview table

commit_import() atomically inserts transactions. Balance is NOT updated on the
account model (balance is computed dynamically: seed + sum of transactions).
"""

import logging
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.category import Category
from app.models.enums import TransactionType
from app.models.transaction import Transaction
from app.schemas.import_ import (
    CommitRequest,
    CommitResponse,
    NeedsMappingResponse,
    ParseCompleteResponse,
    ParsedRow,
    ScannedResponse,
)
from app.services.import_.csv_parser import get_headers as csv_headers
from app.services.import_.csv_parser import parse_csv
from app.services.import_.duplicate_checker import load_existing_hashes, mark_duplicates
from app.services.import_.excel_parser import get_headers as excel_headers
from app.services.import_.excel_parser import get_sheet_names, parse_excel
from app.services.import_.header_mapper import get_auto_suggest
from app.services.import_.pdf_parser import is_scanned
from app.services.import_.presets.registry import detect_preset
from app.services.import_template import get_linked_template
from app.services.money import CURRENCIES

logger = logging.getLogger(__name__)


def _parse_error(fmt: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={
            "error": {
                "code": "PARSE_ERROR",
                "message": (
                    f"Failed to parse {fmt} file. Check that the file is valid and not corrupted."
                ),
            }
        },
    )


def _detect_format(filename: str, content_type: str | None) -> str:
    name = filename.lower()
    if name.endswith(".csv"):
        return "csv"
    if name.endswith(".xlsx"):
        return "excel"
    if name.endswith(".xls"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "UNSUPPORTED_FORMAT",
                    "message": (
                        "Legacy .xls files are not supported. Please save as .xlsx and re-upload."
                    ),
                }
            },
        )
    if name.endswith(".pdf"):
        return "pdf"
    if content_type:
        ct = content_type.lower()
        if "csv" in ct or "text/plain" in ct:
            return "csv"
        if "spreadsheet" in ct or "excel" in ct:
            return "excel"
        if "pdf" in ct:
            return "pdf"
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "error": {
                "code": "UNSUPPORTED_FORMAT",
                "message": "Only CSV, Excel (.xlsx), and PDF are supported",
            }
        },
    )


def _complete(rows: list[ParsedRow], preset_id: str | None) -> ParseCompleteResponse:
    return ParseCompleteResponse(
        rows=rows,
        detected_preset=preset_id,
        total_rows=len(rows),
        valid_rows=sum(1 for r in rows if r.status == "valid"),
        error_rows=sum(1 for r in rows if r.status == "error"),
        duplicate_rows=sum(1 for r in rows if r.status == "duplicate"),
    )


async def parse_upload(
    raw_bytes: bytes,
    filename: str,
    account_id: int,
    session: AsyncSession,
    household_id: uuid.UUID,
    column_mapping: dict[str, str] | None = None,
    date_format: str = "DD/MM/YYYY",
    sheet_name: str | None = None,
    content_type: str | None = None,
    skip_rows: int = 0,
) -> ScannedResponse | NeedsMappingResponse | ParseCompleteResponse:
    """Orchestrate file parsing. Returns one of three response variants."""
    fmt = _detect_format(filename, content_type)

    # Verify account belongs to this household before any parsing/dedup work
    account_result = await session.execute(
        select(Account).where(
            Account.id == account_id,
            Account.household_id == household_id,
            Account.is_active.is_(True),
        )
    )
    account = account_result.scalar_one_or_none()
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "ACCOUNT_NOT_FOUND", "message": "Account not found"}},
        )

    # Derive currency and exponent from the account (authoritative source).
    account_currency = account.currency
    currency_exponent = CURRENCIES.get(account_currency, {}).get("exponent", 2)

    # NOTE: existing_hashes is intentionally NOT loaded here.
    # It is deferred to just before each mark_duplicates() call so that
    # early-return paths (ScannedResponse, NeedsMappingResponse) skip the DB
    # query entirely.

    # ── Check for account-linked template ─────────────────────────────────
    if not column_mapping:
        linked_template = await get_linked_template(session, account_id, household_id)
        if linked_template and linked_template.format != fmt:
            linked_template = None  # format mismatch — fall through to normal flow
        if linked_template and fmt in ("csv", "excel"):
            if fmt == "csv":
                try:
                    rows = parse_csv(
                        raw_bytes,
                        dict(linked_template.columns),
                        date_format=linked_template.date_format,
                        skip_rows=linked_template.skip_rows,
                        currency=account_currency,
                        currency_exponent=currency_exponent,
                    )
                except Exception:
                    raise _parse_error("CSV")
            else:
                try:
                    rows = parse_excel(
                        raw_bytes,
                        dict(linked_template.columns),
                        sheet_name=linked_template.sheet_name,
                        skip_rows=linked_template.skip_rows,
                        date_format=linked_template.date_format,
                        currency=account_currency,
                        currency_exponent=currency_exponent,
                    )
                except Exception:
                    raise _parse_error("Excel")
            existing_hashes = await load_existing_hashes(session, account_id, household_id)
            mark_duplicates(rows, account_id, existing_hashes)
            return _complete(rows, None)

    # ── PDF path ───────────────────────────────────────────────────────────
    if fmt == "pdf":
        try:
            scanned = is_scanned(raw_bytes)
        except Exception:
            logger.warning(
                "is_scanned() raised an unexpected error; treating PDF as parseable",
                exc_info=True,
            )
            scanned = False
        if scanned:
            return ScannedResponse()

        preset = detect_preset(raw_bytes)
        if preset is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": {
                        "code": "UNSUPPORTED_FORMAT",
                        "message": "PDF format not recognized. Supported: HSBC Credit Card PDF",
                    }
                },
            )

        try:
            rows = preset.parse(
                raw_bytes, currency=account_currency, currency_exponent=currency_exponent
            )
        except Exception:
            raise _parse_error("PDF")
        existing_hashes = await load_existing_hashes(session, account_id, household_id)
        mark_duplicates(rows, account_id, existing_hashes)
        return _complete(rows, preset.preset_id)

    # ── CSV / Excel with explicit mapping (second parse call) ──────────────
    if column_mapping:
        if fmt == "csv":
            try:
                rows = parse_csv(
                    raw_bytes,
                    column_mapping,
                    date_format=date_format,
                    skip_rows=skip_rows,
                    currency=account_currency,
                    currency_exponent=currency_exponent,
                )
            except Exception:
                raise _parse_error("CSV")
        else:
            try:
                rows = parse_excel(
                    raw_bytes,
                    column_mapping,
                    sheet_name=sheet_name,
                    skip_rows=skip_rows,
                    date_format=date_format,
                    currency=account_currency,
                    currency_exponent=currency_exponent,
                )
            except Exception:
                raise _parse_error("Excel")
        existing_hashes = await load_existing_hashes(session, account_id, household_id)
        mark_duplicates(rows, account_id, existing_hashes)
        return _complete(rows, None)

    # ── CSV: try preset, else needs_mapping ────────────────────────────────
    if fmt == "csv":
        try:
            headers = csv_headers(raw_bytes, skip_rows=skip_rows)
        except Exception:
            raise _parse_error("CSV")
        preset = detect_preset(raw_bytes, headers)
        if preset and preset.get_column_mapping():
            try:
                rows = parse_csv(
                    raw_bytes,
                    preset.get_column_mapping(),  # type: ignore[arg-type]
                    date_format=preset.get_date_format(),
                    skip_rows=skip_rows,
                    currency=account_currency,
                    currency_exponent=currency_exponent,
                )
            except Exception:
                raise _parse_error("CSV")
            existing_hashes = await load_existing_hashes(session, account_id, household_id)
            mark_duplicates(rows, account_id, existing_hashes)
            return _complete(rows, preset.preset_id)
        auto_suggest = get_auto_suggest(headers)
        return NeedsMappingResponse(headers=headers, auto_suggest=auto_suggest)

    # ── Excel: try preset, else needs_mapping with sheet info ─────────────
    try:
        sheets = get_sheet_names(raw_bytes)
        active_sheet = sheet_name or (sheets[0] if sheets else None)
        headers = excel_headers(raw_bytes, sheet_name=active_sheet, skip_rows=skip_rows)
    except Exception:
        raise _parse_error("Excel")
    preset = detect_preset(raw_bytes, headers)
    if preset and preset.get_column_mapping():
        try:
            rows = parse_excel(
                raw_bytes,
                preset.get_column_mapping(),  # type: ignore[arg-type]
                sheet_name=active_sheet,
                skip_rows=skip_rows,
                date_format=preset.get_date_format(),
                currency=account_currency,
                currency_exponent=currency_exponent,
            )
        except Exception:
            raise _parse_error("Excel")
        existing_hashes = await load_existing_hashes(session, account_id, household_id)
        mark_duplicates(rows, account_id, existing_hashes)
        return _complete(rows, preset.preset_id)
    auto_suggest = get_auto_suggest(headers)
    return NeedsMappingResponse(
        headers=headers,
        sheet_names=sheets,
        selected_sheet=active_sheet,
        auto_suggest=auto_suggest,
    )


async def commit_import(
    data: CommitRequest,
    session: AsyncSession,
    household_id: uuid.UUID,
) -> CommitResponse:
    """Atomically insert transactions. Does NOT update account.balance_minor
    (displayed balance is computed from seed + sum of transactions)."""
    # Verify account belongs to household
    result = await session.execute(
        select(Account).where(
            Account.id == data.account_id,
            Account.household_id == household_id,
            Account.is_active.is_(True),
        )
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "ACCOUNT_NOT_FOUND", "message": "Account not found"}},
        )

    account_currency = account.currency  # derive currency from account, not client

    # Look up the predefined "Uncategorized" category once for the whole batch
    uncategorized_result = await session.execute(
        select(Category).where(
            Category.name_en == "Uncategorized",
            Category.is_predefined.is_(True),
            Category.is_active.is_(True),
        )
    )
    uncategorized_category = uncategorized_result.scalar_one_or_none()
    uncategorized_id: int | None = uncategorized_category.id if uncategorized_category else None

    batch_id = uuid.uuid4()
    balance_delta = 0

    all_txs: list[Transaction] = []
    for commit_row in data.rows:
        tx_type = TransactionType(commit_row.type)
        # Enforce correct sign based on transaction type (server-side, not client-trusted)
        if tx_type == TransactionType.DEBIT:
            signed_amount = -abs(commit_row.amount_minor)
        else:
            signed_amount = abs(commit_row.amount_minor)
        tx = Transaction(
            household_id=household_id,
            account_id=data.account_id,
            date=commit_row.date,
            description=commit_row.description,
            amount_minor=signed_amount,
            currency=account_currency,
            type=tx_type,
            category_id=uncategorized_id,
            applies_to_balance=commit_row.apply_to_balance,
            import_batch_id=batch_id,
        )
        session.add(tx)
        all_txs.append(tx)
        if commit_row.apply_to_balance:
            balance_delta += signed_amount

    await session.flush()  # single flush for all rows

    first_tx_id = all_txs[0].id if all_txs else 0

    # AI categorization stub — Phase 9 implements this.
    # Before activating: add `background_tasks: BackgroundTasks` to this function's
    # signature and plumb it through the router call site.
    # background_tasks.add_task(ai_categorize_batch, str(batch_id))

    return CommitResponse(
        batch_id=str(batch_id),
        count=len(data.rows),
        first_transaction_id=first_tx_id,
        balance_delta=balance_delta,
    )
