/**
 * Streaks / Progress tab (design screen 6).
 *
 *   • Header           — "Your journey" eyebrow + "Progress" display
 *   • Night streak card — big current-streak number + Best / This month / Total
 *   • Activity heatmap  — 5-week grid (full / partial / empty / future)
 *   • Milestones row    — 7 · 21 · 40 · 100 with reached / current state
 *   • Most consistent   — per-sunnah 30-day completion bars
 *
 * The big card always uses the Night & Gold palette regardless of app theme
 * (like the milestone card) — the deep-ink hero is core to the brand.
 */

import { Text, View, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { useCallback } from "react";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLang } from "@/hooks/useLang";
import { useStreaks, type HeatLevel, type ConsistencyItem } from "@/hooks/useStreaks";
import { usePrayerCtx } from "@/contexts/PrayerTimesContext";
import { colors, NIGHT, PALETTE, type Colors } from "@/constants/theme";
import { toArabicDigits } from "@/lib/arabicNumerals";

// Design milestone ladder for this screen (distinct from the celebration set).
const MILESTONES = [7, 21, 40, 100] as const;

// Grammatical Arabic "N days" for each fixed milestone (3–10 → plural "أيام",
// 11+ → singular accusative "يوماً", 100 → "يوم"). Avoids the wrong "7 يوم".
const AR_DAY_LABEL: Record<number, string> = {
  7: "٧ أيام", 21: "٢١ يوماً", 40: "٤٠ يوماً", 100: "١٠٠ يوم",
};

export default function StreaksScreen() {
  const insets               = useSafeAreaInsets();
  const { t, isRTL, isDark } = useLang();
  const c = colors(isDark);

  const { prayers } = usePrayerCtx();
  const maghrib = prayers.find((p) => p.key === "maghrib")?.time ?? null;

  const {
    loading,
    currentStreak, longestStreak,
    thisMonthDays, daysInMonth, totalDays,
    heatmap, consistency,
    reload,
  } = useStreaks(maghrib);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  // Next milestone the user is currently working toward, and how many are reached.
  const nextTarget   = MILESTONES.find((m) => currentStreak < m) ?? null;
  const reachedCount = MILESTONES.filter((m) => longestStreak >= m).length;

  // Chunk the flat 35-cell heatmap into 5 weeks of 7.
  const weeks: typeof heatmap[] = [];
  for (let i = 0; i < heatmap.length; i += 7) weeks.push(heatmap.slice(i, i + 7));

  const eyebrowStyle = isRTL
    ? styles.eyebrowAr
    : [styles.eyebrowEn, { letterSpacing: 1.4 }];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={{
        paddingTop: 12,
        paddingHorizontal: 22,
        marginBottom: 20,
        alignItems: isRTL ? "flex-end" : "flex-start",
      }}>
        <Text style={[eyebrowStyle, { color: c.inkMuted, marginBottom: 6 }]}>
          {t.streaks.eyebrow}
        </Text>
        <Text style={[
          isRTL ? styles.titleAr : styles.titleEn,
          { color: c.ink },
        ]}>
          {t.streaks.title}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={c.gold} style={{ marginTop: 48 }} />
      ) : (
        <>
          {/* ── Night streak card ───────────────────────────── */}
          <View style={[styles.heroCard, { backgroundColor: PALETTE.night2, borderColor: NIGHT.gold + "22" }]}>
            <Text style={[
              isRTL ? styles.eyebrowAr : [styles.eyebrowEn, { letterSpacing: 1.6 }],
              { color: NIGHT.gold, marginBottom: 6, textAlign: isRTL ? "right" : "left" },
            ]}>
              {t.streaks.currentStreak}
            </Text>

            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "baseline",
              gap: 8,
              marginBottom: 18,
            }}>
              <Text style={styles.bigNumber}>{currentStreak}</Text>
              <Text style={[
                isRTL ? styles.heroDaysAr : styles.heroDaysEn,
                { color: NIGHT.muted },
              ]}>
                {t.streaks.days}
              </Text>
            </View>

            {/* Stats row */}
            <View style={[
              styles.statsRow,
              { flexDirection: isRTL ? "row-reverse" : "row", borderTopColor: NIGHT.divider },
            ]}>
              <Stat label={t.streaks.best}      value={isRTL ? toArabicDigits(longestStreak) : String(longestStreak)} isRTL={isRTL} />
              <View style={[styles.statDivider, { backgroundColor: NIGHT.divider }]} />
              {/* #15 — "N active days" is clearer than "N/30" fraction */}
              <Stat label={t.streaks.thisMonth} value={isRTL ? toArabicDigits(thisMonthDays) : String(thisMonthDays)} isRTL={isRTL} />
              <View style={[styles.statDivider, { backgroundColor: NIGHT.divider }]} />
              <Stat label={t.streaks.total}     value={isRTL ? toArabicDigits(totalDays) : String(totalDays)}         isRTL={isRTL} />
            </View>
          </View>

          {/* ── Activity heatmap ────────────────────────────── */}
          <View style={{ paddingHorizontal: 22, marginTop: 26 }}>
            <SectionHeader
              left={t.streaks.activity}
              right={t.streaks.last5Weeks}
              isRTL={isRTL}
              c={c}
            />

            {/* Weekday header */}
            <View style={[styles.gridRow, { flexDirection: isRTL ? "row-reverse" : "row", marginBottom: 8 }]}>
              {t.weekdayLetters.map((letter, i) => (
                <Text
                  key={i}
                  style={[
                    styles.weekdayCell,
                    isRTL ? styles.weekdayCellAr : styles.weekdayCellEn,
                    { color: c.inkFaint },
                  ]}
                >
                  {letter}
                </Text>
              ))}
            </View>

            {/* Cells */}
            <View style={{ gap: 6 }}>
              {weeks.map((week, wi) => (
                <View
                  key={wi}
                  style={[styles.gridRow, { flexDirection: isRTL ? "row-reverse" : "row", gap: 6 }]}
                >
                  {week.map((cell) => (
                    <HeatTile key={cell.dateStr} level={cell.level} c={c} isDark={isDark} />
                  ))}
                </View>
              ))}
            </View>
          </View>

          {/* ── Milestones ──────────────────────────────────── */}
          <View style={{ paddingHorizontal: 22, marginTop: 30 }}>
            <SectionHeader left={t.streaks.milestones} isRTL={isRTL} c={c} />
            <View style={[styles.milestoneRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              {/* Continuous track behind the nodes — the solid dot fills occlude
                  it, so the line only shows in the gaps between circles. The end
                  points sit exactly on the first/last dot centers (12.5 / 87.5%). */}
              <View pointerEvents="none" style={[styles.milestoneTrack, { backgroundColor: c.divider }]} />
              {reachedCount >= 2 && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.milestoneTrack,
                    { backgroundColor: c.green, width: `${(reachedCount - 1) * 25}%` },
                    isRTL ? { left: undefined, right: "12.5%" } : { right: undefined, left: "12.5%" },
                  ]}
                />
              )}
              {MILESTONES.map((m, idx) => {
                const reached  = longestStreak >= m;
                const current  = m === nextTarget;
                // "Start here" nudge — only on the very first milestone when
                // nothing has been reached yet.
                const isFirst  = idx === 0 && reachedCount === 0;
                return (
                  <View key={m} style={styles.milestoneCol}>
                    <View style={[
                      styles.milestoneDot,
                      reached
                        ? { backgroundColor: c.green, borderColor: c.green }
                        : current
                          ? { backgroundColor: c.bg, borderColor: c.gold, borderWidth: 2 }
                          : { backgroundColor: c.bg, borderColor: c.divider },
                      // Outer glow ring for the very first target
                      isFirst && { shadowColor: c.gold, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
                    ]}>
                      {reached ? (
                        <Feather name="check" size={16} color={isDark ? PALETTE.night1 : "#ffffff"} />
                      ) : (
                        <Text style={[
                          isRTL ? styles.milestoneNumAr : styles.milestoneNumEn,
                          { color: current ? c.gold : c.inkFaint },
                        ]}>
                          {isRTL ? toArabicDigits(m) : m}
                        </Text>
                      )}
                    </View>
                    <Text style={[
                      isRTL ? styles.milestoneLabelAr : styles.milestoneLabelEn,
                      { color: reached || current ? c.inkMuted : c.inkFaint },
                    ]}>
                      {isRTL ? AR_DAY_LABEL[m] : `${m} ${t.streaks.days}`}
                    </Text>
                    {/* "Start here" hint */}
                    {isFirst && (
                      <Text style={[
                        { fontSize: 9, color: c.gold, marginTop: -2 },
                        isRTL && { fontFamily: "Amiri_400Regular", fontSize: 11 },
                      ]}>
                        {isRTL ? "ابدأ هنا" : "start here"}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Most consistent — only show items with ≥15% rate (#16) ── */}
          {consistency.filter(i => i.rate >= 0.15).length > 0 && (
            <View style={{ paddingHorizontal: 22, marginTop: 30 }}>
              <SectionHeader left={t.streaks.mostConsistent} isRTL={isRTL} c={c} />
              <View style={{ gap: 14, marginTop: 4 }}>
                {consistency.filter(i => i.rate >= 0.15).map((item) => (
                  <ConsistencyRow key={item.sunnah_id} item={item} isRTL={isRTL} c={c} />
                ))}
              </View>
            </View>
          )}

          {/* ── Empty state ─────────────────────────────────── */}
          {currentStreak === 0 && totalDays === 0 && (
            <View style={{ alignItems: "center", paddingVertical: 36, paddingHorizontal: 40 }}>
              <Text style={{ fontSize: 13, color: c.inkMuted, textAlign: "center", lineHeight: 20 }}>
                {t.streaks.noData}
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function Stat({ label, value, isRTL }: { label: string; value: string; isRTL: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[
        isRTL ? styles.statLabelAr : styles.statLabelEn,
        { color: NIGHT.muted },
      ]}>
        {label}
      </Text>
    </View>
  );
}

function SectionHeader({ left, right, isRTL, c }: {
  left: string; right?: string; isRTL: boolean; c: Colors;
}) {
  return (
    <View style={{
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginBottom: 14,
    }}>
      <Text style={[
        isRTL ? styles.eyebrowAr : [styles.eyebrowEn, { letterSpacing: 1.4 }],
        { color: c.inkMuted },
      ]}>
        {left}
      </Text>
      {right && (
        <Text style={{ fontSize: 11, color: c.inkFaint }}>{right}</Text>
      )}
    </View>
  );
}

function HeatTile({ level, c, isDark }: { level: HeatLevel; c: Colors; isDark: boolean }) {
  const base = { flex: 1, aspectRatio: 1, borderRadius: 6 } as const;
  if (level === "full")    return <View style={[base, { backgroundColor: c.gold }]} />;
  if (level === "partial") return <View style={[base, { backgroundColor: c.gold + "4d" }]} />;
  if (level === "future")  return <View style={[base, { backgroundColor: "transparent", borderWidth: 1, borderStyle: "dashed", borderColor: c.divider }]} />;
  return <View style={[base, { backgroundColor: isDark ? PALETTE.night3 : "#e8e0d0" }]} />;
}

function ConsistencyRow({ item, isRTL, c }: { item: ConsistencyItem; isRTL: boolean; c: Colors }) {
  const pct   = Math.round(item.rate * 100);
  const count = isRTL ? toArabicDigits(item.totalCompletions) : String(item.totalCompletions);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <Text
          style={{ fontSize: 13, color: c.ink, flex: 1, textAlign: isRTL ? "right" : "left" }}
          numberOfLines={1}
        >
          {isRTL ? item.name_ar : item.name_en}
        </Text>
        {/* Total completions is more meaningful than a tiny % bar */}
        <Text style={{ fontSize: 11, color: c.inkMuted, fontFamily: "Georgia" }}>
          {isRTL ? `${count} ×` : `×${count}`}
        </Text>
        <Text style={[styles.pct, { color: c.gold }]}>{pct}%</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: c.divider, overflow: "hidden", flexDirection: isRTL ? "row-reverse" : "row" }}>
        <View style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: c.gold, borderRadius: 3 }} />
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Exclusive Arabic/English pairs — Arabic must never carry letterSpacing/uppercase/bold.
  eyebrowEn: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  eyebrowAr: { fontFamily: "Amiri_400Regular", fontSize: 13, writingDirection: "rtl", textAlign: "right" },

  titleEn: { fontFamily: "Georgia", fontSize: 26, letterSpacing: -0.5, lineHeight: 30 },
  titleAr: { fontFamily: "Amiri_700Bold", fontSize: 28, lineHeight: 44, writingDirection: "rtl" },

  // Hero card
  heroCard: {
    marginHorizontal: 22,
    borderRadius: 18,
    borderWidth: 0.5,
    padding: 22,
  },
  bigNumber: {
    fontFamily: "Georgia",
    fontSize: 64,
    lineHeight: 70,
    color: PALETTE.goldFlare,
  },
  heroDaysEn: { fontSize: 14, fontWeight: "500" },
  heroDaysAr: { fontFamily: "Amiri_400Regular", fontSize: 16, writingDirection: "rtl" },

  statsRow: {
    borderTopWidth: 0.5,
    paddingTop: 16,
    alignItems: "center",
  },
  statDivider: { width: 0.5, height: 28 },
  statValue: { fontFamily: "Georgia", fontSize: 18, color: NIGHT.ink, marginBottom: 4 },
  statLabelEn: { fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 },
  statLabelAr: { fontFamily: "Amiri_400Regular", fontSize: 12, writingDirection: "rtl" },

  // Heatmap
  gridRow: { justifyContent: "space-between" },
  weekdayCell: { flex: 1, textAlign: "center" },
  weekdayCellEn: { fontSize: 9, fontWeight: "600", letterSpacing: 0.3 },
  weekdayCellAr: { fontSize: 11 },

  // Milestones
  milestoneRow: { justifyContent: "space-between", alignItems: "flex-start", marginTop: 4 },
  milestoneCol: { flex: 1, alignItems: "center", gap: 8 },
  // Track spans from the first dot centre (12.5%) to the last (87.5%); dots sit
  // on top with a solid fill so the line is only visible between them.
  milestoneTrack: { position: "absolute", top: 19, left: "12.5%", right: "12.5%", height: 2, borderRadius: 1 },
  milestoneDot: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  // English digits use Georgia; Arabic-Indic digits use the system font (Georgia
  // lacks Arabic glyphs) and never carry fontWeight/letterSpacing.
  milestoneNumEn: { fontFamily: "Georgia", fontSize: 14 },
  milestoneNumAr: { fontSize: 15 },
  milestoneLabelEn: { fontSize: 10, fontWeight: "500" },
  milestoneLabelAr: { fontSize: 12, writingDirection: "rtl" },

  // Consistency
  pct: { fontFamily: "Georgia", fontSize: 13, marginLeft: 8 },
});
