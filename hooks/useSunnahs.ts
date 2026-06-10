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
import { useSync, useSyncEffect } from "@/contexts/SyncContext";
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
  interaction_type:    string;        // 'check' | 'counter' | 'playlist'
  repetitions:         number | null; // target for 'counter'
  is_anchor:           boolean;
  position:            number;
  current_streak:      number;
  difficulty_effective: number;
}

/** Per-sunnah partial progress for multi-step sunnahs (counter / playlist).
 *  done/total are "units": reps for a counter, sub-items for a playlist. */
export interface SunnahProgress {
  done:  number;
  total: number;
  kind:  "counter" | "playlist";
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
  const { emit } = useSync();

  // ── Stable ref so callbacks always see the current Maghrib without being
  //    recreated every second as the prayer context ticks.
  const maghribRef = useRef<Date | null>(maghribTime ?? null);
  maghribRef.current = maghribTime ?? null;

  // Hijri date derived from the *prop* (not the ref). It changes only when the
  // day boundary flips — including the cold-start case where the shared
  // PrayerTimesContext resolves Maghrib *after* the first render and pushes us
  // into the next Hijri day. Safe to use as an effect dependency: it's a date
  // *string*, so it doesn't churn as the live countdown ticks every second.
  const effectiveDate = getEffectiveDate(maghribTime ?? null);
  const effectiveDateRef = useRef(effectiveDate);

  const [groups,         setGroups]         = useState<SunnahGroups>({ morning: [], daily: [], evening: [], night: [] });
  const [progress,       setProgress]       = useState<Record<string, SunnahProgress>>({});
  const [completedIds,   setCompletedIds]   = useState<Set<string>>(new Set());
  const [activeDates,    setActiveDates]    = useState<Set<string>>(new Set());
  const [anchorIds,      setAnchorIds]      = useState<Set<string>>(new Set());
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
      { data: sessionRow },
      { data: adhkarItemRows },
    ] = await Promise.all([
      supabase
        .from("user_sunnahs")
        .select(`
          id, sunnah_id, is_anchor, position,
          sunnahs ( slug, name_en, name_ar, time_of_day, estimated_seconds, interaction_type, repetitions )
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

      // 6. Today's counter/playlist counts (jsonb keyed by sunnah_id OR item id)
      supabase
        .from("adhkar_sessions")
        .select("counts")
        .eq("user_id", user.id)
        .eq("session_date", today)
        .maybeSingle(),

      // 7. Playlist sub-items (tiny table) — to compute "3/7" partial progress
      supabase
        .from("adhkar_items")
        .select("id, playlist_slug, repetitions"),
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
    const anchors = new Set<string>();

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
        interaction_type:     s.interaction_type ?? "check",
        repetitions:          s.repetitions ?? null,
        is_anchor:            row.is_anchor,
        position:             row.position,
        current_streak:       stats?.current_streak       ?? 0,
        difficulty_effective: stats?.difficulty_effective ?? 3,
      };

      newGroups[toGroup(s.time_of_day)].push(sunnah);
      if (row.is_anchor) anchors.add(row.sunnah_id);
    }

    // Order each group: anchors first, then easiest (lowest difficulty), then
    // by original position as a stable tiebreak.
    for (const key of Object.keys(newGroups) as GroupKey[]) {
      newGroups[key].sort((a, b) =>
        (Number(b.is_anchor) - Number(a.is_anchor)) ||
        (a.difficulty_effective - b.difficulty_effective) ||
        (a.position - b.position)
      );
    }

    const total = Object.values(newGroups).reduce((acc, g) => acc + g.length, 0);

    // ── Partial progress for multi-step sunnahs (counter / playlist) ──────────
    // counts jsonb is keyed by sunnah_id (single counters) AND by item id
    // (playlist sub-items); the two never collide (distinct uuids).
    const counts = (sessionRow?.counts as Record<string, number> | undefined) ?? {};
    const itemsBySlug = new Map<string, { id: string; repetitions: number }[]>();
    for (const it of (adhkarItemRows ?? [])) {
      const arr = itemsBySlug.get(it.playlist_slug) ?? [];
      arr.push({ id: it.id, repetitions: it.repetitions ?? 1 });
      itemsBySlug.set(it.playlist_slug, arr);
    }
    const progressMap: Record<string, SunnahProgress> = {};
    for (const key of Object.keys(newGroups) as GroupKey[]) {
      for (const sn of newGroups[key]) {
        if (sn.interaction_type === "counter" && sn.repetitions) {
          progressMap[sn.sunnah_id] = {
            done:  Math.min(counts[sn.sunnah_id] ?? 0, sn.repetitions),
            total: sn.repetitions,
            kind:  "counter",
          };
        } else if (sn.interaction_type === "playlist") {
          const items = itemsBySlug.get(sn.slug) ?? [];
          progressMap[sn.sunnah_id] = {
            done:  items.filter((it) => (counts[it.id] ?? 0) >= it.repetitions).length,
            total: items.length,
            kind:  "playlist",
          };
        }
      }
    }

    const weekDates = new Set<string>(
      (weekRows ?? []).map((r: any) => r.completed_date as string)
    );

    setGroups(newGroups);
    setProgress(progressMap);
    setCompletedIds(doneSet);
    setActiveDates(weekDates);
    setAnchorIds(anchors);
    setTotalCount(total);
    setCurrentStreak(streakRow?.current_streak  ?? 0);
    setLongestStreak(streakRow?.longest_streak  ?? 0);
    setLoading(false);
  }, [user?.id]);

  // Run on mount, on user change, and whenever the effective Hijri date flips.
  // The date-flip case covers the cold-start race: Maghrib resolves *after* the
  // first render, so the initial load() ran with the pre-Maghrib date. Without
  // this the Today checklist shows yesterday's completions until the 30 s
  // interval below fires or the tab is re-focused.
  useEffect(() => {
    effectiveDateRef.current = effectiveDate;
    load();
  }, [load, effectiveDate]);

  // Reload if the active practice list changed from elsewhere (e.g. a future
  // add/remove screen) so the Today checklist never lags behind the DB.
  useSyncEffect(["sunnahs"], load);

  // Auto-reload when the Hijri day boundary crosses (Maghrib passes) while the
  // app stays open and the prop doesn't re-render. Checks every 30 s — no need
  // for second-level precision here.
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

    // Signal other screens (Progress/Streaks heatmap, etc.) that a completion
    // landed. Nūr is awarded server-side here too, so refresh that balance.
    emit("completions", "nur");
  }, [user?.id, emit]);

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

    emit("completions");
  }, [user?.id, emit]);

  // Count ONLY active sunnahs as "done today" — spontaneous one-off completions
  // (sunnahs not in the active list) live in completedIds too, but they must not
  // inflate the day's progress or trip the "all done" celebration.
  const activeIds = new Set<string>();
  for (const k of Object.keys(groups) as GroupKey[]) {
    for (const sdef of groups[k]) activeIds.add(sdef.sunnah_id);
  }
  let activeDoneCount = 0;
  for (const id of completedIds) if (activeIds.has(id)) activeDoneCount++;

  return {
    groups,
    progress,
    completedIds,
    activeDates,
    anchorIds,
    loading,
    totalCount,
    doneCount:     activeDoneCount,
    currentStreak,
    longestStreak,
    complete,
    uncomplete,
    reload: load,
  };
}
