"""LLM client — litellm + instructor integration for structured category suggestions.

Uses instructor.from_litellm(litellm.acompletion) for async structured output.
Per RESEARCH.md Pitfall 5: acompletion avoids blocking the event loop.
"""

import asyncio
import logging

import instructor
import litellm
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class CategorySuggestion(BaseModel):
    """Structured output schema for instructor."""

    category_id: int = Field(description="ID of the matched category from the provided list")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score 0-1")
    reasoning: str = Field(description="Brief explanation of why this category was chosen")


# Use acompletion for async (per RESEARCH.md Pitfall 5)
_client = instructor.from_litellm(litellm.acompletion)


def _build_prompt(description: str, available_categories: list[dict]) -> str:
    """Build the user message content for the LLM.

    The description is passed as data in the user message, NOT interpolated into
    the system prompt — mitigates LLM prompt injection (T-3-02 in threat model).
    """
    cats_str = "\n".join(f"- ID {c['id']}: {c['name_en']}" for c in available_categories)
    return (
        "You are a transaction categorizer for a personal finance app.\n"
        "Given a bank transaction description, select the most appropriate category.\n\n"
        f"Transaction description: {description}\n\n"
        f"Available categories:\n{cats_str}\n\n"
        "Respond with the category_id, confidence (0-1), and brief reasoning.\n"
        "IMPORTANT: category_id MUST be one of the IDs listed above. Do not invent IDs."
    )


async def suggest_category(
    description: str,
    available_categories: list[dict],
    model: str = "claude-3-5-haiku-20241022",
) -> CategorySuggestion | None:
    """Call LLM for a single transaction. Returns None if LLM returns invalid category.

    Validates returned category_id against available_categories (RESEARCH.md Pitfall 2).
    Confidence is rounded to 4 decimal places to avoid float precision badge boundary issues.
    """
    valid_ids = {c["id"] for c in available_categories}
    try:
        result = await _client.chat.completions.create(
            model=model,
            response_model=CategorySuggestion,
            messages=[
                {"role": "user", "content": _build_prompt(description, available_categories)}
            ],
        )
        # Validate category_id against available list (RESEARCH.md Pitfall 2)
        if result.category_id not in valid_ids:
            logger.warning(
                "LLM returned invalid category_id=%d for '%s'", result.category_id, description
            )
            return None
        result.confidence = round(result.confidence, 4)
        return result
    except Exception:
        logger.exception("LLM call failed for description='%s'", description)
        return None


async def suggest_categories_batch(
    transactions: list[dict],
    available_categories: list[dict],
    model: str = "claude-3-5-haiku-20241022",
    max_concurrency: int = 5,
) -> list[tuple[int, CategorySuggestion | None]]:
    """Batch categorize transactions with bounded concurrency.

    Returns list of (transaction_id, suggestion) pairs. suggestion is None if
    the LLM call failed or returned an invalid category_id.
    """
    sem = asyncio.Semaphore(max_concurrency)

    async def _call(tx: dict) -> tuple[int, CategorySuggestion | None]:
        async with sem:
            result = await suggest_category(tx["description"], available_categories, model)
            return tx["id"], result

    tasks = [_call(tx) for tx in transactions]
    return list(await asyncio.gather(*tasks))
