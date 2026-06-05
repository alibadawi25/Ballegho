/**
 * useLang — the primary localisation hook.
 *
 * Returns everything a component needs to render correctly in both Arabic
 * and English, derived from the user's stored language preference.
 *
 * ─── Return values ────────────────────────────────────────────────────────────
 *
 *   lang   — "ar" | "en"  (the resolved display language, never "system")
 *   t      — The matching string table from constants/i18n.ts
 *   isRTL  — true when lang === "ar"  (use for flexDirection, textAlign, etc.)
 *   isDark — true when the user's effective theme is dark
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 *   const { t, isRTL, isDark } = useLang();
 *   <Text style={isRTL ? styles.textAr : styles.textEn}>{t.greeting}</Text>
 *
 * ─── Arabic style rules (enforced throughout the codebase) ───────────────────
 *
 *   ✗  letterSpacing on Arabic text  (breaks ligatures)
 *   ✗  textTransform: "uppercase"    (meaningless in Arabic)
 *   ✗  fontWeight > "400" on system  (synthesised bold distorts glyphs)
 *   ✓  writingDirection: "rtl"       on all Arabic display text
 *   ✓  Amiri_400Regular / Amiri_700Bold for display / hadith text
 */

import { useSettings } from "@/contexts/SettingsContext";
import { strings } from "@/constants/i18n";

export function useLang() {
  const { lang, isDark } = useSettings();

  return {
    lang,
    t:     strings[lang],
    isRTL: lang === "ar",
    isDark,
  };
}
