/**
 * Ballegho Design System — Theme
 *
 * Single source of truth for all visual tokens: colors, typography, spacing,
 * border radii. Import from here instead of hardcoding values in components.
 *
 * ─── Quick-start ─────────────────────────────────────────────────────────────
 *
 *   // App screens (support dark/light mode)
 *   import { colors } from "@/constants/theme";
 *   const { isDark } = useLang();
 *   const c = colors(isDark);
 *
 *   // Auth / onboarding screens (always dark)
 *   import { NIGHT } from "@/constants/theme";
 *   const C = NIGHT;
 *
 * ─── Arabic typography rules ──────────────────────────────────────────────────
 *
 *   ✗  letterSpacing on Arabic text  — breaks letter connections & ligatures
 *   ✗  textTransform: "uppercase"    — meaningless in Arabic, distorts glyphs
 *   ✗  fontWeight > "400" on system  — synthesised bold distorts glyphs
 *   ✓  writingDirection: "rtl"       — always set on Arabic display text
 *   ✓  Amiri font for display text   — Amiri_400Regular / Amiri_700Bold
 *   ✓  Omit fontFamily for UI labels — let the system font handle Arabic UI
 */

// ─── Raw color palette ────────────────────────────────────────────────────────

export const PALETTE = {
  // Night blues
  night0:  "#060f1b",   // absolute deepest shadow
  night1:  "#0a1422",   // home screen bg (dark mode)
  night2:  "#0e1a2b",   // onboarding / auth bg
  night3:  "#0f1d31",   // surface dim (dark mode)
  night4:  "#122236",   // card surface (dark mode)

  // Parchment (light mode)
  parchment0: "#f5efe2",  // screen bg
  parchment1: "#ede4d0",  // surface dim
  parchment2: "#ffffff",  // card surface

  // Text
  ink:     "#f4ecd8",   // primary text on dark
  inkDay:  "#0e1a2b",   // primary text on light
  muted:   "#8a8876",   // secondary text on dark
  mutedDay:"#7a8193",   // secondary text on light
  faint:   "#4a5362",   // tertiary / disabled on dark
  faintDay:"#b9bcc4",   // tertiary / disabled on light

  // Gold (primary brand accent)
  goldDark:  "#d4af37",  // on dark backgrounds (brighter)
  goldLight: "#b8892a",  // on light backgrounds (richer)
  goldMid:   "#a87d1f",
  goldDeep:  "#7a5912",
  goldFlare: "#f2d064",

  // Semantic colours
  rose:     "#d27866",   // error / destructive on dark
  roseDay:  "#a84a3d",   // error / destructive on light
  green:    "#4caf7d",   // success / complete on dark
  greenDay: "#2d7a50",   // success / complete on light
} as const;

// Divider tints (semi-transparent, work on any background)
export const DIVIDER_DARK  = "rgba(244,236,216,0.08)" as const;
export const DIVIDER_LIGHT = "rgba(14,26,43,0.1)"     as const;

// ─── Fixed night palette ──────────────────────────────────────────────────────
//
// Auth and onboarding screens are always dark regardless of the user's theme
// preference, because the "Night & Gold" aesthetic is central to first
// impressions. Use NIGHT for any screen that never switches to light mode.

export const NIGHT = {
  bg:      PALETTE.night2,
  bgDeep:  PALETTE.night1,
  surface: PALETTE.night4,
  ink:     PALETTE.ink,
  muted:   PALETTE.muted,
  faint:   PALETTE.faint,
  gold:    PALETTE.goldLight,
  error:   PALETTE.rose,
  divider: DIVIDER_DARK,
} as const;

// ─── Adaptive palette ─────────────────────────────────────────────────────────
//
// App screens (home, profile, sunnah detail) respect the user's
// appearance preference (dark / light / auto).
//
// Usage:
//   const { isDark } = useLang();
//   const c = colors(isDark);
//   <View style={{ backgroundColor: c.bg }}>

export function colors(isDark: boolean) {
  return {
    bg:         isDark ? PALETTE.night1      : PALETTE.parchment0,
    surface:    isDark ? PALETTE.night4      : PALETTE.parchment2,
    surfaceDim: isDark ? PALETTE.night3      : PALETTE.parchment1,
    ink:        isDark ? PALETTE.ink         : PALETTE.inkDay,
    inkMuted:   isDark ? PALETTE.muted       : PALETTE.mutedDay,
    inkFaint:   isDark ? PALETTE.faint       : PALETTE.faintDay,
    gold:       isDark ? PALETTE.goldDark    : PALETTE.goldLight,
    rose:       isDark ? PALETTE.rose        : PALETTE.roseDay,
    green:      isDark ? PALETTE.green       : PALETTE.greenDay,
    divider:    isDark ? DIVIDER_DARK        : DIVIDER_LIGHT,
  };
}

/** Return type of `colors()` — use in component prop types. */
export type Colors = ReturnType<typeof colors>;

// ─── Typography ───────────────────────────────────────────────────────────────
//
// Spread these objects into your StyleSheet entries. They never include
// letterSpacing or textTransform so they are safe for Arabic content.

export const TYPE = {
  // ── Display (wordmarks, large headings) ────────────────────────────────────
  displayAr: {
    fontFamily: "Amiri_700Bold",
    fontSize: 36,
    lineHeight: 56,
    writingDirection: "rtl" as const,
  },
  displayEn: {
    fontFamily: "Georgia",
    fontSize: 32,
    letterSpacing: -0.5 as number,
    fontWeight: "400" as const,
  },

  // ── Title (screen section headings) ───────────────────────────────────────
  titleAr: {
    fontFamily: "Amiri_700Bold",
    fontSize: 28,
    lineHeight: 44,
    writingDirection: "rtl" as const,
  },
  titleEn: {
    fontFamily: "Georgia",
    fontSize: 26,
    letterSpacing: -0.4 as number,
    fontWeight: "400" as const,
  },

  // ── Body text ──────────────────────────────────────────────────────────────
  bodyAr: {
    fontFamily: "Amiri_400Regular",
    fontSize: 17,
    lineHeight: 30,
    writingDirection: "rtl" as const,
  },
  bodyEn: {
    fontSize: 15,
    lineHeight: 22,
  },

  // ── Hadith (special large Arabic + italic English) ─────────────────────────
  hadithAr: {
    fontFamily: "Amiri_400Regular",
    fontSize: 19,
    lineHeight: 34,
    writingDirection: "rtl" as const,
    textAlign: "right" as const,
  },
  hadithEn: {
    fontFamily: "Georgia",
    fontStyle: "italic" as const,
    fontSize: 14,
    lineHeight: 24,
  },

  // ── Caption / labels ───────────────────────────────────────────────────────
  captionAr: {
    fontFamily: "Amiri_400Regular",
    fontSize: 13,
    writingDirection: "rtl" as const,
  },
  captionEn: {
    fontSize: 11,
    lineHeight: 16,
  },

  // ── Section eyebrow (UPPERCASE label above a card) ────────────────────────
  // English: uppercase + letter-spaced. Arabic: Amiri, normal case, no spacing.
  eyebrowEn: {
    fontSize: 10,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 1.2 as number,
  },
  eyebrowAr: {
    fontFamily: "Amiri_400Regular",
    fontSize: 13,
    writingDirection: "rtl" as const,
    textAlign: "right" as const,
  },
} as const;

// ─── Spacing scale ────────────────────────────────────────────────────────────

export const SPACE = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

// ─── Border radii ─────────────────────────────────────────────────────────────

export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   14,
  xl:   16,
  xxl:  20,
  pill: 99,
} as const;

// ─── Shadow preset ────────────────────────────────────────────────────────────
//
// Apply to cards that sit above the background.

export const SHADOW_SM = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
} as const;
