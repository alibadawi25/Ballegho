import { Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLang } from "@/hooks/useLang";
import { useSunnahs } from "@/hooks/useSunnahs";
import { useDifficultyRating } from "@/hooks/useDifficultyRating";
import { usePrayerCtx } from "@/contexts/PrayerTimesContext";
import { PrayerStrip } from "@/components/PrayerStrip";
import { DifficultyRatingCard } from "@/components/DifficultyRatingCard";
import { SunnahGroup, DayProgress } from "@/components/home/SunnahChecklist";
// WeekStrip now rendered inside DayProgress card
import MilestoneCard, { MILESTONE_DAYS } from "@/components/MilestoneCard";
import { useNotifications } from "@/hooks/useNotifications";
import { isApproachingMaghrib, isPastMaghrib, minutesUntilMaghrib, getEffectiveDate } from "@/lib/islamicDate";
import { getHijriDate }  from "@/lib/hijriDateApi";
import { getNotificationPermission, requestNotificationPermission } from "@/lib/notifications";
import type { ActiveSunnah, GroupKey } from "@/hooks/useSunnahs";

// ── Daily motivational quotes (rotate by day of week) ────────────────────────
// Seven authentic ḥadīth, one per weekday. No DB call needed.
const DAILY_QUOTES = [
  { ar: "أحبُّ الأعمالِ إلى اللهِ أدومُها وإن قلَّ",         src: "البخاري ومسلم" },
  { ar: "الطهورُ شطرُ الإيمانِ",                               src: "مسلم"         },
  { ar: "لا يؤمنُ أحدُكم حتى يحبَّ لأخيه ما يُحبُّ لنفسِه", src: "البخاري ومسلم" },
  { ar: "الدِّينُ النصيحةُ",                                    src: "مسلم"         },
  { ar: "مَن كانَ يؤمنُ باللهِ واليومِ الآخرِ فليقُل خيرًا أو ليصمُت", src: "البخاري ومسلم" },
  { ar: "خيرُ الناسِ أنفعُهم للناسِ",                          src: "الطبراني"     },
  { ar: "اتَّقِ اللهَ حيثما كنتَ",                             src: "الترمذي"      },
] as const;

// Hijri date from Intl — kept as offline fallback when AlAdhan is unreachable.
function getHijriFallback(date: Date, monthNames: readonly string[]): string | null {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric", month: "numeric",
    }).formatToParts(date);
    const day   = parseInt(parts.find((p) => p.type === "day")?.value  ?? "0");
    const month = parseInt(parts.find((p) => p.type === "month")?.value ?? "0");
    const name  = monthNames[month - 1];
    return name ? `${day} ${name}` : null;
  } catch { return null; }
}

const GROUP_ORDER: GroupKey[] = ["morning", "daily", "evening", "night"];

export default function HomeScreen() {
  const insets               = useSafeAreaInsets();
  const router               = useRouter();
  const { t, isRTL, isDark } = useLang();
  const { pending, submitRating, dismiss } = useDifficultyRating();

  // Prayer times — shared instance from PrayerTimesProvider (no extra geolocation call).
  const { prayers } = usePrayerCtx();
  const maghrib = prayers.find(p => p.key === "maghrib")?.time ?? null;

  const {
    groups, completedIds, activeDates, anchorId,
    loading, totalCount, doneCount,
    currentStreak,
    complete, uncomplete, reload,
  } = useSunnahs(maghrib);

  const effectiveToday = getEffectiveDate(maghrib);

  // ── Maghrib day-boundary derived values ────────────────────────────────
  const minsLeft       = minutesUntilMaghrib(maghrib);
  const approaching    = isApproachingMaghrib(maghrib, 90);   // within 90 min
  const pastMaghrib    = isPastMaghrib(maghrib);
  const anchorDone     = anchorId ? completedIds.has(anchorId) : true;
  const anchorSunnah   = anchorId
    ? Object.values(groups).flat().find(s => s.sunnah_id === anchorId)
    : null;
  const showStreakWarn  = approaching && currentStreak > 0 && !anchorDone && !loading;
  const showNewDayNote  = pastMaghrib && doneCount === 0 && !loading && totalCount > 0;

  // ── Maghrib time display (e.g. "7:30 pm") ──────────────────────────────
  const maghribDisplay = maghrib
    ? maghrib.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })
    : null;

  // ── Daily notifications ─────────────────────────────────────────────────
  useNotifications({
    prayers,
    currentStreak,
    anchorDone,
    anchorName: anchorSunnah ? (isRTL ? anchorSunnah.name_ar : anchorSunnah.name_en) : "",
    maghribTime: maghrib,
  });

  // ── Just-completed anchor tracking (for blessing message) ───────────────
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);
  const clearBlessingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Milestone detection ─────────────────────────────────────────────────
  // null = data not yet loaded; number = baseline after first load.
  const prevStreakRef = useRef<number | null>(null);
  const [milestoneStreak, setMilestoneStreak] = useState<number | null>(null);

  useEffect(() => {
    if (loading) return;
    if (prevStreakRef.current === null) {
      // First successful load — set baseline without firing milestone
      prevStreakRef.current = currentStreak;
      return;
    }
    if (currentStreak > prevStreakRef.current && MILESTONE_DAYS.includes(currentStreak as any)) {
      setMilestoneStreak(currentStreak);
    }
    prevStreakRef.current = currentStreak;
  }, [currentStreak, loading]);

  // Reload whenever this screen re-gains focus (e.g. coming back from detail).
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  // ── Notification permission state ─────────────────────────────────────────
  const [notifsEnabled, setNotifsEnabled] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "web") {
      getNotificationPermission().then(setNotifsEnabled);
    }
  }, []);

  async function handleBellPress() {
    if (notifsEnabled) {
      Alert.alert(
        isRTL ? "الإشعارات مفعّلة ✓" : "Notifications on",
        isRTL
          ? "ستصلك إشعارة عند الفجر لتذكيرك، وأخرى قبل المغرب إن لم تُتمّ سنتك المرساة."
          : "You get a Fajr nudge each morning and a Maghrib reminder if your anchor sunnah isn't done.",
        [
          { text: isRTL ? "موافق" : "OK", style: "cancel" },
          { text: isRTL ? "إعدادات النظام" : "System settings",
            onPress: () => Linking.openSettings() },
        ]
      );
    } else {
      const granted = await requestNotificationPermission();
      setNotifsEnabled(granted);
      if (!granted) {
        Alert.alert(
          isRTL ? "تفعيل الإشعارات" : "Enable notifications",
          isRTL
            ? "افتح إعدادات التطبيق حتى تصلك تذكيرات يومية."
            : "Open app settings to allow daily reminders.",
          [
            { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
            { text: isRTL ? "الإعدادات" : "Settings",
              onPress: () => Linking.openSettings() },
          ]
        );
      }
    }
  }

  // ── Hijri date — AlAdhan API (cached), Maghrib-aware, falls back to Intl ──
  // Uses getEffectiveDate(maghrib) so after Maghrib the date advances to the
  // next Islamic day — the same boundary useSunnahs and the week strip use.
  const now = new Date();
  const effectiveDate = getEffectiveDate(maghrib);  // YYYY-MM-DD

  const [hijriLine, setHijriLine] = useState<string | null>(
    getHijriFallback(now, t.hijriMonths)
  );

  useEffect(() => {
    getHijriDate(effectiveDate).then((h) => {
      if (!h) return;
      const line = isRTL
        ? `${h.weekdayAr} · ${h.dayAr} ${h.monthAr}`
        : `${h.weekdayEn} · ${h.day} ${h.monthEn}`;
      setHijriLine(line);
    });
    // Re-run whenever the effective date changes (Maghrib boundary crossing).
  }, [effectiveDate, isRTL]);

  // Derive weekday from effectiveDate so it advances at Maghrib, not midnight.
  const [_ey, _em, _ed] = effectiveDate.split("-").map(Number);
  const effectiveDow = new Date(_ey, _em - 1, _ed).getDay();
  const weekday  = t.weekdays[effectiveDow];
  const dateLine = hijriLine ?? weekday;

  const c = {
    bg:       isDark ? "#0a1422" : "#f5efe2",
    surface:  isDark ? "#122236" : "#ffffff",
    ink:      isDark ? "#f4ecd8" : "#0e1a2b",
    inkMuted: isDark ? "#8a8876" : "#7a8193",
    inkFaint: isDark ? "#4a5362" : "#b9bcc4",
    gold:     isDark ? "#d4af37" : "#b8892a",
    divider:  isDark ? "rgba(244,236,216,0.08)" : "rgba(14,26,43,0.1)",
  };

  const handleToggle = useCallback((sunnahId: string, isDone: boolean) => {
    if (isDone) {
      uncomplete(sunnahId);
      // Clear blessing immediately on uncheck
      if (sunnahId === justCompletedId) {
        setJustCompletedId(null);
        if (clearBlessingTimer.current) clearTimeout(clearBlessingTimer.current);
      }
    } else {
      complete(sunnahId);
      // Show blessing for this sunnah; auto-clear after 4 s
      setJustCompletedId(sunnahId);
      if (clearBlessingTimer.current) clearTimeout(clearBlessingTimer.current);
      clearBlessingTimer.current = setTimeout(() => setJustCompletedId(null), 4000);
    }
  }, [complete, uncomplete, justCompletedId]);

  const handlePress = useCallback((sunnah: ActiveSunnah) => {
    router.push({ pathname: "/sunnah/[id]", params: { id: sunnah.sunnah_id } });
  }, [router]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 22,
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 20,
      }}>
        <View style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}>
          <Text style={{
            fontSize: 10, fontWeight: "600",
            textTransform: isRTL ? "none" : "uppercase",
            ...(isRTL ? {} : { letterSpacing: 1.4 }),
            color: c.inkMuted, marginBottom: 6,
          }}>
            {dateLine}
          </Text>
          {isRTL ? (
            // Arabic — split across two words (independent, no ligature between them)
            <Text style={{ fontSize: 28, fontWeight: "600", lineHeight: 42, writingDirection: "rtl" }}>
              <Text style={{ color: c.ink }}>{t.greetingBase}</Text>
              <Text style={{ color: c.gold }}>{t.greetingGold}</Text>
            </Text>
          ) : (
            <Text style={{ fontFamily: "Georgia", fontSize: 26, letterSpacing: -0.5, lineHeight: 30 }}>
              <Text style={{ color: c.ink }}>{t.greetingBase}</Text>
              <Text style={{ color: c.gold }}>{t.greetingGold}</Text>
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={handleBellPress}
          activeOpacity={0.7}
          style={{
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: isDark ? "#0f1d31" : "#ede4d0",
            alignItems: "center", justifyContent: "center", marginTop: 2,
          }}
        >
          <Feather
            name={notifsEnabled ? "bell" : "bell-off"}
            size={17}
            color={notifsEnabled
              ? (isDark ? c.gold : c.gold)
              : (isDark ? "#4a5362" : "#b9bcc4")}
          />
          {/* Gold dot when notifications are ON */}
          {notifsEnabled && (
            <View style={{
              position: "absolute", top: 6, right: 6,
              width: 6, height: 6, borderRadius: 3,
              backgroundColor: c.gold,
              borderWidth: 1,
              borderColor: isDark ? "#0f1d31" : "#ede4d0",
            }} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Prayer strip ───────────────────────────────────── */}
      <View style={{ paddingHorizontal: 22, marginBottom: 14 }}>
        <PrayerStrip c={c} />
      </View>

      {/* ── Daily quote (below adhān strip) ────────────────── */}
      {(() => {
        const q = DAILY_QUOTES[effectiveDow];
        return (
          <View style={{
            marginHorizontal: 22, marginBottom: 20,
            borderRadius: 12,
            borderWidth: 0.5,
            borderColor: isDark ? c.gold + "30" : c.gold + "50",
            backgroundColor: isDark ? c.gold + "0a" : c.gold + "0d",
            paddingHorizontal: 14, paddingVertical: 10,
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            gap: 10,
          }}>
            <View style={{ width: 2.5, alignSelf: "stretch", backgroundColor: c.gold + "80", borderRadius: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{
                fontFamily: "Amiri_400Regular",
                fontSize: 14, color: c.ink,
                textAlign: "right", writingDirection: "rtl",
                lineHeight: 22,
              }}>
                «{q.ar}»
              </Text>
              <Text style={{ fontSize: 10, color: c.inkFaint, marginTop: 2, textAlign: isRTL ? "right" : "left" }}>
                — {q.src}
              </Text>
            </View>
          </View>
        );
      })()}

      {/* ── Difficulty rating prompt ────────────────────────── */}
      {pending && (
        <View style={{ paddingHorizontal: 22, marginBottom: 20 }}>
          <DifficultyRatingCard
            sunnah={pending}
            onRate={(r) => submitRating(pending.sunnah_id, r)}
            onDismiss={dismiss}
          />
        </View>
      )}

      {/* ── Progress + week strip (merged card) ─────────────── */}
      {totalCount > 0 && (
        <View style={{ paddingHorizontal: 22, marginBottom: 16 }}>
          <DayProgress
            done={doneCount}
            total={totalCount}
            streak={currentStreak}
            isRTL={isRTL}
            c={c}
            activeDates={activeDates}
            effectiveToday={effectiveToday}
            isDark={isDark}
          />
        </View>
      )}

      {/* ── Maghrib day label ───────────────────────────────── */}
      {maghribDisplay && !loading && (
        <View style={{
          paddingHorizontal: 22,
          marginBottom: 14,
          marginTop: -4,
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          gap: 5,
        }}>
          <Feather
            name="sunset"
            size={10}
            color={approaching ? (isDark ? "#d4af37" : "#b8892a") : (isDark ? "#4a5362" : "#b9bcc4")}
          />
          <Text style={{
            fontSize: 10,
            color: approaching
              ? (isDark ? "#d4af37" : "#b8892a")
              : (isDark ? "#4a5362" : "#b9bcc4"),
            ...(isRTL ? {} : { letterSpacing: 0.3 }),
          }}>
            {pastMaghrib
              ? t.home.newDayBegan
              : `${t.home.dayResetsAt} · ${maghribDisplay}`}
          </Text>
        </View>
      )}

      {/* ── Streak warning (≤ 90 min before Maghrib, anchor not done) ─── */}
      {showStreakWarn && (
        <View style={{
          marginHorizontal: 22,
          marginBottom: 16,
          marginTop: 4,
          borderRadius: 14,
          borderWidth: 0.5,
          borderColor: isDark ? "#d4af37" + "40" : "#b8892a" + "40",
          backgroundColor: isDark ? "#d4af37" + "12" : "#b8892a" + "10",
          padding: 14,
          gap: 4,
        }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
            <Feather name="zap" size={14} color={isDark ? "#d4af37" : "#b8892a"} />
            <Text style={{
              fontSize: 13,
              fontWeight: "600",
              color: isDark ? "#d4af37" : "#b8892a",
              flex: 1,
              textAlign: isRTL ? "right" : "left",
              ...(isRTL ? {} : {}),
            }}>
              {t.home.streakSeal}
            </Text>
            <Text style={{
              fontSize: 11,
              color: isDark ? "#d4af37" + "cc" : "#b8892a" + "cc",
            }}>
              {minsLeft} {t.home.minutesLeft}
            </Text>
          </View>
          <Text style={{
            fontSize: 12,
            color: isDark ? "#c5bda8" : "#3d4a5e",
            paddingLeft: isRTL ? 0 : 22,
            paddingRight: isRTL ? 22 : 0,
            textAlign: isRTL ? "right" : "left",
          }}>
            {anchorSunnah
              ? (isRTL ? anchorSunnah.name_ar : anchorSunnah.name_en)
              : t.home.streakAnchor}
          </Text>
        </View>
      )}

      {/* ── Milestone celebration ───────────────────────────── */}
      <MilestoneCard
        streak={milestoneStreak}
        onDismiss={() => setMilestoneStreak(null)}
      />

      {/* ── Focus card — next sunnah OR all-done ────────────── */}
      {!loading && totalCount > 0 && (() => {
        if (doneCount === totalCount) {
          // All done — celebration card
          return (
            <View style={{
              marginHorizontal: 22, marginBottom: 16,
              borderRadius: 14, borderWidth: 0.5,
              borderColor: c.gold + "50", backgroundColor: c.gold + "0e",
              padding: 16, alignItems: "center", gap: 6,
            }}>
              <Text style={{ fontSize: 20 }}>✨</Text>
              {isRTL ? (
                <Text style={{ fontFamily: "Amiri_700Bold", fontSize: 20, color: c.gold, writingDirection: "rtl", textAlign: "center" }}>
                  أتممتَ سننك اليوم
                </Text>
              ) : (
                <Text style={{ fontFamily: "Georgia", fontSize: 17, color: c.gold, textAlign: "center" }}>
                  All sunnahs done!
                </Text>
              )}
              <Text style={{ fontSize: 12, color: c.inkMuted, textAlign: "center",
                fontFamily: isRTL ? "Amiri_400Regular" : undefined, lineHeight: 18 }}>
                {isRTL ? "بارك الله فيك · واصل هذا الجمال" : "Bārak Allāhu fīk · keep it up"}
              </Text>
            </View>
          );
        }

        // Find first uncompleted sunnah across all groups
        const nextSunnah = (() => {
          for (const key of GROUP_ORDER) {
            const s = groups[key].find(s => !completedIds.has(s.sunnah_id));
            if (s) return s;
          }
          return null;
        })();

        if (!nextSunnah) return null;

        return (
          <TouchableOpacity
            onPress={() => handleToggle(nextSunnah.sunnah_id, false)}
            activeOpacity={0.85}
            style={{
              marginHorizontal: 22, marginBottom: 16,
              borderRadius: 14, borderWidth: 0.5,
              borderColor: c.gold + "60", backgroundColor: c.gold,
              paddingHorizontal: 18, paddingVertical: 14,
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center", gap: 14,
            }}
          >
            <View style={{
              width: 38, height: 38, borderRadius: 19,
              borderWidth: 2, borderColor: isDark ? "#0a1422" : "#0e1a2b",
              alignItems: "center", justifyContent: "center",
              backgroundColor: "transparent",
            }}>
              <Feather name="circle" size={18} color={isDark ? "#0a1422" : "#0e1a2b"} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 8, fontWeight: "600",
                color: (isDark ? "#0a1422" : "#0e1a2b") + "aa",
                ...(isRTL ? {} : { letterSpacing: 1.2, textTransform: "uppercase" as const }),
                textAlign: isRTL ? "right" : "left" }}>
                {isRTL ? "التالية" : "Up next"}
              </Text>
              {isRTL ? (
                <Text style={{ fontFamily: "Amiri_700Bold", fontSize: 18, color: isDark ? "#0a1422" : "#0e1a2b", writingDirection: "rtl", textAlign: "right" }}>
                  {nextSunnah.name_ar}
                </Text>
              ) : (
                <Text style={{ fontFamily: "Georgia", fontSize: 16, color: isDark ? "#0a1422" : "#0e1a2b" }}>
                  {nextSunnah.name_en}
                </Text>
              )}
            </View>
            <Feather name="check-circle" size={22} color={isDark ? "#0a1422" : "#0e1a2b"} style={{ opacity: 0.6 }} />
          </TouchableOpacity>
        );
      })()}

      {/* ── Sunnah checklist ────────────────────────────────── */}
      <View style={{ paddingHorizontal: 22 }}>
        {loading ? (
          <ActivityIndicator color={c.gold} style={{ marginTop: 40 }} />
        ) : totalCount === 0 ? (
          // Empty state — shouldn't happen after onboarding but just in case
          <View style={{
            alignItems: "center", paddingVertical: 48, gap: 12,
          }}>
            <Feather name="sun" size={32} color={c.inkFaint} />
            <Text style={{ fontSize: 14, color: c.inkMuted, textAlign: "center" }}>
              {isRTL ? "لا توجد سنن نشطة بعد" : "No active sunnahs yet"}
            </Text>
          </View>
        ) : (
          GROUP_ORDER.map((key) => (
            <SunnahGroup
              key={key}
              groupKey={key}
              sunnahs={groups[key]}
              completedIds={completedIds}
              anchorId={anchorId}
              justCompletedId={justCompletedId}
              currentStreak={currentStreak}
              isRTL={isRTL}
              c={c}
              onToggle={handleToggle}
              onPress={handlePress}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}
