/**
 * PrayerTimesContext — single shared instance of usePrayerTimes.
 *
 * Without this, every component that needs prayer data (PrayerStrip, home
 * screen, useSunnahs) would each call usePrayerTimes() independently, firing
 * separate geolocation requests and running separate 1-second intervals.
 *
 * Mount <PrayerTimesProvider> inside <SettingsProvider> (usePrayerTimes reads
 * calcMethod from SettingsContext). The provider lives in (tabs)/_layout.tsx so
 * location is only requested once the user is authenticated and in the main app.
 */

import { createContext, useContext, type ReactNode } from "react";
import { usePrayerTimes, type PrayerTimesState } from "@/hooks/usePrayerTimes";

const DEFAULT: PrayerTimesState & { retry: () => void } = {
  prayers: [],
  nextPrayer: null,
  minutesUntil: 0,
  secondsUntil: 0,
  city: null,
  resolvedMethod: null,
  loading: true,
  permissionDenied: false,
  retry: () => {},
};

const PrayerTimesCtx = createContext(DEFAULT);

export function PrayerTimesProvider({ children }: { children: ReactNode }) {
  const value = usePrayerTimes();
  return <PrayerTimesCtx.Provider value={value}>{children}</PrayerTimesCtx.Provider>;
}

/** Use this everywhere instead of calling usePrayerTimes() directly. */
export function usePrayerCtx() {
  return useContext(PrayerTimesCtx);
}
