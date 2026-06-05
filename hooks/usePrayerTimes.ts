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
  city: string | null;
  resolvedMethod: CalcMethod | null;
  loading: boolean;
  permissionDenied: boolean;
}

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

        setState({ prayers, nextPrayer: next, minutesUntil, secondsUntil, city, resolvedMethod, loading: false, permissionDenied: false });
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
