/**
 * NurContext — a SINGLE shared Nūr balance + unlocks for the whole app.
 *
 * Why a context (not a per-screen hook): Nūr is earned/spent on several screens
 * (share on detail, completions on Today, unlocks in the theme picker). A shared
 * provider means the header chip and every other consumer update live the moment
 * the balance changes — instead of each screen holding its own stale copy.
 *
 * Live-update paths:
 *   • awardShare() / unlock() set the balance directly from the RPC result.
 *   • reload() re-fetches — call it after a completion (which awards Nūr
 *     server-side) and it also runs automatically when the app returns to the
 *     foreground.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useSyncEffect } from "@/contexts/SyncContext";
import { supabase } from "@/lib/supabase";

const keyOf = (itemType: string, itemKey: string) => `${itemType}:${itemKey}`;

interface NurState {
  balance:    number;
  loading:    boolean;
  owns:       (itemType: string, itemKey: string) => boolean;
  awardShare: () => Promise<void>;
  unlock:     (itemType: string, itemKey: string) => Promise<boolean>;
  reload:     () => Promise<void>;
  /** Set whenever the balance grows — drives the floating "+N" reward popup. */
  reward:     { amount: number; nonce: number } | null;
}

const Ctx = createContext<NurState | null>(null);

export function NurProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [unlocks, setUnlocks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Reward popup: fire only on genuine increases (not the initial load and not
  // spends/refreshes that leave the balance unchanged or lower).
  const [reward, setReward] = useState<{ amount: number; nonce: number } | null>(null);
  const prevBalance = useRef<number | null>(null);
  useEffect(() => {
    if (prevBalance.current === null) { prevBalance.current = balance; return; }
    if (balance > prevBalance.current) {
      setReward({ amount: balance - prevBalance.current, nonce: Date.now() });
    }
    prevBalance.current = balance;
  }, [balance]);

  const reload = useCallback(async () => {
    if (!user) { setBalance(0); setUnlocks(new Set()); setLoading(false); return; }
    const [{ data: pts }, { data: unl }] = await Promise.all([
      supabase.from("user_points").select("balance").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_unlocks").select("item_type, item_key").eq("user_id", user.id),
    ]);
    setBalance(pts?.balance ?? 0);
    setUnlocks(new Set((unl ?? []).map((u: any) => keyOf(u.item_type, u.item_key))));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { reload(); }, [reload]);

  // Any screen that awards/spends Nūr can emit("nur") and the balance refreshes
  // here — driving the header chip and the "+N" reward popup live.
  useSyncEffect(["nur"], reload);

  // Refetch when the app returns to the foreground (catches anything awarded
  // while backgrounded or on another device).
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") reload(); });
    return () => sub.remove();
  }, [reload]);

  const awardShare = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.rpc("award_share_nur", { p_user_id: user.id });
    if (typeof data === "number") setBalance(data);
  }, [user?.id]);

  const owns = useCallback(
    (itemType: string, itemKey: string) => unlocks.has(keyOf(itemType, itemKey)),
    [unlocks],
  );

  const unlock = useCallback(async (itemType: string, itemKey: string): Promise<boolean> => {
    if (!user) return false;
    const { data, error } = await supabase.rpc("unlock_cosmetic", {
      p_user_id: user.id, p_item_type: itemType, p_item_key: itemKey,
    });
    if (error || typeof data !== "number" || data < 0) return false;
    setBalance(data);
    setUnlocks((prev) => new Set(prev).add(keyOf(itemType, itemKey)));
    return true;
  }, [user?.id]);

  return (
    <Ctx.Provider value={{ balance, loading, owns, awardShare, unlock, reload, reward }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNur(): NurState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNur must be used inside <NurProvider>");
  return ctx;
}
