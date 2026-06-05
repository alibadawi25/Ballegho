/**
 * hijriDateApi — fetch the Hijri (Islamic) date from AlAdhan's free REST API.
 *
 * Why not Intl.DateTimeFormat("en-u-ca-islamic-umalqura")?
 *   That relies on the JS engine's ICU data, which is inconsistent across
 *   Android WebViews and old devices. AlAdhan uses the official Umm Al-Qura
 *   reckoning and is the same source used by the Saudi government.
 *
 * Caching: one AsyncStorage entry per Gregorian date so we never hit the
 * network more than once per calendar day regardless of how many times the
 * home screen re-renders.
 *
 * Usage:
 *   const hijri = await getHijriDate(new Date());
 *   // en: "13 Ramadan 1446"
 *   // ar: "١٣ رَمَضان ١٤٤٦"
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "ballegho:hijri:v1:";

const AR_DIGITS = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
const toAr = (s: string) => s.replace(/[0-9]/g, d => AR_DIGITS[+d]);

export interface HijriDate {
  day:       string;    // "13"    (Western digit)
  dayAr:     string;    // "١٣"
  monthEn:   string;    // "Ramadan"
  monthAr:   string;    // "رَمَضان"
  yearEn:    string;    // "1446"
  yearAr:    string;    // "١٤٤٦"
  weekdayEn: string;    // "Thursday"
  weekdayAr: string;    // "الخميس"
}

/**
 * Fetch the Hijri date for an effective Gregorian date string (YYYY-MM-DD).
 *
 * Pass the output of `getEffectiveDate(maghrib)` so that after Maghrib the
 * display advances to the next Islamic day — matching the same boundary that
 * useSunnahs and the week strip use.
 */
export async function getHijriDate(effectiveDateStr: string): Promise<HijriDate | null> {
  // effectiveDateStr is YYYY-MM-DD from getEffectiveDate().
  const [yyyy, mm, dd] = effectiveDateStr.split("-");
  // AlAdhan expects DD-MM-YYYY.
  const apiDate  = `${dd}-${mm}-${yyyy}`;
  const cacheKey = CACHE_PREFIX + effectiveDateStr;

  // ── Cache hit ─────────────────────────────────────────────────────────────
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as HijriDate;
  } catch { /* storage read failed — continue to network */ }

  // ── Network fetch ─────────────────────────────────────────────────────────
  try {
    const res  = await fetch(`https://api.aladhan.com/v1/gToH/${apiDate}`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const h    = json?.data?.hijri;
    if (!h) return null;

    const result: HijriDate = {
      day:       h.day,
      dayAr:     toAr(h.day),
      monthEn:   h.month.en,
      monthAr:   h.month.ar,
      yearEn:    h.year,
      yearAr:    toAr(h.year),
      weekdayEn: h.weekday.en,
      weekdayAr: h.weekday.ar,
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(result)).catch(() => {});
    return result;
  } catch {
    return null; // network unavailable — caller falls back to Intl
  }
}
