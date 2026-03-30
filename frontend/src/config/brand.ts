// frontend/src/config/brand.ts

/**
 * Single source of truth for brand strings.
 * Change here → takes effect across entire site via i18n.
 *
 * These values are also mirrored in messages/en.json and messages/ar.json
 * under the "brand" key. Components should use t('brand.tagline') for
 * locale-aware rendering. This file is for non-i18n contexts (metadata, OG tags).
 */
export const BRAND = {
  name: "Masareef",
  nameAr: "مصاريف",
  tagline: "Your entire financial life, finally making sense.",
  taglineAr: "حسبة بيتك، متظبطة بالملي.",
  url: "https://masareef.app",
} as const;
