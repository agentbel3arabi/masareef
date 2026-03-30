# Phase 1.75 Stitch Project Reference

**Project ID:** 512491289865585341
**Project Title:** Masareef v2 — Design System
**Design System Asset ID:** 5950283542674274522
**Stitch URL:** https://stitch.withgoogle.com/projects/512491289865585341

## Logo Assets (uploaded to project)

| Variant | Screen ID | Dimensions | Use When |
|---------|-----------|-----------|----------|
| Horizontal color | 6328026163336453096 | 500x200 | Sidebar, navbar (light bg) |
| Horizontal white | 6328026163336451342 | 500x200 | Sidebar, navbar (dark bg) |
| Stacked color | 6328026163336451930 | 300x300 | Hero sections (light bg) |
| Stacked white | 6328026163336450176 | 300x300 | Hero sections (dark bg) |
| Icon only | 6328026163336453684 | 512x512 | Collapsed sidebar |

## Approved Screens

| Screen | Screen ID | Approved Date |
|--------|-----------|--------------|
| 01-landing-page | 30df2965eecd4ce9a37fa9297c3bdfb2 | 2026-03-30 |
| 02-login | 7de800603d8f4631abd678fdf89f303d | 2026-03-30 |
| 03-registration | c2ea537171594ca39b08c4a077de79e3 | 2026-03-30 |
| 04-onboarding | 80b7dcaa5303411cb95e128248ccb005 | 2026-03-30 |
| 05-dashboard | 7d23140e94ef4ff6abd9cf63bc89b8a1 | 2026-03-30 |
| 06-accounts | 27baa152405e4953a88969ae9d0c8ab9 | 2026-03-30 |
| 07-account-detail | a07aa13e99cc41a288be41d0847b0fc3 | 2026-03-30 |
| 07b-transactions-global | d0908a8ee1f14f9fa7d4d36017a284e1 | 2026-03-30 |

## How to Use in Future Phases

When implementing a screen, use `mcp__stitch__get_screen` with the screen ID above.
Always verify the `title` field in the response matches the expected screen before using the screenshot or HTML.

When generating new screens for future phases:
1. Use `generate_screen_from_text` in project `512491289865585341`
2. Reference logo PNGs by their screen IDs (see table above) in the prompt
3. After generation, call `get_project` to find the new screen ID (highest y-coordinate = newest)
4. Call `get_screen` and verify `title` matches before presenting to user
