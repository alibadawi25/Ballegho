/**
 * useAdaptiveCoach — the personalization "coach".
 *
 * Once per screen mount it asks the DB (`assess_practice`) what the user needs
 * right now and returns ONE recommendation:
 *
 *   unlock  — consistent with everything → offer a short list to pick from
 *   reduce  — established but slipping → offer to pause the weakest few
 *   recover — lapsed for a few days → offer a gentle restart on the anchor
 *   none    — nothing to nudge
 *
 * The user always chooses. Action callbacks commit the choice via dedicated
 * RPCs and clear the recommendation; the caller should reload its sunnah list.
 * See migration `adaptive_coach_engine`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export type CoachKind = "unlock" | "reduce" | "recover" | "none";

export interface CoachCandidate {
  id:               string;
  slug:             string;
  name_en:          string;
  name_ar:          string;
  rate?:            number;
  difficulty_base?: number;
  time_of_day?:     string;
}

export interface CoachRecommendation {
  kind:        CoachKind;
  candidates?: CoachCandidate[];
  active?:     number;
  gap?:        number;
  anchor?:     string | null;
}

export function useAdaptiveCoach(enabled: boolean) {
  const { user } = useAuth();
  const [rec, setRec]   = useState<CoachRecommendation | null>(null);
  const [busy, setBusy] = useState(false);
  const checkedRef = useRef(false);

  const assess = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc("assess_practice", { p_user_id: user.id });
    if (error) { console.error("[coach] assess failed:", error.message); return; }
    setRec((data as CoachRecommendation) ?? { kind: "none" });
  }, [user?.id]);

  useEffect(() => {
    if (!enabled || !user || checkedRef.current) return;
    checkedRef.current = true;
    assess();
  }, [enabled, user?.id, assess]);

  const dismiss = () => setRec({ kind: "none" });

  /** Commit an unlock pick. Returns true on success. */
  const pickUnlock = async (sunnahId: string): Promise<boolean> => {
    if (!user) return false;
    setBusy(true);
    const { data, error } = await supabase.rpc("unlock_pick_sunnah", {
      p_user_id: user.id, p_sunnah_id: sunnahId,
    });
    setBusy(false);
    dismiss();
    return !error && data === true;
  };

  /** Pause the chosen sunnahs (never the anchor). */
  const reduce = async (sunnahIds: string[]) => {
    if (!user || sunnahIds.length === 0) return;
    setBusy(true);
    await supabase.rpc("reduce_load", { p_user_id: user.id, p_sunnah_ids: sunnahIds });
    setBusy(false);
    dismiss();
  };

  /** Gentle restart — keep only the anchor active. */
  const recover = async () => {
    if (!user) return;
    setBusy(true);
    await supabase.rpc("recover_practice", { p_user_id: user.id });
    setBusy(false);
    dismiss();
  };

  return { rec, busy, pickUnlock, reduce, recover, dismiss, refetch: assess };
}
