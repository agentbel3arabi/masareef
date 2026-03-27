# Feature: Categories & AI Categorization

## Purpose
Categories classify transactions by purpose (groceries, salary, utilities, etc.). The system combines three layers: predefined system categories, user-created custom categories, and AI-powered auto-categorization with a learning rule engine. The goal is zero manual categorization effort after the first month of use.

## Three-Layer Categorization

### Layer 1: Predefined Categories (system)
Seeded on first run. Cannot be deleted, but icon/color can be customized. Available to all households.

**Expenses (12):**
| Name (EN) | Name (AR) | Icon | Color |
|-----------|-----------|------|-------|
| Food & Dining | طعام ومطاعم | utensils | #EF4444 |
| Groceries | بقالة | shopping-cart | #F97316 |
| Transportation | مواصلات | car | #EAB308 |
| Utilities | مرافق | zap | #84CC16 |
| Housing/Rent | سكن/إيجار | home | #22C55E |
| Healthcare | رعاية صحية | heart-pulse | #14B8A6 |
| Shopping | تسوق | shopping-bag | #06B6D4 |
| Education | تعليم | graduation-cap | #3B82F6 |
| Entertainment | ترفيه | film | #8B5CF6 |
| Telecommunications | اتصالات | phone | #A855F7 |
| Fuel | وقود | fuel | #EC4899 |
| Government/Fees | حكومة/رسوم | landmark | #F43F5E |

**Income (3):**
| Name (EN) | Name (AR) | Icon | Color |
|-----------|-----------|------|-------|
| Salary | راتب | banknote | #22C55E |
| Freelance Income | دخل حر | laptop | #10B981 |
| Other Income | دخل آخر | plus-circle | #34D399 |

**Special (3):**
| Name (EN) | Name (AR) | Icon | Color |
|-----------|-----------|------|-------|
| Transfer | تحويل | arrow-left-right | #94A3B8 |
| Uncategorized | غير مصنف | help-circle | #94A3B8 |
| Savings | ادخار | piggy-bank | #22C55E |

### Layer 2: User Custom Categories
Users create their own categories for household-specific needs (e.g., "Maid Service", "Kids School Fees", "Car Installment"). Full CRUD with bilingual names, icon, and color.

### Layer 3: AI Categorization + Rule Engine
Automatic categorization pipeline that learns from user behavior.

## AI Categorization Pipeline

### Execution Order
For each uncategorized transaction:
```
1. Rule Engine (instant, free)
   → Check categorization_rules for pattern match
   → If match with confidence ≥ 0.95 → assign, done

2. AI Provider (async, costs API credits)
   → Send description + amount + context to configured AI provider
   → Receive category suggestion + confidence score
   → Apply confidence tiers (see below)

3. Fallback
   → If AI unavailable or disabled → leave as "Uncategorized"
   → User categorizes manually → correction creates a rule
```

### Confidence Tiers
| Confidence | Action | UX |
|-----------|--------|-----|
| > 95% | Auto-assign silently | Category appears assigned, no prompt |
| 75–95% | Suggest with highlight | Category shown with subtle "AI" badge, one-tap to change |
| < 75% | Ask user | "What category?" prompt with top 3 suggestions |

### Rule Engine (categorization_rules)
Rules are created from:
- **User corrections** — user changes an AI-assigned category → rule created automatically
- **Manual creation** — user explicitly creates a rule in settings
- **AI learning** — after N identical corrections, confidence increases

**Matching logic:**
```
For each rule (ordered by confidence DESC, hit_count DESC):
  if rule.match_type == "exact" and description == rule.pattern → match
  if rule.match_type == "contains" and rule.pattern in description → match
  if rule.match_type == "regex" and re.match(rule.pattern, description) → match
```

First match wins. Rule hit_count increments on every match (tracks effectiveness).

### AI Provider Request
```python
# Prompt sent to AI provider (Claude/OpenAI/Azure/Ollama)
{
  "transaction": {
    "description": "CARREFOUR CITY STARS",
    "amount": -1250.00,
    "currency": "EGP",
    "date": "2026-03-20",
    "account_type": "credit_card"
  },
  "available_categories": [
    {"id": 1, "name": "Food & Dining"},
    {"id": 2, "name": "Groceries"},
    ...
  ],
  "user_rules_context": [
    "CARREFOUR → Groceries (3 previous matches)"
  ]
}

# Expected response
{
  "category_id": 2,
  "category_name": "Groceries",
  "confidence": 0.97,
  "reasoning": "Carrefour is a supermarket chain"
}
```

### Batch Categorization
After import, uncategorized transactions are categorized in batch:
1. Run rule engine on all uncategorized rows (instant)
2. Remaining uncategorized rows sent to AI in batches of 20
3. Results applied with confidence tiers
4. Frontend refreshes to show new categories

### Feedback Loop
```
User corrects AI category
  → System creates/updates categorization_rule:
    pattern: transaction description (or extracted merchant name)
    match_type: "contains"
    category_id: user's chosen category
    confidence: 1.0 (user-confirmed)
  → Next time same merchant appears → rule matches instantly, no AI call
  → Over time, AI calls decrease as rule coverage increases
```

## UI Reference Designs

| Screen | HTML Reference | Stitch Prompt |
|--------|---------------|---------------|
| Category Management | [19c-settings-categories.html](../stitch-designs/html/19c-settings-categories.html) | [19c-settings-categories.md](../stitch-prompts/19c-settings-categories.md) |

> These are layout references, not pixel-perfect specs. See [design-tokens.md](../guides/09-design-tokens.md) for canonical colors, fonts, and spacing.

## API Endpoints

### `GET /api/v1/categories`
List all categories (predefined + custom) for the household.

**Query params:** `type` (expense/income/special), `active_only` (default true)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name_en": "Food & Dining",
      "name_ar": "طعام ومطاعم",
      "type": "expense",
      "icon": "utensils",
      "color": "#EF4444",
      "is_predefined": true,
      "sort_order": 1
    }
  ],
  "meta": { "total": 18, "page": 1, "page_size": 50 }
}
```

### `POST /api/v1/categories`
Create a custom category.

**Request:**
```json
{
  "name_en": "Kids School Fees",
  "name_ar": "مصاريف مدرسة الأطفال",
  "type": "expense",
  "icon": "graduation-cap",
  "color": "#3B82F6"
}
```

### `PUT /api/v1/categories/{id}`
Update a category. Predefined categories: only icon and color editable. Custom: all fields.

### `DELETE /api/v1/categories/{id}`
Soft delete. Predefined categories cannot be deleted. Transactions using this category retain the link but display as "Deleted Category" in UI.

### `GET /api/v1/categorization-rules`
List all rules for the household, sorted by confidence then hit_count.

### `POST /api/v1/categorization-rules`
Manually create a categorization rule.

**Request:**
```json
{
  "pattern": "UBER",
  "match_type": "contains",
  "category_id": 3
}
```

### `DELETE /api/v1/categorization-rules/{id}`
Delete a rule. Future transactions will fall through to AI.

### `POST /api/v1/transactions/categorize-batch`
Trigger AI categorization for a set of uncategorized transactions.

**Request:**
```json
{
  "transaction_ids": [101, 102, 103]
}
```

**Response:**
```json
{
  "data": {
    "results": [
      { "transaction_id": 101, "category_id": 2, "confidence": 0.97, "source": "rule" },
      { "transaction_id": 102, "category_id": 5, "confidence": 0.82, "source": "ai" },
      { "transaction_id": 103, "category_id": null, "confidence": 0.45, "source": "ai" }
    ]
  }
}
```

## Acceptance Criteria

### Categories
- [ ] 18 predefined categories seeded on first run with bilingual names
- [ ] User can create custom categories with EN + AR names, icon, color
- [ ] Predefined categories: only icon and color editable, cannot delete
- [ ] Custom categories: full CRUD
- [ ] Category display respects locale (AR name when locale is Arabic)
- [ ] Deleting a category doesn't orphan transactions (graceful fallback)

### AI Categorization
- [ ] Rule engine runs before AI provider (cheaper, faster)
- [ ] AI provider is configurable per household (Claude/OpenAI/Azure/Ollama)
- [ ] Confidence tiers correctly determine UX (auto/suggest/ask)
- [ ] Batch categorization works after import (rule engine first, then AI for remainder)
- [ ] AI calls include available categories and recent rule context
- [ ] AI unavailable/disabled gracefully falls back to "Uncategorized"

### Rule Engine
- [ ] User correction of AI category auto-creates a rule
- [ ] Rules match by exact, contains, or regex
- [ ] Rule hit_count increments on every match
- [ ] Higher confidence rules take precedence
- [ ] Manual rule creation works from settings UI
- [ ] Rule deletion stops future matches (doesn't retroactively un-categorize)

### Learning Loop
- [ ] After first month of use, rule engine handles >70% of recurring merchants
- [ ] AI call volume decreases over time as rules accumulate
- [ ] Same merchant categorized consistently across all future transactions
