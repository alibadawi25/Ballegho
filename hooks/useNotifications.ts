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
      const asrEntry     = prayers.find(p => p.key === "asr");
      const ishaEntry    = prayers.find(p => p.key === "isha");
      const maghribEntry = prayers.find(p => p.key === "maghrib");

      // ── Day-specific "occasion" reminder ──────────────────────────────────
      // Friday → read Sūrat al-Kahf · Sun/Wed evening → tomorrow is a Mon/Thu
      // fast. Only one slot; these never collide on the same day.
      const now   = new Date();
      const dow   = now.getDay(); // 0 Sun … 6 Sat
      const dhuhr = prayers.find(p => p.key === "dhuhr")?.time ?? null;
      let occasion: { date: Date; title: string; body: string } | null = null;

      if (dow === 5) {
        // Friday: remind at Ḍuhr, else ~2h before Maghrib.
        const when =
          dhuhr && dhuhr > now ? dhuhr
          : maghribEntry ? new Date(maghribEntry.time.getTime() - 120 * 60_000)
          : null;
        if (when && when > now) {
          occasion = {
            date: when,
            title: isRTL ? "إنه يوم الجمعة" : "It's Friday",
            body:  isRTL ? "اقرأ سورة الكهف؛ نورٌ لك إلى الجمعة القادمة" : "Read Sūrat al-Kahf — light until next Friday",
          };
        }
      } else if (dow === 0 || dow === 3) {
        // Sun/Wed evening → tomorrow is Monday/Thursday (Prophetic fast days).
        const when = ishaEntry?.time
          ?? (maghribEntry ? new Date(maghribEntry.time.getTime() + 60 * 60_000) : null);
        if (when && when > now) {
          occasion = {
            date: when,
            title: isRTL ? "صيام الغد؟" : "Fasting tomorrow?",
            body:  isRTL ? "غدًا من الأيام التي كان النبي ﷺ يصومها — انوِ من الليل" : "Tomorrow is a day the Prophet ﷺ fasted — set your niyyah tonight",
          };
        }
      }

      await scheduleDailyNotifications({
        fajrTime:      fajrEntry?.time    ?? null,
        asrTime:       asrEntry?.time     ?? null,
        ishaTime:      ishaEntry?.time    ?? null,
        maghribTime:   maghribEntry?.time ?? null,
        currentStreak,
        anchorDone,
        anchorName,
        occasion,
        // Notification strings — fully localised
        fajrTitle: isRTL
          ? "بسم الله — صباح الخير"
          : "بسم الله — Good morning",
        fajrBody: isRTL
          ? "سنن اليوم بانتظارك"
          : "Your sunnahs for today await",
        eveningTitle: isRTL ? "أذكار المساء" : "Evening adhkār",
        eveningBody:  isRTL ? "خذ لحظة مع أذكار المساء" : "Take a moment as the day winds down",
        nightTitle:   isRTL ? "قبل النوم" : "Before you sleep",
        nightBody:    isRTL ? "اختم يومك بأذكار النوم" : "End your day with the sleeping adhkār",
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
