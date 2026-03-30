// frontend/src/config/brand.ts

/**
 * Canonical definition of brand strings used by the app.
 *
 * These values are manually mirrored in messages/en.json and messages/ar.json
 * under the "brand" key. Updating this file does NOT automatically update
 * those i18n message files; they must be kept in sync separately.
 * Components should use t('brand.tagline') for locale-aware rendering.
 * This file is primarily for non-i18n contexts (metadata, OG tags).
 */
export const BRAND = {
  name: "Masareef",
  nameAr: "مصاريف",
  tagline: "Your entire financial life, finally making sense.",
  taglineAr: "حسبة بيتك، متظبطة بالملي.",
  url: "https://masareef.app",
} as const;
