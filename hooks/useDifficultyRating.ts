/**
 * useDifficultyRating
 *
 * Finds the first active sunnah the user has completed 3+ times but
 * never self-rated for difficulty. Shows a one-time prompt on the home screen.
 *
 * The original query used an `added_at` column (doesn't exist in user_sunnahs)
 * and nested user_sunnah_stats (no FK → PostgREST rejects it). Fixed by:
 *   - Dropping the added_at filter; completion count is a better signal anyway
 *   - Two separate queries merged by sunnah_id (same pattern as useSunnahs)
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export interface RatingSunnah {
  id:                   string;
  sunnah_id:            string;
  name_en:              string;
  name_ar:              string;
  difficulty_effective: number;
}

export function useDifficultyRating() {
  const { user } = useAuth();
  const [pending, setPending] = useState<RatingSunnah | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadPending();
  }, [user?.id]);

  async function loadPending() {
    // Edge case: called after sign-out — clear state and stop loading.
    if (!user) { setLoading(false); return; }
    setLoading(true);

    // 1. Active user_sunnahs + sunnah details (FK exists → works fine)
    const { data: sunnahRows } = await supabase
      .from("user_sunnahs")
      .select(`
        id,
        sunnah_id,
        sunnahs ( name_en, name_ar )
      `)
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (!sunnahRows || sunnahRows.length === 0) {
      setLoading(false);
      return;
    }

    // 2. Stats for all active sunnahs (separate query — no FK to user_sunnahs)
    const { data: statsRows } = await supabase
      .from("user_sunnah_stats")
      .select("sunnah_id, difficulty_self, difficulty_effective, total_completions")
      .eq("user_id", user.id)
      .in("sunnah_id", sunnahRows.map((r) => r.sunnah_id));

    // Build stats lookup
    const statsMap = new Map<string, {
      difficulty_self:      number | null;
      difficulty_effective: number;
      total_completions:    number;
    }>();
    for (const s of (statsRows ?? [])) {
      statsMap.set(s.sunnah_id, s);
    }

    // Find first sunnah: no self-rating AND >= 3 completions
    const unrated = sunnahRows.find((row) => {
      const stats = statsMap.get(row.sunnah_id);
      return !stats?.difficulty_self && (stats?.total_completions ?? 0) >= 3;
    });

    if (unrated) {
      const sunnah = Array.isArray(unrated.sunnahs) ? unrated.sunnahs[0] : unrated.sunnahs;
      const stats  = statsMap.get(unrated.sunnah_id);
      setPending({
        id:                   unrated.id,
        sunnah_id:            unrated.sunnah_id,
        name_en:              sunnah?.name_en ?? "",
        name_ar:              sunnah?.name_ar ?? "",
        difficulty_effective: stats?.difficulty_effective ?? 3,
      });
    } else {
      setPending(null);
    }

    setLoading(false);
  }

  async function submitRating(sunnahId: string, rating: number) {
    if (!user) return;

    await supabase
      .from("user_sunnah_stats")
      .upsert({
        user_id:             user.id,
        sunnah_id:           sunnahId,
        difficulty_self:     rating,
        difficulty_rated_at: new Date().toISOString(),
        updated_at:          new Date().toISOString(),
      }, { onConflict: "user_id,sunnah_id" });

    // Recompute difficulty blend (RPC may not exist yet — fail silently)
    try {
      await supabase.rpc("recompute_difficulty", {
        p_user_id:   user.id,
        p_sunnah_id: sunnahId,
      });
    } catch { /* RPC not yet deployed — ignore */ }

    setPending(null);
  }

  function dismiss() {
    setPending(null);
  }

  return { pending, loading, submitRating, dismiss };
}
