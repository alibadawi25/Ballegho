/**
 * useStreaks — data hook for the Streaks tab (design screen 6).
 *
 * Aggregates everything the Progress screen shows:
 *   • current / longest global streak           (user_streaks)
 *   • this-month and all-time active-day counts  (daily_completions)
 *   • a 5-week heatmap of daily activity         (daily_completions)
 *   • the user's most consistent sunnahs         (user_sunnah_stats)
 *
 * ─── Effective date ───────────────────────────────────────────────────────────
 *   Like useSunnahs, every date is the Hijri-adjusted "effective date" (before
 *   Maghrib → today, after → tomorrow) so the heatmap's "today" lines up with the
 *   home screen's day boundary. The caller passes the current Maghrib time from
 *   PrayerTimesContext.
 *
 * ─── Full vs partial days ─────────────────────────────────────────────────────
 *   daily_completions has one row per (sunnah, date). The number of rows on a
 *   date is how many sunnahs were completed that day. We classify a day as
 *   "full" when that count reaches the number of currently-active sunnahs, else
 *   "partial". The active count is only known for *today*, so historical full/
 *   partial is an approximation — good enough for an at-a-glance heatmap.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSyncEffect } from "@/contexts/SyncContext";
import { supabase } from "@/lib/supabase";
import { getEffectiveDate, localDateString } from "@/lib/islamicDate";

export type HeatLevel = "empty" | "partial" | "full" | "future";

export interface HeatCell {
  dateStr: string;
  level:   HeatLevel;
}

export interface ConsistencyItem {
  sunnah_id:        string;
  name_en:          string;
  name_ar:          string;
  rate:             number; // 0..1 (completion_rate_30d)
  totalCompletions: number;
}

const GRID_WEEKS = 5;
const GRID_DAYS  = GRID_WEEKS * 7; // 35 cells

export function useStreaks(maghribTime?: Date | null) {
  const { user } = useAuth();

  // Stable ref so the effective date is always current without re-creating load
  // on every prayer-context tick.
  const maghribRef = useRef<Date | null>(maghribTime ?? null);
  maghribRef.current = maghribTime ?? null;

  // Hijri date derived from the *prop* (not the ref). It changes only when the
  // day boundary flips — including the cold-start case where the shared
  // PrayerTimesContext resolves Maghrib *after* the first render and pushes us
  // into the next Hijri day. Safe to use as an effect dependency: it's a date
  // *string*, so it doesn't churn as the live countdown ticks every second.
  const effectiveDate = getEffectiveDate(maghribTime ?? null);
  const effectiveDateRef = useRef(effectiveDate);

  const [loading,        setLoading]        = useState(true);
  const [currentStreak,  setCurrentStreak]  = useState(0);
  const [longestStreak,  setLongestStreak]  = useState(0);
  const [thisMonthDays,  setThisMonthDays]  = useState(0);
  const [daysInMonth,    setDaysInMonth]    = useState(30);
  const [totalDays,      setTotalDays]      = useState(0);
  const [heatmap,        setHeatmap]        = useState<HeatCell[]>([]);
  const [consistency,    setConsistency]    = useState<ConsistencyItem[]>([]);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    const today     = getEffectiveDate(maghribRef.current);
    const [ty, tm, td] = today.split("-").map(Number);
    const todayDate = new Date(ty, tm - 1, td);

    // Heatmap grid: 5 full weeks ending on the Saturday of the current week so
    // the columns are stable weekdays (Sun…Sat). Future days in the current
    // week render as "future".
    const weekStart = new Date(todayDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // back to Sunday
    const gridStart = new Date(weekStart);
    gridStart.setDate(gridStart.getDate() - (GRID_WEEKS - 1) * 7);
    const gridStartStr = localDateString(gridStart);

    const monthStart    = new Date(ty, tm - 1, 1);
    const monthStartStr = localDateString(monthStart);

    const [
      { data: streakRow },
      { data: completions },
      { count: activeCount },
      { data: statsRows },
    ] = await Promise.all([
      supabase
        .from("user_streaks")
        .select("current_streak, longest_streak")
        .eq("user_id", user.id)
        .maybeSingle(),

      // All completions from the grid start onward — covers heatmap + this-month.
      supabase
        .from("daily_completions")
        .select("completed_date")
        .eq("user_id", user.id)
        .gte("completed_date", gridStartStr),

      supabase
        .from("user_sunnahs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true),

      supabase
        .from("user_sunnah_stats")
        .select("sunnah_id, completion_rate_30d, total_completions, sunnahs ( name_en, name_ar )")
        .eq("user_id", user.id)
        .order("completion_rate_30d", { ascending: false })
        .limit(6),
    ]);

    // ── Per-date completion counts (rows = sunnahs completed that date) ──────
    const countByDate = new Map<string, number>();
    for (const row of (completions ?? [])) {
      const d = row.completed_date as string;
      countByDate.set(d, (countByDate.get(d) ?? 0) + 1);
    }

    const active = activeCount ?? 0;

    // ── This-month + total active days (distinct dates with ≥1 completion) ───
    let monthCount = 0;
    for (const d of countByDate.keys()) {
      if (d >= monthStartStr && d <= today) monthCount += 1;
    }
    // distinct days in the fetched window that are on/before today
    let total = 0;
    for (const d of countByDate.keys()) {
      if (d <= today) total += 1;
    }

    // ── Build the 35-cell heatmap ────────────────────────────────────────────
    const cells: HeatCell[] = [];
    for (let i = 0; i < GRID_DAYS; i++) {
      const date = new Date(gridStart);
      date.setDate(date.getDate() + i);
      const dateStr = localDateString(date);

      let level: HeatLevel;
      if (dateStr > today) {
        level = "future";
      } else {
        const cnt = countByDate.get(dateStr) ?? 0;
        if (cnt === 0)                      level = "empty";
        else if (active > 0 && cnt >= active) level = "full";
        else                                level = "partial";
      }
      cells.push({ dateStr, level });
    }

    // ── Most-consistent list ─────────────────────────────────────────────────
    const items: ConsistencyItem[] = (statsRows ?? [])
      .map((r: any) => {
        const s = Array.isArray(r.sunnahs) ? r.sunnahs[0] : r.sunnahs;
        if (!s) return null;
        return {
          sunnah_id:        r.sunnah_id,
          name_en:          s.name_en,
          name_ar:          s.name_ar,
          rate:             r.completion_rate_30d ?? 0,
          totalCompletions: r.total_completions   ?? 0,
        };
      })
      .filter(Boolean) as ConsistencyItem[];

    setCurrentStreak(streakRow?.current_streak ?? 0);
    setLongestStreak(streakRow?.longest_streak ?? 0);
    setThisMonthDays(monthCount);
    setDaysInMonth(new Date(ty, tm, 0).getDate());
    setTotalDays(total);
    setHeatmap(cells);
    setConsistency(items);
    setLoading(false);
  }, [user?.id]);

  // Run on mount, on user change, and whenever the effective Hijri date flips.
  // The date-flip case covers the cold-start race: Maghrib resolves *after* the
  // first render, so the initial load() ran with the pre-Maghrib date. Without
  // this the heatmap "today" cell and this-month counts reflect yesterday until
  // the 30 s interval below fires or the tab is re-focused.
  useEffect(() => {
    effectiveDateRef.current = effectiveDate;
    load();
  }, [load, effectiveDate]);

  // Refresh the heatmap/streak counts the moment a completion is toggled or the
  // active list changes on another tab — no need to leave and re-enter Progress.
  useSyncEffect(["completions", "sunnahs"], load);

  // Auto-reload when the effective date changes while the app stays open and the
  // prop doesn't re-render (Maghrib boundary crossing). Without this, a user
  // already on the Streaks tab sees a stale heatmap "today" cell until they
  // navigate away and back.
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

  return {
    loading,
    currentStreak,
    longestStreak,
    thisMonthDays,
    daysInMonth,
    totalDays,
    heatmap,
    consistency,
    reload: load,
  };
}
