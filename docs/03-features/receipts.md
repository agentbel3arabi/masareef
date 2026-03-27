# Feature: Receipt Scanning (Phase 15 — Future)

> **Status:** Stub spec. This feature is deferred to Phase 15 (post-v1.4). The AI provider interface (`AIProvider.parse_receipt`) is defined in architecture but not yet implemented.

## Purpose
Users photograph or upload receipt images. The system uses AI (OCR + structured extraction) to extract merchant name, date, line items, total, and payment method — then auto-creates a transaction with suggested category.

## High-Level Flow
```
1. User taps "Scan Receipt" (camera or file upload)
2. Image sent to backend → AI provider's parse_receipt method
3. AI extracts: merchant, date, total, currency, line items (optional)
4. Backend returns structured data → frontend shows pre-filled transaction form
5. User confirms or adjusts → transaction created
6. Receipt image stored in Supabase Storage, linked to transaction
```

## Open Questions (to resolve before implementation)
- **Which AI provider handles OCR?** Claude (vision), OpenAI (vision), or a dedicated OCR service?
- **Line item extraction:** Extract individual items or just the total? Items enable per-item categorization (e.g., groceries vs household in a supermarket receipt).
- **Receipt storage:** How long are receipt images retained? Storage cost implications at scale.
- **Duplicate detection:** If user imports a bank statement AND scans the receipt for the same purchase, how are they reconciled?
- **Premium gate:** Is this premium-only (like scanned PDF OCR) or free-tier?

## Data Model Impact
- `transactions` table already has `import_batch_id` — receipts may need a `receipt_image_url TEXT` column or a separate `receipt_images` table (one transaction can have multiple receipt images).
- Supabase Storage bucket: `receipts/{household_id}/{transaction_id}/`

## AI Provider Interface (already defined in architecture)
```python
class AIProvider(ABC):
    async def parse_receipt(self, image_bytes: bytes) -> ReceiptData

class ReceiptData(BaseModel):
    merchant_name: str | None
    date: str | None          # YYYY-MM-DD
    total_minor: int | None
    currency: str | None
    line_items: list[LineItem] | None
    confidence: float

class LineItem(BaseModel):
    description: str
    amount_minor: int
    quantity: int = 1
```

## Acceptance Criteria (draft — refine before Phase 15)
- [ ] Camera capture and file upload both work
- [ ] AI extracts merchant, date, total with >80% accuracy on Egyptian receipts
- [ ] Pre-filled transaction form lets user correct any field before saving
- [ ] Receipt image stored and viewable from transaction detail
- [ ] Arabic receipt text handled correctly
- [ ] Graceful fallback when AI cannot parse receipt (show empty form with image attached)
