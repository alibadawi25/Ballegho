/**
 * useAdhkarSession — drives a "playlist" sunnah (morning / evening adhkār).
 *
 * Loads the ordered `adhkar_items` for a playlist slug plus today's per-item
 * counts (stored in `adhkar_sessions.counts`, keyed by item id — the same jsonb
 * the single-dhikr detail counter uses, but with different keys so they never
 * collide). When every item reaches its `repetitions`, the parent sunnah is
 * marked complete for the day, feeding the normal streak machinery.
 *
 * Counts use the Hijri-adjusted effective date (see lib/islamicDate). Handlers
 * are plain functions (recreated each render) so they always read fresh state —
 * the item list is tiny, so the identity churn is irrelevant.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { getEffectiveDate } from "@/lib/islamicDate";

export interface AdhkarItem {
  id:              string;
  position:        number;
  arabic:          string;
  transliteration: string | null;
  translation_en:  string | null;
  reward_en:       string | null;
  reward_ar:       string | null;
  repetitions:     number;
  source:          string | null;
}

export function useAdhkarSession(slug: string | undefined, maghribTime?: Date | null) {
  const { user } = useAuth();

  const maghribRef = useRef<Date | null>(maghribTime ?? null);
  maghribRef.current = maghribTime ?? null;

  const [items,          setItems]          = useState<AdhkarItem[]>([]);
  const [counts,         setCounts]         = useState<Record<string, number>>({});
  const [parentSunnahId, setParentSunnahId] = useState<string | null>(null);
  const [parentNameEn,   setParentNameEn]   = useState("");
  const [parentNameAr,   setParentNameAr]   = useState("");
  const [doneToday,      setDoneToday]      = useState(false);
  const [loading,        setLoading]        = useState(true);

  // Full adhkar_sessions.counts object for today — so we merge our keys on
  // upsert without clobbering counts written by the single-dhikr detail counter.
  const countsRef = useRef<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!slug || !user) { setLoading(false); return; }
    setLoading(true);
    const today = getEffectiveDate(maghribRef.current);

    const [
      { data: itemRows },
      { data: parentRow },
      { data: sessionRow },
    ] = await Promise.all([
      supabase.from("adhkar_items").select("*").eq("playlist_slug", slug).order("position"),
      supabase.from("sunnahs").select("id, name_en, name_ar").eq("slug", slug).single(),
      supabase.from("adhkar_sessions").select("counts")
        .eq("user_id", user.id).eq("session_date", today).maybeSingle(),
    ]);

    const list = (itemRows ?? []) as AdhkarItem[];
    setItems(list);

    const pid = parentRow?.id ?? null;
    setParentSunnahId(pid);
    setParentNameEn(parentRow?.name_en ?? "");
    setParentNameAr(parentRow?.name_ar ?? "");

    countsRef.current = (sessionRow?.counts as Record<string, number> | undefined) ?? {};
    const itemCounts: Record<string, number> = {};
    for (const it of list) itemCounts[it.id] = countsRef.current[it.id] ?? 0;
    setCounts(itemCounts);

    if (pid) {
      const { data: completion } = await supabase.from("daily_completions")
        .select("sunnah_id")
        .eq("user_id", user.id).eq("sunnah_id", pid).eq("completed_date", today)
        .maybeSingle();
      setDoneToday(!!completion);
    }
    setLoading(false);
  }, [slug, user?.id]);

  useEffect(() => { load(); }, [load]);

  function persist(patch: Record<string, number>) {
    if (!user) return;
    countsRef.current = { ...countsRef.current, ...patch };
    supabase.from("adhkar_sessions").upsert(
      {
        user_id:      user.id,
        session_date: getEffectiveDate(maghribRef.current),
        counts:       countsRef.current,
        updated_at:   new Date().toISOString(),
      },
      { onConflict: "user_id,session_date" },
    ).then(({ error }) => { if (error) console.error("[adhkar] persist failed:", error.message); });
  }

  async function markParentDone() {
    if (!user || !parentSunnahId || doneToday) return;
    const today = getEffectiveDate(maghribRef.current);
    setDoneToday(true);
    await supabase.from("daily_completions").upsert(
      { user_id: user.id, sunnah_id: parentSunnahId, completed_date: today },
      { onConflict: "user_id,sunnah_id,completed_date" },
    );
    await Promise.all([
      supabase.rpc("record_sunnah_completion", { p_user_id: user.id, p_sunnah_id: parentSunnahId }),
      supabase.rpc("update_user_streak",        { p_user_id: user.id, p_effective_date: today }),
    ]);
  }

  function increment(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const cur = counts[itemId] ?? 0;
    if (cur >= item.repetitions) return; // capped at target
    const next = cur + 1;
    const updated = { ...counts, [itemId]: next };
    setCounts(updated);
    persist({ [itemId]: next });
    // If this completes the final remaining item, mark the parent done.
    const allNowDone = items.length > 0 && items.every((it) => (updated[it.id] ?? 0) >= it.repetitions);
    if (allNowDone) markParentDone();
  }

  function reset(itemId: string) {
    const updated = { ...counts, [itemId]: 0 };
    setCounts(updated);
    persist({ [itemId]: 0 });
  }

  const doneCount = items.filter((it) => (counts[it.id] ?? 0) >= it.repetitions).length;
  const allDone   = items.length > 0 && doneCount === items.length;
  // The active item is the first one not yet at its target (-1 when all done).
  const currentIndex = items.findIndex((it) => (counts[it.id] ?? 0) < it.repetitions);

  return {
    items, counts, loading, doneCount, allDone, doneToday, currentIndex,
    parentNameEn, parentNameAr,
    increment, reset, reload: load,
  };
}
