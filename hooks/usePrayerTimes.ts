import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { Coordinates, CalculationMethod, PrayerTimes } from "adhan";
import { useSettings, type CalcMethod } from "@/contexts/SettingsContext";

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export interface PrayerEntry {
  key: PrayerKey;
  time: Date;
}

export interface PrayerTimesState {
  prayers: PrayerEntry[];
  nextPrayer: PrayerEntry | null;
  minutesUntil: number;
  secondsUntil: number; // total seconds until next prayer
  /** The prayer whose adhān came within the last 30 min (the "now" window),
   *  or null. Lets the UI keep showing the just-entered prayer + how long ago. */
  currentPrayer: PrayerEntry | null;
  /** Whole minutes since `currentPrayer`'s adhān (0 when none). */
  minutesSincePrayer: number;
  /** Total seconds since `currentPrayer`'s adhān (0 when none) — for the -MM:SS clock. */
  secondsSincePrayer: number;
  city: string | null;
  resolvedMethod: CalcMethod | null;
  loading: boolean;
  permissionDenied: boolean;
}

/** How long after a prayer's adhān it stays the "current" prayer. */
const CURRENT_PRAYER_WINDOW_MIN = 30;

// ISO 3166-1 alpha-2 country → best calculation method
const COUNTRY_METHOD: Record<string, CalcMethod> = {
  // Arabian Peninsula — Umm Al-Qura (Mecca-based)
  SA: "UmmAlQura", YE: "UmmAlQura", OM: "UmmAlQura",
  // Gulf states
  AE: "Dubai", KW: "Kuwait", QA: "Qatar", BH: "Kuwait",
  // North Africa
  EG: "Egyptian", LY: "Egyptian", SD: "Egyptian",
  DZ: "MuslimWorldLeague", MA: "MuslimWorldLeague", TN: "MuslimWorldLeague",
  // Levant & Iraq
  JO: "MuslimWorldLeague", SY: "MuslimWorldLeague",
  IQ: "MuslimWorldLeague", LB: "MuslimWorldLeague", PS: "MuslimWorldLeague",
  // South & Central Asia
  PK: "Karachi", BD: "Karachi", AF: "Karachi",
  // Iran
  IR: "Tehran",
  // Turkey
  TR: "Turkey",
  // Southeast Asia
  MY: "Singapore", SG: "Singapore", ID: "Singapore",
  // North America
  US: "NorthAmerica", CA: "NorthAmerica",
  // Western Europe
  GB: "MuslimWorldLeague", FR: "MuslimWorldLeague", DE: "MuslimWorldLeague",
};

function methodForCountry(isoCode: string | null | undefined): CalcMethod {
  if (!isoCode) return "MuslimWorldLeague";
  return COUNTRY_METHOD[isoCode.toUpperCase()] ?? "MuslimWorldLeague";
}

function getParams(method: CalcMethod, countryCode?: string | null) {
  const resolved: CalcMethod =
    method === "auto" ? methodForCountry(countryCode) : method;
  switch (resolved) {
    case "UmmAlQura":    return CalculationMethod.UmmAlQura();
    case "Egyptian":     return CalculationMethod.Egyptian();
    case "Kuwait":       return CalculationMethod.Kuwait();
    case "Qatar":        return CalculationMethod.Qatar();
    case "Dubai":        return CalculationMethod.Dubai();
    case "Turkey":       return CalculationMethod.Turkey();
    case "Karachi":      return CalculationMethod.Karachi();
    case "NorthAmerica": return CalculationMethod.NorthAmerica();
    case "Singapore":    return CalculationMethod.Singapore();
    case "Tehran":       return CalculationMethod.Tehran();
    default:             return CalculationMethod.MuslimWorldLeague();
  }
}

export function usePrayerTimes(): PrayerTimesState & { retry: () => void } {
  const { calcMethod } = useSettings();
  const [retryCount, setRetryCount] = useState(0);

  const [state, setState] = useState<PrayerTimesState>({
    prayers: [],
    nextPrayer: null,
    minutesUntil: 0,
    secondsUntil: 0,
    currentPrayer: null,
    minutesSincePrayer: 0,
    secondsSincePrayer: 0,
    city: null,
    resolvedMethod: null,
    loading: true,
    permissionDenied: false,
  });

  const retry = () => {
    setState((s) => ({ ...s, loading: true, permissionDenied: false }));
    setRetryCount((n) => n + 1);
  };

  // Re-run whenever calcMethod changes
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    async function load() {
      setState((s) => ({ ...s, loading: true }));

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setState((s) => ({ ...s, loading: false, permissionDenied: true }));
        return;
      }

      let loc: Location.LocationObject;
      try {
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch {
        // Browser geolocation denied or unavailable (common on web)
        setState((s) => ({ ...s, loading: false, permissionDenied: true }));
        return;
      }

      let city: string | null = null;
      let countryCode: string | null = null;
      try {
        const [geo] = await Location.reverseGeocodeAsync({
          latitude:  loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        city        = geo?.city ?? geo?.district ?? geo?.region ?? null;
        countryCode = geo?.isoCountryCode ?? null;
      } catch {
        city = null;
        countryCode = null;
      }

      const coords = new Coordinates(loc.coords.latitude, loc.coords.longitude);
      const params = getParams(calcMethod, countryCode);
      const resolvedMethod: CalcMethod =
        calcMethod === "auto" ? methodForCountry(countryCode) : calcMethod;

      function compute() {
        const now = new Date();
        const pt  = new PrayerTimes(coords, now, params);

        const prayers: PrayerEntry[] = [
          { key: "fajr",    time: pt.fajr    },
          { key: "dhuhr",   time: pt.dhuhr   },
          { key: "asr",     time: pt.asr     },
          { key: "maghrib", time: pt.maghrib },
          { key: "isha",    time: pt.isha    },
        ];

        let next = prayers.find((p) => p.time > now) ?? null;

        // After Isha — wrap to tomorrow's Fajr
        if (!next) {
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const ptTomorrow = new PrayerTimes(coords, tomorrow, params);
          next = { key: "fajr", time: ptTomorrow.fajr };
        }

        const diff = next.time.getTime() - now.getTime();
        const secondsUntil = Math.max(0, Math.ceil(diff / 1000));
        const minutesUntil = Math.ceil(diff / 60000);

        // The most recent prayer whose adhān has passed today. If it was within
        // the last 30 min, treat it as the "current" prayer so the UI keeps
        // showing it (with minutes-since) instead of immediately flipping to next.
        const passed = prayers.filter((p) => p.time.getTime() <= now.getTime());
        const lastPassed = passed.length ? passed[passed.length - 1] : null;
        const sinceMs = lastPassed ? now.getTime() - lastPassed.time.getTime() : Infinity;
        const currentPrayer =
          lastPassed && sinceMs <= CURRENT_PRAYER_WINDOW_MIN * 60_000 ? lastPassed : null;
        const minutesSincePrayer = currentPrayer ? Math.floor(sinceMs / 60_000) : 0;
        const secondsSincePrayer = currentPrayer ? Math.floor(sinceMs / 1000) : 0;

        setState({ prayers, nextPrayer: next, minutesUntil, secondsUntil, currentPrayer, minutesSincePrayer, secondsSincePrayer, city, resolvedMethod, loading: false, permissionDenied: false });
      }

      compute();
      // 1-second tick so the countdown stays live (computation is trivial)
      interval = setInterval(compute, 1000);
    }

    load();
    return () => clearInterval(interval);
  }, [calcMethod, retryCount]);

  return { ...state, retry };
}
