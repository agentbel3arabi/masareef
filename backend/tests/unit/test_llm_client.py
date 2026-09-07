"""Unit tests for LLM client — llm_client.py (Plan 03-02, TDD RED)."""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from app.ai.llm_client import (
    CategorySuggestion,
    _build_prompt,
    suggest_categories_batch,
    suggest_category,
)

SAMPLE_CATEGORIES = [
    {"id": 1, "name_en": "Groceries"},
    {"id": 2, "name_en": "Restaurants"},
    {"id": 3, "name_en": "Transport"},
]


class TestCategorySuggestion:
    def test_valid_suggestion(self) -> None:
        s = CategorySuggestion(category_id=1, confidence=0.95, reasoning="clear match")
        assert s.category_id == 1
        assert s.confidence == 0.95
        assert s.reasoning == "clear match"

    def test_confidence_bounds(self) -> None:
        # confidence must be 0.0-1.0
        with pytest.raises(Exception):
            CategorySuggestion(category_id=1, confidence=1.5, reasoning="bad")

        with pytest.raises(Exception):
            CategorySuggestion(category_id=1, confidence=-0.1, reasoning="bad")


class TestBuildPrompt:
    def test_includes_description(self) -> None:
        prompt = _build_prompt("CARREFOUR CITY STARS", SAMPLE_CATEGORIES)
        assert "CARREFOUR CITY STARS" in prompt

    def test_includes_category_ids(self) -> None:
        prompt = _build_prompt("test", SAMPLE_CATEGORIES)
        assert "ID 1" in prompt
        assert "ID 2" in prompt
        assert "ID 3" in prompt

    def test_description_not_in_system_role(self) -> None:
        # The prompt is a user content string — verify it's one string (not split by role)
        prompt = _build_prompt("DANGEROUS INJECTION", SAMPLE_CATEGORIES)
        # description appears in the user content section
        assert "DANGEROUS INJECTION" in prompt
        # The structure is a single string — no role separation in build_prompt output
        assert isinstance(prompt, str)


class TestSuggestCategory:
    @pytest.mark.asyncio
    async def test_returns_valid_suggestion(self) -> None:
        mock_result = CategorySuggestion(category_id=1, confidence=0.9, reasoning="match")
        with patch("app.ai.llm_client._client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_result)
            result = await suggest_category("CARREFOUR", SAMPLE_CATEGORIES)
        assert result is not None
        assert result.category_id == 1

    @pytest.mark.asyncio
    async def test_returns_none_for_invalid_category_id(self) -> None:
        """RESEARCH.md Pitfall 2: LLM returns category_id not in available_categories."""
        mock_result = CategorySuggestion(category_id=999, confidence=0.9, reasoning="hallucinated")
        with patch("app.ai.llm_client._client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_result)
            result = await suggest_category("CARREFOUR", SAMPLE_CATEGORIES)
        assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_on_exception(self) -> None:
        with patch("app.ai.llm_client._client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(side_effect=Exception("API error"))
            result = await suggest_category("CARREFOUR", SAMPLE_CATEGORIES)
        assert result is None

    @pytest.mark.asyncio
    async def test_confidence_rounded_to_4_places(self) -> None:
        # Anti-pattern from RESEARCH.md: float precision — round to 4 decimal places
        mock_result = CategorySuggestion(category_id=1, confidence=0.9512345, reasoning="match")
        with patch("app.ai.llm_client._client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_result)
            result = await suggest_category("CARREFOUR", SAMPLE_CATEGORIES)
        assert result is not None
        # Confidence should be rounded to 4 decimal places
        assert result.confidence == round(0.9512345, 4)


class TestSuggestCategoriesBatch:
    @pytest.mark.asyncio
    async def test_returns_all_results(self) -> None:
        transactions = [
            {"id": 1, "description": "CARREFOUR"},
            {"id": 2, "description": "MCDONALDS"},
        ]
        suggestion = CategorySuggestion(category_id=1, confidence=0.9, reasoning="match")
        with patch("app.ai.llm_client._client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=suggestion)
            results = await suggest_categories_batch(transactions, SAMPLE_CATEGORIES)
        assert len(results) == 2
        tx_ids = {r[0] for r in results}
        assert tx_ids == {1, 2}

    @pytest.mark.asyncio
    async def test_respects_max_concurrency(self) -> None:
        """Semaphore limits concurrency — use a slow mock to verify no more than N concurrent."""
        call_count = 0
        max_concurrent = 0
        active = 0
        max_concurrency = 2

        async def slow_mock(*args, **kwargs):
            nonlocal call_count, max_concurrent, active
            active += 1
            max_concurrent = max(max_concurrent, active)
            await asyncio.sleep(0.01)
            active -= 1
            call_count += 1
            return CategorySuggestion(category_id=1, confidence=0.9, reasoning="match")

        transactions = [{"id": i, "description": f"TX {i}"} for i in range(5)]
        with patch("app.ai.llm_client._client") as mock_client:
            mock_client.chat.completions.create = slow_mock
            await suggest_categories_batch(
                transactions, SAMPLE_CATEGORIES, max_concurrency=max_concurrency
            )
        # All 5 calls completed
        assert call_count == 5
        # Concurrency never exceeded max_concurrency
        assert max_concurrent <= max_concurrency
