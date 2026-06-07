/**
 * useHijriLine — the formatted "Weekday · D Month" line for the header.
 *
 * Maghrib-aware (uses getEffectiveDate so the date advances at sunset, matching
 * streaks/completions). Tries the cached AlAdhan API, falls back to the Intl
 * Umm-al-Qura calendar, and finally to the plain weekday. Extracted from the
 * Today screen so the GlobalHeader can compute it on any tab.
 */

import { useEffect, useState } from "react";
import { useLang } from "@/hooks/useLang";
import { getEffectiveDate } from "@/lib/islamicDate";
import { getHijriDate } from "@/lib/hijriDateApi";

function hijriFallback(date: Date, monthNames: readonly string[]): string | null {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric", month: "numeric",
    }).formatToParts(date);
    const day   = parseInt(parts.find((p) => p.type === "day")?.value  ?? "0");
    const month = parseInt(parts.find((p) => p.type === "month")?.value ?? "0");
    const name  = monthNames[month - 1];
    return name ? `${day} ${name}` : null;
  } catch { return null; }
}

export function useHijriLine(maghrib: Date | null): string {
  const { t, isRTL } = useLang();
  const effectiveDate = getEffectiveDate(maghrib); // YYYY-MM-DD

  const [hijriLine, setHijriLine] = useState<string | null>(
    () => hijriFallback(new Date(), t.hijriMonths),
  );

  useEffect(() => {
    getHijriDate(effectiveDate).then((h) => {
      if (!h) return;
      setHijriLine(isRTL
        ? `${h.weekdayAr} · ${h.dayAr} ${h.monthAr}`
        : `${h.weekdayEn} · ${h.day} ${h.monthEn}`);
    });
  }, [effectiveDate, isRTL]);

  const [y, m, d] = effectiveDate.split("-").map(Number);
  const weekday = t.weekdays[new Date(y, m - 1, d).getDay()];
  return hijriLine ?? weekday;
}
