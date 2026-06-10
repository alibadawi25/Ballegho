/**
 * useSunnahLibrary — read-only catalogue of every sunnah in the app.
 *
 * Unlike `useSunnahs` (which returns only the signed-in user's *active*
 * practice list), this hook fetches the entire `sunnahs` master table so the
 * Sunnah Library screen can browse the full collection.
 *
 * It also fetches the user's active sunnah_ids so each library row can show an
 * unobtrusive "active" badge — purely informational. The library is browse-only
 * for now: it does NOT add, remove, or modify the user's practice list.
 *
 * ─── Return values ────────────────────────────────────────────────────────────
 *
 *   items   — every sunnah, ordered by sort_order, each tagged `is_active`
 *   loading — true during the initial fetch
 *   reload  — re-runs the fetch (call from useFocusEffect to refresh badges)
 */

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSyncEffect } from "@/contexts/SyncContext";
import { supabase } from "@/lib/supabase";

export interface LibrarySunnah {
  id:                string;
  slug:              string;
  name_en:           string;
  name_ar:           string;
  category:          string;
  time_of_day:       string;
  estimated_seconds: number;
  difficulty_base:   number;
  is_active:         boolean; // already in the user's practice list
}

export function useSunnahLibrary() {
  const { user } = useAuth();
  const [items,   setItems]   = useState<LibrarySunnah[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    // Master catalogue (public read) + the user's active ids (to flag rows).
    // sunnahs has no FK relationship needed here, so a single select is fine.
    const [{ data: sunnahRows, error }, { data: activeRows }] = await Promise.all([
      supabase
        .from("sunnahs")
        .select("id, slug, name_en, name_ar, category, time_of_day, estimated_seconds, difficulty_base")
        .order("sort_order"),
      user
        ? supabase
            .from("user_sunnahs")
            .select("sunnah_id")
            .eq("user_id", user.id)
            .eq("is_active", true)
        : Promise.resolve({ data: [] as { sunnah_id: string }[] }),
    ]);

    if (error) {
      console.error("[useSunnahLibrary] query failed:", error.message);
    }

    const activeSet = new Set((activeRows ?? []).map((r: any) => r.sunnah_id));

    setItems(
      (sunnahRows ?? []).map((s: any) => ({
        id:                s.id,
        slug:              s.slug,
        name_en:           s.name_en,
        name_ar:           s.name_ar,
        category:          s.category,
        time_of_day:       s.time_of_day,
        estimated_seconds: s.estimated_seconds,
        difficulty_base:   s.difficulty_base,
        is_active:         activeSet.has(s.id),
      }))
    );
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  // Stay live: when the active practice list changes anywhere (the coach
  // unlocks/pauses a sunnah on the Today tab), the "active" count + badges here
  // refresh immediately instead of waiting for this tab to be re-focused.
  useSyncEffect(["sunnahs"], load);

  return { items, loading, reload: load };
}
