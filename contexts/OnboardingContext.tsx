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
 * ─── Provider placement ───────────────────────────────────────────────────────
 *
 *   <OnboardingProvider> wraps the (onboarding) group layout so the context
 *   is destroyed when the user exits onboarding (either completing it or
 *   navigating to sign-in). This prevents stale data from leaking into
 *   subsequent onboarding runs.
 */

import React, { createContext, useContext, useState } from "react";

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
  /** Adds or removes a sunnah from selectedIds (max 3). */
  toggleSunnah:     (id: string) => void;
  setAnchor:        (id: string) => void;
  /** True when the user can still select more sunnahs (< 3 selected). */
  canSelectMore:    boolean;
}

// ─── Default times ────────────────────────────────────────────────────────────
// These are sensible defaults shown to users before they customise.

const DEFAULT_WAKE_HOUR  = 6;
const DEFAULT_WAKE_MIN   = 30;  // 06:30
const DEFAULT_SLEEP_HOUR = 23;
const DEFAULT_SLEEP_MIN  = 0;   // 23:00

const MAX_SUNNAHS = 3;          // app philosophy: start small, be consistent

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

  function toggleSunnah(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) {
        // Deselecting the current anchor clears it
        if (anchorId === id) setAnchor(null);
        return prev.filter((x) => x !== id);
      }
      // Hard cap — silently ignore if already at max
      if (prev.length >= MAX_SUNNAHS) return prev;
      return [...prev, id];
    });
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
      canSelectMore: selectedIds.length < MAX_SUNNAHS,
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
