/**
 * OnboardingContext — ephemeral onboarding state.
 *
 * Holds the user's choices as they move through steps 0–6.
 * This is in-memory only; it is written to Supabase in step6.tsx once the
 * user creates their account. There is nothing to persist here because the
 * user has no account yet (and therefore no user_id to key data against).
 *
 * ─── State summary ────────────────────────────────────────────────────────────
 *
 *   wakeTime         — Date with hour/minute set (defaults: 06:30)
 *   sleepTime        — Date with hour/minute set (defaults: 23:00)
 *   consistencyLevel — "beginner" | "some" | "consistent" (step3)
 *   selectedIds      — up to 3 sunnah UUIDs chosen in step4
 *   anchorId         — the single "anchor" sunnah chosen in step5
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 *   const { selectedIds, toggleSunnah, canSelectMore } = useOnboarding();
 *
 * ─── Persistence ──────────────────────────────────────────────────────────────
 *
 *   The draft is mirrored to AsyncStorage so leaving onboarding (e.g. tapping
 *   "Sign in", a reload, or backgrounding the app) and returning does NOT wipe
 *   the user's progress — they pick up where they left off instead of starting
 *   over. `reset()` clears it (called by step6 on success and on sign-out).
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const ONBOARDING_DRAFT_KEY = "@ballegho/onboarding-draft";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConsistencyLevel = "beginner" | "some" | "consistent";

/** Shape of a sunnah row returned by the step4 Supabase query. */
export interface SunnahOption {
  id:              string;
  slug:            string;
  name_en:         string;
  name_ar:         string;
  hadith_text_en:  string | null;
  hadith_text_ar:  string | null;
  hadith_source:   string | null;
  estimated_seconds: number;
  difficulty_base: number;
  category:        string;
  time_of_day:     string;
}

interface OnboardingState {
  wakeTime:         Date;
  sleepTime:        Date;
  consistencyLevel: ConsistencyLevel | null;
  selectedIds:      string[];   // sunnah IDs selected in step4
  anchorId:         string | null;
  setWakeTime:      (d: Date) => void;
  setSleepTime:     (d: Date) => void;
  setConsistency:   (l: ConsistencyLevel) => void;
  /** Adds or removes a sunnah from selectedIds (up to maxSunnahs). */
  toggleSunnah:     (id: string) => void;
  setAnchor:        (id: string) => void;
  /** Max selectable — higher for already-consistent users (set in step3). */
  maxSunnahs:       number;
  /** True when the user can still select more sunnahs (< maxSunnahs). */
  canSelectMore:    boolean;
  /** Clears the in-memory state AND the persisted draft (call on completion). */
  reset:            () => void;
}

// ─── Default times ────────────────────────────────────────────────────────────
// These are sensible defaults shown to users before they customise.

const DEFAULT_WAKE_HOUR  = 6;
const DEFAULT_WAKE_MIN   = 30;  // 06:30
const DEFAULT_SLEEP_HOUR = 23;
const DEFAULT_SLEEP_MIN  = 0;   // 23:00

// App philosophy: start small. Beginners / "some habits" start with 3. Users who
// say they're already consistent (step3) can mark the several sunnahs they already
// keep, seeding a larger baseline the unlock engine then grows from.
const MAX_BEGINNER   = 3;
const MAX_EXPERIENCED = 7;
const maxFor = (level: ConsistencyLevel | null) =>
  level === "consistent" ? MAX_EXPERIENCED : MAX_BEGINNER;

// ─── Context ──────────────────────────────────────────────────────────────────

const Ctx = createContext<OnboardingState | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  // Build default Date objects at render time so they reflect "today"
  const defaultWake  = new Date();
  defaultWake.setHours(DEFAULT_WAKE_HOUR,  DEFAULT_WAKE_MIN,  0, 0);
  const defaultSleep = new Date();
  defaultSleep.setHours(DEFAULT_SLEEP_HOUR, DEFAULT_SLEEP_MIN, 0, 0);

  const [wakeTime,         setWakeTime]   = useState<Date>(defaultWake);
  const [sleepTime,        setSleepTime]  = useState<Date>(defaultSleep);
  const [consistencyLevel, setConsistency] = useState<ConsistencyLevel | null>(null);
  const [selectedIds,      setSelected]   = useState<string[]>([]);
  const [anchorId,         setAnchor]     = useState<string | null>(null);

  const maxSunnahs = maxFor(consistencyLevel);

  function toggleSunnah(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) {
        // Deselecting the current anchor clears it
        if (anchorId === id) setAnchor(null);
        return prev.filter((x) => x !== id);
      }
      // Hard cap — silently ignore if already at max
      if (prev.length >= maxSunnahs) return prev;
      return [...prev, id];
    });
  }

  // ── Hydrate the draft once on mount; then save on every change. The
  //    `hydrated` gate prevents the initial defaults from clobbering a saved
  //    draft before it has loaded.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_DRAFT_KEY).then((raw) => {
      if (raw) {
        try {
          const d = JSON.parse(raw);
          if (d.wake)  { const w = new Date(); w.setHours(d.wake.h,  d.wake.m,  0, 0); setWakeTime(w); }
          if (d.sleep) { const s = new Date(); s.setHours(d.sleep.h, d.sleep.m, 0, 0); setSleepTime(s); }
          if (d.consistencyLevel)        setConsistency(d.consistencyLevel);
          if (Array.isArray(d.selectedIds)) setSelected(d.selectedIds);
          if (d.anchorId)                setAnchor(d.anchorId);
        } catch { /* ignore corrupt draft */ }
      }
    }).finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify({
      wake:  { h: wakeTime.getHours(),  m: wakeTime.getMinutes()  },
      sleep: { h: sleepTime.getHours(), m: sleepTime.getMinutes() },
      consistencyLevel, selectedIds, anchorId,
    })).catch(() => {});
  }, [hydrated, wakeTime, sleepTime, consistencyLevel, selectedIds, anchorId]);

  function reset() {
    AsyncStorage.removeItem(ONBOARDING_DRAFT_KEY).catch(() => {});
    setWakeTime(defaultWake);
    setSleepTime(defaultSleep);
    setConsistency(null);
    setSelected([]);
    setAnchor(null);
  }

  return (
    <Ctx.Provider value={{
      wakeTime,
      sleepTime,
      consistencyLevel,
      selectedIds,
      anchorId,
      setWakeTime,
      setSleepTime,
      setConsistency,
      toggleSunnah,
      setAnchor,
      maxSunnahs,
      canSelectMore: selectedIds.length < maxSunnahs,
      reset,
    }}>
      {children}
    </Ctx.Provider>
  );
}

/** Must be called inside <OnboardingProvider>. Throws if used outside it. */
export function useOnboarding(): OnboardingState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOnboarding must be called inside <OnboardingProvider>");
  return ctx;
}
