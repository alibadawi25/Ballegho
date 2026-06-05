/**
 * Hadith text utilities.
 *
 * ─── Sanad vs Matn ────────────────────────────────────────────────────────────
 *   Sanad = the chain of narrators ("On the authority of so-and-so…")
 *   Matn  = the Prophet's ﷺ actual words — what users care about in a preview.
 *
 *   In the Nawawi 40 data (fawazahmed0/hadith-api):
 *     English: matn is wrapped in " straight or " curly opening quote.
 *       e.g. "…say: \"Actions are judged by intentions…\""
 *     Arabic: matn is mostly wrapped in " after the speech verb, but occasionally
 *       the verb يَقُولُ: / قَالَ: is followed directly by the matn (no quote).
 *       e.g. "…يَقُولُ: \" إنَّمَا الْأَعْمَالُ…"
 *            "…يَقُولُ: بُنِيَ الْإِسْلَامُ…" (no quote)
 */

/**
 * Extract the matn (actual hadith text) from a full hadith string that may
 * include the sanad/narrator chain at the beginning.
 *
 * Returns the full text unchanged if no boundary is found.
 */
export function extractMatn(text: string, isArabic: boolean): string {
  const t = text.trim();

  // ── 1. Opening quote character (works for the majority of hadith) ──────────
  // Try all common quote marks in priority order.
  for (const q of ['"', '“', '«', '„']) {
    const i = t.indexOf(q);
    if (i >= 0) {
      const after = t.slice(i + 1).trim();
      // Only accept if what follows is a reasonable length (not just a closing quote).
      if (after.length > 15) return after;
    }
  }

  // ── 2. Arabic speech-verb fallback ────────────────────────────────────────
  // When no quote is present, the matn follows immediately after the verb.
  if (isArabic) {
    for (const marker of [
      'يَقُولُ: ',
      'قَالَ: ',
      'قَالَ:',
      'قال: ',
    ]) {
      const i = t.indexOf(marker);
      if (i >= 0) {
        const after = t.slice(i + marker.length).trim();
        if (after.length > 15) return after;
      }
    }
  }

  // ── 3. Fallback: return the full text ─────────────────────────────────────
  return t;
}
