/**
 * useLearnContent — data hook for the Learn tab.
 *
 * Sources are all from our own Supabase `sunnahs` table — no external API
 * keys needed. Rotation is deterministic (everyone sees the same content
 * on the same day) and changes predictably.
 *
 * Hadith of the Day:  dayOfYear  % total  (cycles all 42 hadith in ~6 weeks)
 * Sunnah of the Week: weekOfYear % total  (offset by half to avoid overlap)
 *
 * ─── Maghrib-awareness ────────────────────────────────────────────────────────
 * Accepts the current Maghrib time from PrayerTimesContext so that rotation
 * uses getEffectiveDate() — advancing at Maghrib rather than midnight, matching
 * every other part of the app. A 30-second interval detects when the effective
 * date changes and automatically reloads content.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getEffectiveDate } from "@/lib/islamicDate";

export interface LearnSunnah {
  id:             string;
  slug:           string;
  name_en:        string;
  name_ar:        string;
  hadith_text_en: string | null;
  hadith_text_ar: string | null;
  hadith_source:  string | null;
  category:       string;
}

interface LearnContent {
  hadithOfDay:   LearnSunnah | null;
  sunnahOfWeek:  LearnSunnah | null;
  loading:       boolean;
  weekNum:       number;   // expose so learn.tsx doesn't re-compute independently
  reload:        () => void;
}

/** Day-of-year from an effective date string (YYYY-MM-DD). */
function dayOfYearFromStr(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y, 0, 1);
  const date  = new Date(y, m - 1, d);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

export function useLearnContent(maghribTime?: Date | null): LearnContent {
  const maghribRef = useRef<Date | null>(maghribTime ?? null);
  maghribRef.current = maghribTime ?? null;

  const [hadithOfDay,  setHadithOfDay]  = useState<LearnSunnah | null>(null);
  const [sunnahOfWeek, setSunnahOfWeek] = useState<LearnSunnah | null>(null);
  const [weekNum,      setWeekNum]      = useState(1);
  const [loading,      setLoading]      = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const effectiveDate = getEffectiveDate(maghribRef.current);
    const day  = dayOfYearFromStr(effectiveDate);
    const week = Math.floor(day / 7);

    // Expose weekNum so the Learn screen label is always in sync.
    setWeekNum(week + 1);

    const { data, error } = await supabase
      .from("sunnahs")
      .select("id, slug, name_en, name_ar, hadith_text_en, hadith_text_ar, hadith_source, category")
      .order("sort_order");

    if (error || !data?.length) {
      setLoading(false);
      return;
    }

    const total = data.length;
    const hadithIdx = day  % total;
    // Offset weekly pick by half so it never overlaps with the daily one.
    const sunnahIdx = (week + Math.floor(total / 2)) % total;

    setHadithOfDay(data[hadithIdx]  as LearnSunnah);
    setSunnahOfWeek(data[sunnahIdx] as LearnSunnah);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-reload when the effective date changes (Maghrib boundary crossing).
  // Same 30-second polling pattern as useSunnahs.
  const effectiveDateRef = useRef(getEffectiveDate(null));
  useEffect(() => {
    const id = setInterval(() => {
      const next = getEffectiveDate(maghribRef.current);
      if (next !== effectiveDateRef.current) {
        effectiveDateRef.current = next;
        load();
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [load]);

  return { hadithOfDay, sunnahOfWeek, loading, weekNum, reload: load };
}
