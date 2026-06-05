/**
 * useSunnahs — the core daily-practice data hook.
 *
 * Accepts an optional `maghribTime` so the caller (home screen) can pass the
 * current Maghrib time from the shared PrayerTimesContext. All completion
 * dates and streak calculations use the Hijri-adjusted "effective date"
 * (before Maghrib → today, after Maghrib → tomorrow) instead of UTC midnight.
 *
 * ─── Why effective date? ──────────────────────────────────────────────────────
 *
 *   The Hijri day starts at Maghrib. A user completing their evening adhkār at
 *   9pm has already entered the next Islamic day, so the completion should be
 *   attributed to that new day. Using UTC midnight was doubly wrong: it ignored
 *   both the Maghrib boundary AND the user's local timezone.
 *
 * ─── Why a ref for maghribTime? ───────────────────────────────────────────────
 *
 *   `complete` and `uncomplete` are stable useCallbacks (only user.id in deps).
 *   If they read maghribTime from a closure they'd get a stale value after the
 *   date changes at Maghrib. A ref is always current without adding maghribTime
 *   to deps (which would recreate the callbacks every second as prayer times tick).
 *
 * ─── Why two separate queries for user_sunnah_stats? ─────────────────────────
 *
 *   user_sunnah_stats has no FK to user_sunnahs (both reference sunnahs +
 *   profiles independently). PostgREST can only auto-join tables that share a
 *   direct FK, so nesting would 400. We fetch separately and merge in JS.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { getEffectiveDate, localDateString } from "@/lib/islamicDate";

export interface ActiveSunnah {
  user_sunnah_id:      string;
  sunnah_id:           string;
  slug:                string;
  name_en:             string;
  name_ar:             string;
  time_of_day:         string;
  estimated_seconds:   number;
  is_anchor:           boolean;
  position:            number;
  current_streak:      number;
  difficulty_effective: number;
}

export type GroupKey = "morning" | "daily" | "evening" | "night";

export interface SunnahGroups {
  morning: ActiveSunnah[];
  daily:   ActiveSunnah[];
  evening: ActiveSunnah[];
  night:   ActiveSunnah[];
}

function toGroup(timeOfDay: string): GroupKey {
  if (timeOfDay === "morning") return "morning";
  if (timeOfDay === "evening") return "evening";
  if (timeOfDay === "night")   return "night";
  return "daily";
}

export function useSunnahs(maghribTime?: Date | null) {
  const { user } = useAuth();

  // ── Stable ref so callbacks always see the current Maghrib without being
  //    recreated every second as the prayer context ticks.
  const maghribRef = useRef<Date | null>(maghribTime ?? null);
  maghribRef.current = maghribTime ?? null;

  const [groups,         setGroups]         = useState<SunnahGroups>({ morning: [], daily: [], evening: [], night: [] });
  const [completedIds,   setCompletedIds]   = useState<Set<string>>(new Set());
  const [activeDates,    setActiveDates]    = useState<Set<string>>(new Set());
  const [anchorId,       setAnchorId]       = useState<string | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [totalCount,     setTotalCount]     = useState(0);
  const [currentStreak,  setCurrentStreak]  = useState(0);
  const [longestStreak,  setLongestStreak]  = useState(0);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    // Compute the Hijri-adjusted date fresh at call time (not from closure).
    const today = getEffectiveDate(maghribRef.current);

    // Last 6 days for the 7-day strip (today computed above is day 7)
    const sixDaysAgoDate = new Date(today + "T00:00:00");
    sixDaysAgoDate.setDate(sixDaysAgoDate.getDate() - 6);
    const sixDaysAgo = localDateString(sixDaysAgoDate);

    const [
      { data: sunnahRows, error: sunnahError },
      { data: statsRows },
      { data: completions },
      { data: streakRow },
      { data: weekRows },
    ] = await Promise.all([
      supabase
        .from("user_sunnahs")
        .select(`
          id, sunnah_id, is_anchor, position,
          sunnahs ( slug, name_en, name_ar, time_of_day, estimated_seconds )
        `)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("position"),

      supabase
        .from("user_sunnah_stats")
        .select("sunnah_id, current_streak, difficulty_effective")
        .eq("user_id", user.id),

      supabase
        .from("daily_completions")
        .select("sunnah_id")
        .eq("user_id", user.id)
        .eq("completed_date", today),   // ← Hijri-adjusted date

      supabase
        .from("user_streaks")
        .select("current_streak, longest_streak")
        .eq("user_id", user.id)
        .maybeSingle(),

      // 5. Last 7 days — which dates had any completion (for the week strip)
      supabase
        .from("daily_completions")
        .select("completed_date")
        .eq("user_id", user.id)
        .gte("completed_date", sixDaysAgo)
        .lte("completed_date", today),
    ]);

    if (sunnahError) {
      console.error("[useSunnahs] query failed:", sunnahError.message);
    }

    const statsMap = new Map<string, { current_streak: number; difficulty_effective: number }>();
    for (const stat of (statsRows ?? [])) {
      statsMap.set(stat.sunnah_id, {
        current_streak:       stat.current_streak       ?? 0,
        difficulty_effective: stat.difficulty_effective ?? 3,
      });
    }

    const doneSet = new Set<string>((completions ?? []).map((c: any) => c.sunnah_id));

    const newGroups: SunnahGroups = { morning: [], daily: [], evening: [], night: [] };
    let anchor: string | null = null;

    for (const row of (sunnahRows ?? [])) {
      const s = Array.isArray(row.sunnahs) ? row.sunnahs[0] : row.sunnahs;
      if (!s) continue;

      const stats = statsMap.get(row.sunnah_id);
      const sunnah: ActiveSunnah = {
        user_sunnah_id:       row.id,
        sunnah_id:            row.sunnah_id,
        slug:                 s.slug,
        name_en:              s.name_en,
        name_ar:              s.name_ar,
        time_of_day:          s.time_of_day,
        estimated_seconds:    s.estimated_seconds,
        is_anchor:            row.is_anchor,
        position:             row.position,
        current_streak:       stats?.current_streak       ?? 0,
        difficulty_effective: stats?.difficulty_effective ?? 3,
      };

      newGroups[toGroup(s.time_of_day)].push(sunnah);
      if (row.is_anchor) anchor = row.sunnah_id;
    }

    const total = Object.values(newGroups).reduce((acc, g) => acc + g.length, 0);

    const weekDates = new Set<string>(
      (weekRows ?? []).map((r: any) => r.completed_date as string)
    );

    setGroups(newGroups);
    setCompletedIds(doneSet);
    setActiveDates(weekDates);
    setAnchorId(anchor);
    setTotalCount(total);
    setCurrentStreak(streakRow?.current_streak  ?? 0);
    setLongestStreak(streakRow?.longest_streak  ?? 0);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  // Auto-reload when the Hijri day boundary crosses (Maghrib passes).
  // Checks every 30 s — no need for second-level precision here.
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

  // ── Complete ─────────────────────────────────────────────────────────────
  const complete = useCallback(async (sunnahId: string) => {
    if (!user) return;
    const today = getEffectiveDate(maghribRef.current);

    setCompletedIds((prev) => new Set([...prev, sunnahId]));
    // Immediately add today to the week strip — no need to reload.
    setActiveDates((prev) => new Set([...prev, today]));

    await supabase.from("daily_completions").upsert(
      { user_id: user.id, sunnah_id: sunnahId, completed_date: today },
      { onConflict: "user_id,sunnah_id,completed_date" }
    );

    await supabase.rpc("record_sunnah_completion", {
      p_user_id:   user.id,
      p_sunnah_id: sunnahId,
    });

    await supabase.rpc("update_user_streak", {
      p_user_id:        user.id,
      p_effective_date: today,   // ← pass Hijri-adjusted date
    });

    const { data: fresh } = await supabase
      .from("user_streaks")
      .select("current_streak, longest_streak")
      .eq("user_id", user.id)
      .maybeSingle();
    if (fresh) {
      setCurrentStreak(fresh.current_streak ?? 0);
      setLongestStreak(fresh.longest_streak ?? 0);
    }
  }, [user?.id]);

  // ── Uncomplete ───────────────────────────────────────────────────────────
  const uncomplete = useCallback(async (sunnahId: string) => {
    if (!user) return;
    const today = getEffectiveDate(maghribRef.current);

    // Optimistic update — MUST use the functional updater form so that rapid
    // unchecks don't read stale closure state. Each updater receives the latest
    // committed state, so unchecking A then B always yields the correct set.
    //
    // For activeDates we compute a snapshot separately: this is fine because
    // activeDates only matters for the visual week strip, not for correctness.
    const willBeEmpty = completedIds.size <= 1 && completedIds.has(sunnahId);

    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.delete(sunnahId);
      return next;
    });

    if (willBeEmpty) {
      // Last completion today removed — pull today off the week strip.
      setActiveDates((prev) => {
        const nd = new Set(prev);
        nd.delete(today);
        return nd;
      });
    }

    // Delete the completion record
    await supabase
      .from("daily_completions")
      .delete()
      .eq("user_id", user.id)
      .eq("sunnah_id", sunnahId)
      .eq("completed_date", today);

    // Recompute global streak and per-sunnah streak in parallel
    await Promise.all([
      supabase.rpc("recompute_user_streak", {
        p_user_id:        user.id,
        p_effective_date: today,
      }),
      supabase.rpc("recompute_sunnah_stats", {
        p_user_id:   user.id,
        p_sunnah_id: sunnahId,
      }),
    ]);

    // Refresh global streak display
    const { data: freshGlobal } = await supabase
      .from("user_streaks")
      .select("current_streak, longest_streak")
      .eq("user_id", user.id)
      .maybeSingle();
    if (freshGlobal) {
      setCurrentStreak(freshGlobal.current_streak ?? 0);
      setLongestStreak(freshGlobal.longest_streak ?? 0);
    }

    // Surgically update the per-sunnah streak in the groups state
    const { data: freshSunnah } = await supabase
      .from("user_sunnah_stats")
      .select("current_streak")
      .eq("user_id", user.id)
      .eq("sunnah_id", sunnahId)
      .maybeSingle();
    if (freshSunnah) {
      setGroups((prev) => {
        const next = { ...prev } as typeof prev;
        for (const key of Object.keys(next) as GroupKey[]) {
          next[key] = next[key].map((s) =>
            s.sunnah_id === sunnahId
              ? { ...s, current_streak: freshSunnah.current_streak ?? 0 }
              : s
          );
        }
        return next;
      });
    }
  }, [user?.id]);

  return {
    groups,
    completedIds,
    activeDates,
    anchorId,
    loading,
    totalCount,
    doneCount:     completedIds.size,
    currentStreak,
    longestStreak,
    complete,
    uncomplete,
    reload: load,
  };
}
