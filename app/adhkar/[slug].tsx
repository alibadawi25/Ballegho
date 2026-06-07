/**
 * Adhkār Session Player
 *
 * The step-by-step player for a "playlist" sunnah (morning / evening adhkār).
 * Shows the current dhikr with its own sebha counter, advances automatically to
 * the next incomplete dhikr, and marks the parent sunnah done once every dhikr
 * has reached its repetition target.
 *
 * Navigation: router.push("/adhkar/<playlist_slug>")
 */

import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform,
} from "react-native";
import { useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { useAdhkarSession, type AdhkarItem } from "@/hooks/useAdhkarSession";
import { useLang } from "@/hooks/useLang";
import { colors } from "@/constants/theme";
import { localizeNumber } from "@/lib/arabicNumerals";
import SebhaCounter from "@/components/SebhaCounter";

export default function AdhkarSessionScreen() {
  const { slug }  = useLocalSearchParams<{ slug: string }>();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const { t, isRTL, isDark } = useLang();
  const c = colors(isDark);

  // Outside the (tabs) tree → call usePrayerTimes directly for the Maghrib ref.
  const { prayers } = usePrayerTimes();
  const maghribRef = useRef<Date | null>(null);
  maghribRef.current = prayers.find((p) => p.key === "maghrib")?.time ?? null;

  const {
    items, counts, loading, doneCount, allDone, currentIndex,
    parentNameEn, parentNameAr, increment, reset,
  } = useAdhkarSession(slug, maghribRef.current);

  const title = isRTL ? parentNameAr : parentNameEn;
  const total = items.length;

  function handleIncrement(item: AdhkarItem) {
    const reachesTarget = (counts[item.id] ?? 0) + 1 >= item.repetitions;
    increment(item.id);
    if (reachesTarget && Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={c.gold} />
      </View>
    );
  }

  const current = currentIndex >= 0 ? items[currentIndex] : null;
  const upNext  = items.filter((_, i) => i > currentIndex && currentIndex >= 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <View style={[
        styles.topBar,
        {
          paddingTop: insets.top + 10,
          backgroundColor: c.bg,
          borderBottomColor: c.divider,
          flexDirection: isRTL ? "row-reverse" : "row",
        },
      ]}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={[styles.topBtn, { backgroundColor: c.surface }]}
        >
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={19} color={c.inkMuted} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: c.ink }]} numberOfLines={1}>{title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: insets.bottom + 40 }}
      >
        {/* ── Progress ──────────────────────────────────────────────────── */}
        <View style={{ marginBottom: 22 }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={[styles.progressLabel, { color: c.inkMuted }, isRTL && styles.arLabel]}>
              {isRTL ? "التقدّم" : "Progress"}
            </Text>
            <Text style={[styles.progressLabel, { color: c.gold }, isRTL && styles.arLabel]}>
              {localizeNumber(doneCount, isRTL)} {t.adhkar.of} {localizeNumber(total, isRTL)}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: c.divider }]}>
            <View style={[styles.fill, { backgroundColor: c.gold, width: `${total ? (doneCount / total) * 100 : 0}%` }]} />
          </View>
        </View>

        {total === 0 ? (
          <Text style={[{ color: c.inkMuted, textAlign: "center", marginTop: 40 }, isRTL && styles.arLabel]}>
            {t.adhkar.empty}
          </Text>
        ) : allDone || !current ? (
          /* ── Completion ─────────────────────────────────────────────── */
          <View style={styles.completeWrap}>
            <View style={[styles.completeBadge, { backgroundColor: c.green + "1e", borderColor: c.green + "55" }]}>
              <Feather name="check" size={42} color={c.green} />
            </View>
            <Text style={[styles.completeTitle, { color: c.ink }, isRTL && { fontFamily: "Amiri_700Bold" }]}>
              {t.adhkar.complete}
            </Text>
            <Text style={[styles.completeSub, { color: c.inkMuted }, isRTL && styles.arLabel]}>
              {t.adhkar.completeSub}
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.85}
              style={[styles.doneBtn, { backgroundColor: c.gold }]}
            >
              <Text style={[styles.doneBtnText, isRTL && { fontFamily: "Amiri_700Bold", fontSize: 18 }]}>
                {t.adhkar.backToAll}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Current dhikr card ───────────────────────────────────── */}
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.gold + "33" }]}>
              {/* Source + reps */}
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                {current.source ? (
                  <View style={[styles.pill, { backgroundColor: c.gold + "18" }]}>
                    <Text style={[styles.pillText, { color: c.gold }, isRTL && styles.arPill]}>{current.source}</Text>
                  </View>
                ) : <View />}
                <View style={[styles.pill, { backgroundColor: c.gold }]}>
                  <Text style={[styles.pillText, { color: "#0e1a2b" }]}>
                    {t.adhkar.times}{localizeNumber(current.repetitions, isRTL)}
                  </Text>
                </View>
              </View>

              {/* Arabic */}
              <Text style={[styles.arabic, { color: c.ink }]}>{current.arabic}</Text>

              {/* Transliteration + translation (for non-Arabic readers) */}
              {!isRTL && current.transliteration && (
                <Text style={[styles.translit, { color: c.gold }]}>{current.transliteration}</Text>
              )}
              {!isRTL && current.translation_en && (
                <Text style={[styles.translation, { color: c.inkMuted }]}>{current.translation_en}</Text>
              )}

              {/* Reward callout */}
              {(isRTL ? (current.reward_ar ?? current.reward_en) : current.reward_en) && (
                <View style={[styles.reward, { backgroundColor: c.gold + "12", borderColor: c.gold + "33" }]}>
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <Feather name="star" size={12} color={c.gold} />
                    <Text style={[styles.rewardLabel, { color: c.gold }, isRTL && styles.arPill]}>{t.adhkar.reward}</Text>
                  </View>
                  <Text style={[styles.rewardText, { color: c.inkMuted }, isRTL && styles.arBody]}>
                    {isRTL ? (current.reward_ar ?? current.reward_en) : current.reward_en}
                  </Text>
                </View>
              )}
            </View>

            {/* ── Counter ──────────────────────────────────────────────── */}
            <View style={{ marginTop: 22, marginBottom: 8 }}>
              <SebhaCounter
                count={counts[current.id] ?? 0}
                target={current.repetitions}
                done={(counts[current.id] ?? 0) >= current.repetitions}
                onIncrement={() => handleIncrement(current)}
                onReset={() => reset(current.id)}
                c={c}
                isRTL={isRTL}
                t={{
                  tapToCount:  t.sunnah.tapToCount,
                  counterDone: t.sunnah.counterDone,
                  reset:       t.sunnah.reset,
                  of:          t.sunnah.of,
                  markNotDone: t.sunnah.markNotDone,
                }}
              />
            </View>

            {/* ── Up next ──────────────────────────────────────────────── */}
            {upNext.length > 0 && (
              <View style={{ marginTop: 26 }}>
                <Text style={[styles.upNextHeader, { color: c.inkMuted }, isRTL && styles.arLabel]}>{t.adhkar.upNext}</Text>
                {upNext.map((it) => (
                  <View
                    key={it.id}
                    style={[styles.upRow, { borderBottomColor: c.divider, flexDirection: isRTL ? "row-reverse" : "row" }]}
                  >
                    <View style={[styles.upNum, { borderColor: c.divider }]}>
                      <Text style={[styles.upNumText, { color: c.inkMuted }]}>{localizeNumber(it.position, isRTL)}</Text>
                    </View>
                    <Text
                      style={[styles.upText, { color: c.ink, textAlign: isRTL ? "right" : "left" }]}
                      numberOfLines={1}
                    >
                      {it.arabic}
                    </Text>
                    <View style={[styles.repPill, { backgroundColor: c.surface, borderColor: c.divider }]}>
                      <Text style={[styles.repPillText, { color: c.inkMuted }]}>
                        {t.adhkar.times}{localizeNumber(it.repetitions, isRTL)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5,
  },
  topBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, fontFamily: "Georgia", fontSize: 16, textAlign: "center", paddingHorizontal: 8 },

  // Progress
  progressLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  arLabel: { fontFamily: "Amiri_400Regular", fontSize: 14, fontWeight: "400", textTransform: "none", letterSpacing: 0, writingDirection: "rtl" },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill:  { height: 6, borderRadius: 3 },

  // Card
  card: { borderRadius: 18, borderWidth: 0.5, padding: 20, gap: 14 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  pillText: { fontSize: 11, fontWeight: "600" },
  arPill: { fontFamily: "Amiri_400Regular", fontSize: 13, fontWeight: "400", writingDirection: "rtl" },
  arabic: {
    fontFamily: "Amiri_700Bold", fontSize: 25, lineHeight: 46,
    textAlign: "center", writingDirection: "rtl",
  },
  translit: { fontFamily: "Georgia", fontStyle: "italic", fontSize: 13, lineHeight: 20, textAlign: "center" },
  translation: { fontSize: 13, lineHeight: 20, textAlign: "center" },
  reward: { borderRadius: 12, borderWidth: 0.5, padding: 12, marginTop: 2 },
  rewardLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  rewardText: { fontSize: 12, lineHeight: 19, fontStyle: "italic" },
  arBody: { fontFamily: "Amiri_400Regular", fontSize: 15, lineHeight: 26, fontStyle: "normal", textAlign: "right", writingDirection: "rtl" },

  // Up next
  upNextHeader: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  upRow: { alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 0.5 },
  upNum: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  upNumText: { fontSize: 11, fontFamily: "Georgia" },
  upText: { flex: 1, fontFamily: "Amiri_400Regular", fontSize: 17, writingDirection: "rtl" },
  repPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, borderWidth: 0.5 },
  repPillText: { fontSize: 11, fontWeight: "600" },

  // Completion
  completeWrap: { alignItems: "center", gap: 12, paddingTop: 40 },
  completeBadge: { width: 96, height: 96, borderRadius: 48, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  completeTitle: { fontFamily: "Georgia", fontSize: 24 },
  completeSub: { fontSize: 14, textAlign: "center" },
  doneBtn: { marginTop: 18, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14, minWidth: 200, alignItems: "center" },
  doneBtnText: { fontFamily: "Georgia", fontSize: 16, color: "#0e1a2b" },
});
