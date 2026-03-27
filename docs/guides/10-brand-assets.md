# Brand Assets (Logos)

The `logos/` directory contains all Masareef brand marks in two formats:

- **SVG** (`logos/svg/`) — preferred for all web usage (scalable, smaller payload)
- **PNG** (`logos/png/`) — raster fallback with `@1x` and `@3x` variants

## Directory Structure

Each format has three background variants:

| Variant        | Use When                                                                      |
| -------------- | ----------------------------------------------------------------------------- |
| `dark/`        | Placing logo on a dark background                                             |
| `light/`       | Placing logo on a light background                                            |
| `transparent/` | Overlaying on images, gradients, or any surface. Includes `-white` versions for dark surfaces |

## Logo Types

| File prefix  | Shape                        | Use For                                                         |
| ------------ | ---------------------------- | --------------------------------------------------------------- |
| `favicon`    | Small square icon            | Browser tab, bookmarks, PWA icon, `<link rel="icon">`           |
| `icon`       | Standalone mark/symbol       | App icon, avatar, social media profile                          |
| `horizontal` | Mark + wordmark side by side | Navbar, header, email signature                                 |
| `stacked`    | Mark + wordmark vertically   | Splash screen, login page, marketing                            |

## Usage Rules

- **Always use SVG** for in-app rendering; use PNG only for contexts that require raster (email, social OG images, favicon `.ico` generation)
- **Never scale PNG `@1x` up** — use `@3x` when a larger raster is needed
- **Match the background variant** to the surface — do not place a `light/` logo on a dark background
- For the Next.js frontend, reference logos via `next/image` with appropriate `width`/`height` and `alt="Masareef"` / `alt="مصاريف"`
