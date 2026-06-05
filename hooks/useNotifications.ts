/**
 * useNotifications — requests permission and schedules daily local notifications.
 *
 * Rescheduling happens at most once per effective day (Hijri-adjusted).
 * If the user already has a scheduled notification from today, we don't
 * cancel and redo it — saves battery and avoids race conditions.
 *
 * Call this from the home screen after prayer times + sunnah data are loaded.
 */

import { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { PrayerEntry } from "@/hooks/usePrayerTimes";
import { useLang } from "@/hooks/useLang";
import {
  requestNotificationPermission,
  scheduleDailyNotifications,
} from "@/lib/notifications";
import { getEffectiveDate } from "@/lib/islamicDate";

const STORAGE_KEY = "ballegho:last-notif-scheduled-date";

interface Options {
  prayers:        PrayerEntry[];
  currentStreak:  number;
  anchorDone:     boolean;
  anchorName:     string;   // en or ar name of anchor sunnah
  maghribTime:    Date | null;
}

export function useNotifications({
  prayers, currentStreak, anchorDone, anchorName, maghribTime,
}: Options) {
  const { t, isRTL } = useLang();
  // Track the last date we scheduled so we only do it once per day
  const scheduledRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!prayers.length) return; // wait until prayer times are loaded

    async function setup() {
      const today = getEffectiveDate(maghribTime);

      // Already scheduled today (in-memory check — fast path)
      if (scheduledRef.current === today) return;

      // Persist check across app restarts
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === today) {
        scheduledRef.current = today;
        return;
      }

      // First time — ask for permission (only shows OS dialog once ever)
      await requestNotificationPermission();

      const fajrEntry    = prayers.find(p => p.key === "fajr");
      const maghribEntry = prayers.find(p => p.key === "maghrib");

      await scheduleDailyNotifications({
        fajrTime:      fajrEntry?.time    ?? null,
        maghribTime:   maghribEntry?.time ?? null,
        currentStreak,
        anchorDone,
        anchorName,
        // Notification strings — fully localised
        fajrTitle: isRTL
          ? "بسم الله — صباح الخير"
          : "بسم الله — Good morning",
        fajrBody: isRTL
          ? "سنن اليوم بانتظارك"
          : "Your sunnahs for today await",
        warnTitle: isRTL
          ? `⚡ اليوم ${currentStreak} — أتمّه`
          : `⚡ Day ${currentStreak} — seal it`,
        warnBody: isRTL
          ? `${anchorName} · المغرب بعد ٩٠ دقيقة`
          : `${anchorName} · Maghrib in 90 min`,
      });

      scheduledRef.current = today;
      await AsyncStorage.setItem(STORAGE_KEY, today);
    }

    setup().catch(err => console.warn("[useNotifications]", err));
  }, [
    // Re-run when prayer times load, streak changes, anchor completion changes,
    // or the Maghrib boundary crosses (effective date advances to next Islamic day).
    prayers.length, currentStreak, anchorDone, maghribTime?.getTime(),
    getEffectiveDate(maghribTime ?? null),
  ]);
}
