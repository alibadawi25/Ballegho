/**
 * SettingsContext — user preferences (language, theme, prayer calc method).
 *
 * Persists all preferences to AsyncStorage so they survive app restarts.
 * Exposes both the raw preference ("system" / "en" / "ar") AND the resolved
 * value (the actual language/isDark that components should render).
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 *   // Most components — use useLang() which builds on top of useSettings()
 *   const { lang, t, isRTL, isDark } = useLang();
 *
 *   // Settings screen — needs the raw pref + setter to show the UI
 *   const { langPref, setLangPref, themePref, setThemePref } = useSettings();
 *
 * ─── Resolved values ──────────────────────────────────────────────────────────
 *
 *   lang   — "ar" | "en"   (never "system"; resolved at runtime)
 *   isDark — boolean        (resolved from theme pref + device scheme)
 *
 * ─── AsyncStorage keys ───────────────────────────────────────────────────────
 *
 *   @ballegho/lang        — "ar" | "en" | "system"
 *   @ballegho/theme       — "light" | "dark" | "system"
 *   @ballegho/calcMethod  — CalcMethod string
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme as useDeviceScheme } from "react-native";
import { getLocales } from "expo-localization";
import type { Lang } from "@/constants/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThemePref  = "light" | "dark" | "system";
export type LangPref   = "ar" | "en" | "system";

/** Per-type reminder switches. `enabled` is the master toggle. */
export interface NotifPrefs {
  enabled:  boolean;  // master on/off
  morning:  boolean;  // Fajr "good morning" nudge
  evening:  boolean;  // evening adhkār (after ʿAṣr)
  night:    boolean;  // sleeping adhkār (after ʿIshāʾ)
  streak:   boolean;  // "seal your streak" before Maghrib
  occasion: boolean;  // Friday al-Kahf · Mon/Thu fast eve
}
export type NotifKey = keyof NotifPrefs;

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  enabled: true, morning: true, evening: true, night: true, streak: true, occasion: true,
};

/**
 * Prayer time calculation methods from the adhan library.
 * "auto" = detect from device location country code.
 */
export type CalcMethod =
  | "auto"
  | "MuslimWorldLeague"
  | "UmmAlQura"
  | "Egyptian"
  | "Kuwait"
  | "Qatar"
  | "Dubai"
  | "Turkey"
  | "Karachi"
  | "NorthAmerica"
  | "Singapore"
  | "Tehran";

interface SettingsState {
  // Raw prefs (what the user explicitly chose, including "system")
  langPref:    LangPref;
  themePref:   ThemePref;
  calcMethod:  CalcMethod;
  notifPrefs:  NotifPrefs;
  setLangPref:   (v: LangPref)   => void;
  setThemePref:  (v: ThemePref)  => void;
  setCalcMethod: (v: CalcMethod) => void;
  setNotifPref:  (k: NotifKey, v: boolean) => void;
  // Resolved values (never "system"; ready to use in render)
  lang:   Lang;
  isDark: boolean;
}

// ─── AsyncStorage keys ────────────────────────────────────────────────────────

const LANG_KEY   = "@ballegho/lang";
const THEME_KEY  = "@ballegho/theme";
const CALC_KEY   = "@ballegho/calcMethod";
const NOTIF_KEY  = "@ballegho/notifPrefs";

// ─── Context ──────────────────────────────────────────────────────────────────

const Ctx = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useDeviceScheme();
  // Use the first locale reported by the OS to resolve "system" language
  const deviceLang   = getLocales()[0]?.languageCode ?? "en";

  const [langPref,   setLangPrefState]   = useState<LangPref>("system");
  const [themePref,  setThemePrefState]  = useState<ThemePref>("system");
  const [calcMethod, setCalcMethodState] = useState<CalcMethod>("auto");
  const [notifPrefs, setNotifPrefsState] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);
  const [loaded, setLoaded] = useState(false);

  // Load all prefs from AsyncStorage in a single batch read
  useEffect(() => {
    AsyncStorage.multiGet([LANG_KEY, THEME_KEY, CALC_KEY, NOTIF_KEY]).then((pairs) => {
      setLangPrefState( (pairs[0][1] as LangPref   | null) ?? "system");
      setThemePrefState((pairs[1][1] as ThemePref  | null) ?? "system");
      setCalcMethodState((pairs[2][1] as CalcMethod | null) ?? "auto");
      // Merge stored notif prefs over defaults so new keys default to on.
      try {
        const stored = pairs[3][1] ? JSON.parse(pairs[3][1] as string) : {};
        setNotifPrefsState({ ...DEFAULT_NOTIF_PREFS, ...stored });
      } catch { setNotifPrefsState(DEFAULT_NOTIF_PREFS); }
      setLoaded(true);
    });
  }, []);

  // ── Setters (update state + persist) ────────────────────────────────────────

  const setLangPref = (v: LangPref) => {
    setLangPrefState(v);
    AsyncStorage.setItem(LANG_KEY, v);
  };
  const setThemePref = (v: ThemePref) => {
    setThemePrefState(v);
    AsyncStorage.setItem(THEME_KEY, v);
  };
  const setCalcMethod = (v: CalcMethod) => {
    setCalcMethodState(v);
    AsyncStorage.setItem(CALC_KEY, v);
  };
  const setNotifPref = (k: NotifKey, v: boolean) => {
    setNotifPrefsState((prev) => {
      const next = { ...prev, [k]: v };
      AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      return next;
    });
  };

  // ── Resolved values ─────────────────────────────────────────────────────────

  const lang: Lang =
    langPref === "system"
      ? deviceLang === "ar" ? "ar" : "en"
      : langPref;

  const isDark =
    themePref === "system"
      ? deviceScheme === "dark"
      : themePref === "dark";

  // Block render until AsyncStorage is ready so the UI never flickers
  if (!loaded) return null;

  return (
    <Ctx.Provider value={{
      langPref, themePref, calcMethod, notifPrefs,
      setLangPref, setThemePref, setCalcMethod, setNotifPref,
      lang, isDark,
    }}>
      {children}
    </Ctx.Provider>
  );
}

/** Must be called inside <SettingsProvider>. Throws if used outside it. */
export function useSettings(): SettingsState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSettings must be called inside <SettingsProvider>");
  return ctx;
}
