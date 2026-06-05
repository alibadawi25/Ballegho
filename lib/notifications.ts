/**
 * Notification helpers for Ballegho.
 *
 * All notifications are LOCAL (no remote push server needed for now).
 * They are scheduled once per day on app open and cancelled + rescheduled
 * when the app returns to the foreground the next day.
 *
 * Two daily notifications:
 *  1. Fajr nudge — 5 min after Fajr (gentle morning prompt)
 *  2. Maghrib streak warning — 90 min before Maghrib, only when the user
 *     has an active streak AND the anchor sunnah is not yet done today.
 *
 * Note: local notifications don't work in Expo Go (removed SDK 53+).
 * They work correctly in development builds and production.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const NOTIF_IDS = {
  fajrNudge:   "ballegho-fajr-nudge",
  maghribWarn: "ballegho-maghrib-warn",
} as const;

// ── Configure foreground behaviour ────────────────────────────────────────────
// Call this once at app startup (in _layout.tsx) so notifications
// show as banners even while the app is open.

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert:  true,
      shouldPlaySound:  false,
      shouldSetBadge:   false,
      shouldShowBanner: true,
      shouldShowList:   true,
    }),
  });
}

// ── Permission ────────────────────────────────────────────────────────────────

function permGranted(result: unknown): boolean {
  // expo-notifications PermissionResponse shape varies by SDK version;
  // handle both `granted: boolean` and `status: "granted"` forms.
  const r = result as Record<string, unknown>;
  return r.granted === true || r.status === "granted";
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const result = await Notifications.requestPermissionsAsync();
  return permGranted(result);
}

export async function getNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const result = await Notifications.getPermissionsAsync();
  return permGranted(result);
}

// ── Schedule helpers ──────────────────────────────────────────────────────────

export async function cancelDailyNotifications() {
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(NOTIF_IDS.fajrNudge).catch(() => {}),
    Notifications.cancelScheduledNotificationAsync(NOTIF_IDS.maghribWarn).catch(() => {}),
  ]);
}

/** Schedules a nudge 5 minutes after Fajr. Skips if already passed. */
export async function scheduleFajrNudge(fajrTime: Date, title: string, body: string) {
  const trigger = new Date(fajrTime.getTime() + 5 * 60 * 1_000);
  if (trigger <= new Date()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_IDS.fajrNudge,
    content:    { title, body },
    trigger:    { date: trigger } as any,
  });
}

/**
 * Schedules a streak warning 90 minutes before Maghrib.
 * Only fires when streak > 0 and the anchor sunnah is not yet done.
 * Skips if already past the trigger window.
 */
export async function scheduleMaghribWarning(
  maghribTime: Date,
  title: string,
  body: string,
) {
  const trigger = new Date(maghribTime.getTime() - 90 * 60 * 1_000);
  if (trigger <= new Date()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_IDS.maghribWarn,
    content:    { title, body },
    trigger:    { date: trigger } as any,
  });
}

/**
 * Main entry point — cancels any existing daily notifications and
 * reschedules based on current prayer times + streak state.
 */
export async function scheduleDailyNotifications(opts: {
  fajrTime:      Date | null;
  maghribTime:   Date | null;
  currentStreak: number;
  anchorDone:    boolean;
  anchorName:    string;   // localised anchor sunnah name
  fajrTitle:     string;
  fajrBody:      string;
  warnTitle:     string;   // "{N}" already substituted by caller
  warnBody:      string;   // "{anchor}" already substituted by caller
}) {
  if (Platform.OS === "web") return;

  const granted = await getNotificationPermission();
  if (!granted) return;

  await cancelDailyNotifications();

  if (opts.fajrTime) {
    await scheduleFajrNudge(opts.fajrTime, opts.fajrTitle, opts.fajrBody);
  }

  if (opts.maghribTime && opts.currentStreak > 0 && !opts.anchorDone) {
    await scheduleMaghribWarning(opts.maghribTime, opts.warnTitle, opts.warnBody);
  }
}
