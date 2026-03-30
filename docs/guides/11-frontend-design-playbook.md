# Frontend Design Playbook

How to generate and implement Stitch-designed pages for Masareef. Follow this for every phase that includes frontend work.

## Stitch Project

**Project ID:** 512491289865585341
**Project Title:** Masareef v2 — Design System
**Project URL:** https://stitch.withgoogle.com/projects/512491289865585341
**Screen reference:** `docs/superpowers/plans/phase-1.75/stitch-project-reference.md`

All new screens are generated in this single project to maintain design consistency.

## Logo Assets

Logo PNGs are uploaded to the Stitch project. Reference them by screen ID in prompts:

| Variant | Screen ID | Use When |
|---------|-----------|----------|
| Horizontal color | 6328026163336453096 | Sidebar, navbar (light bg) |
| Horizontal white | 6328026163336451342 | Sidebar, navbar (dark bg) |
| Stacked color | 6328026163336451930 | Hero sections (light bg) |
| Stacked white | 6328026163336450176 | Hero sections (dark bg) |
| Icon only | 6328026163336453684 | Collapsed sidebar |

## Workflow: Generate → Review → Implement

### Step 1: Generate Screen

Use Stitch MCP `generate_screen_from_text` with project ID `512491289865585341`. Every prompt must include:

- Reference to the uploaded logo PNG by screen ID (see table above)
- Reference to the feature spec for data/behavior accuracy
- Specific page content and layout requirements
- The sidebar navigation (consistent across all app pages)

After generating, call `get_project` to find the new screen ID (it appears as the newest entry in `screenInstances`). Then call `get_screen` and **verify the `title` field matches the expected screen** before presenting the screenshot to the user.

### Step 2: User Reviews Design

Present the screenshot URL to the user. Do not proceed until they approve.

If changes are needed, use `edit_screens` with the screen ID and a description of changes.

### Step 3: Implement Using Shared Components

Build the page using these shared components (all in `components/shared/`):

| Component | Import | Use For |
|-----------|--------|---------|
| `PageHeader` | `@/components/shared/page-header` | Every page's title + subtitle + action buttons |
| `StatCard` | `@/components/shared/stat-card` | Dashboard, detail pages |
| `FilterBar` | `@/components/shared/filter-bar` | Any page with filters |
| `DataTable` | `@/components/shared/data-table` | Transaction lists, transfer lists |
| `FormSheet` | `@/components/shared/form-sheet` | Create/edit forms |
| `SummaryBar` | `@/components/shared/summary-bar` | Net worth, period totals |
| `EmptyState` | `@/components/shared/empty-state` | When data is empty |
| `MoneyDisplay` | `@/components/shared/money-display` | All monetary values |

### Step 4: Verify

Before creating PR, check:

- [ ] Page matches approved Stitch design
- [ ] All colors use CSS variables (no hardcoded hex)
- [ ] All spacing uses Tailwind tokens (no arbitrary values where avoidable)
- [ ] RTL: switch to Arabic, verify layout flips correctly
- [ ] Dark mode: toggle theme, verify all elements readable
- [ ] Responsive: check 375px (mobile), 768px (tablet), 1280px (desktop)
- [ ] All text uses i18n `t()` calls (no hardcoded English/Arabic)
- [ ] CSS logical properties only (`ps-`, `pe-`, `start-`, `end-` — never `pl-`, `pr-`, `left-`, `right-`)
- [ ] `pnpm build` + `pnpm lint` + `tsc --noEmit` pass

## "Coming Soon" Elements

If the Stitch design includes UI elements that need backend work not yet built:

- **Buttons:** Render disabled with tooltip "Coming soon"
- **Tabs/sections:** Show content area with empty state "Coming in Phase N"
- **Charts:** Placeholder card with title + "Coming in Phase 4"
- **Forms with missing API:** Build form UI, disable submit, add note

Log every such element in `docs/superpowers/plans/phase-1.75/backend-dependencies.md`.

## Design Consistency Rules

Stitch designs are **not perfectly consistent** across screens. The sidebar, navbar, and shared components may look different from screen to screen in Stitch — this is a known limitation of AI-generated designs.

**The rule: agreed components always win over what Stitch shows.**

Specifically:
- **Sidebar navigation** is always the canonical list from `lib/nav-items.ts` — if a Stitch screen shows fewer nav items, add the missing ones anyway
- **Shared components** (`PageHeader`, `StatCard`, `FilterBar`, `DataTable`, `FormSheet`, `SummaryBar`) must be used on every page that needs them, even if the Stitch design uses a different layout
- **Logo** is always the real SVG from `public/logos/` via `<Logo>` component — never a text placeholder, even if the Stitch screen shows text
- **Spacing, padding, border radius** follow design tokens, not Stitch pixel values
- When a Stitch screen contradicts the agreed component design, implement the agreed component and adapt the page layout around it

## Design Token Authority

When Stitch design conflicts with `docs/guides/09-design-tokens.md`, **design tokens always win**:

- Colors: Use canonical values from `globals.css` CSS variables
- Fonts: Always Inter + Noto Sans Arabic (never Stitch-generated fonts)
- Border radius: 10px cards, 6px inputs, 4px badges
- Spacing: Follow Tailwind scale, not Stitch pixel values
