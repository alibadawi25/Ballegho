import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from "react-native";
import { useRef, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import type { ActiveSunnah, GroupKey, SunnahProgress } from "@/hooks/useSunnahs";
import { useLang } from "@/hooks/useLang";
import * as Haptics from "expo-haptics";
import { localDateString } from "@/lib/islamicDate";
import { toArabicDigits as toAr } from "@/lib/arabicNumerals";

interface Colors {
  surface: string; divider: string; ink: string;
  inkMuted: string; inkFaint: string; gold: string; bg: string;
}

// ── Time labels + accent colours ──────────────────────────────────────

const GROUP_META: Record<GroupKey, { en: string; ar: string; icon: string; accent: string }> = {
  morning: { en: "Morning",   ar: "الصباح",  icon: "sun",      accent: "#c9a13b" },
  daily:   { en: "Daily",     ar: "اليومي",  icon: "activity", accent: "#b8892a" },
  evening: { en: "Evening",   ar: "المساء",  icon: "sunset",   accent: "#5b8dd9" },
  night:   { en: "Night",     ar: "الليل",   icon: "moon",     accent: "#8b7fc7" },
};

// ── Single sunnah row ──────────────────────────────────────────────────

function SunnahRow({
  sunnah, done, isAnchor, isRTL, c,
  showBlessing, currentStreak, groupKey, progress,
  onToggle, onPress, onPerform,
}: {
  sunnah:        ActiveSunnah;
  done:          boolean;
  isAnchor:      boolean;
  isRTL:         boolean;
  c:             Colors;
  showBlessing:  boolean;
  currentStreak: number;
  groupKey:      GroupKey;
  progress?:     SunnahProgress;
  onToggle:      () => void;
  onPress:       () => void;
  onPerform:     () => void;
}) {
  const accentColor = GROUP_META[groupKey].accent;
  const { t } = useLang();

  function formatTime(sec: number) {
    if (sec === 0) return null;
    if (sec < 60)  return `${sec}s`;
    return `${Math.round(sec / 60)}m`;
  }
  const timeLabel = formatTime(sunnah.estimated_seconds);

  // Multi-step sunnahs (counter / playlist) are *performed*, not just checked:
  // the leading control opens the counter/session instead of binary-completing,
  // and an "x/y" badge shows partial progress so doing some isn't lost.
  const isMultiStep   = sunnah.interaction_type !== "check";
  const partialLabel  = isMultiStep && !done && progress && progress.done > 0
    ? (isRTL ? `${toAr(progress.done)}/${toAr(progress.total)}` : `${progress.done}/${progress.total}`)
    : null;

  // ── Check circle spring bounce ──────────────────────────────────────
  const circleScale = useRef(new Animated.Value(1)).current;
  const prevDone    = useRef(done);

  useEffect(() => {
    if (done !== prevDone.current) {
      if (done) {
        // Checking: quick scale-up bounce
        Animated.sequence([
          Animated.timing(circleScale,  { toValue: 1.3, duration: 100, useNativeDriver: true }),
          Animated.spring(circleScale,  { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
        ]).start();
      } else {
        // Unchecking: quick dip
        Animated.sequence([
          Animated.timing(circleScale, { toValue: 0.75, duration: 80,  useNativeDriver: true }),
          Animated.timing(circleScale, { toValue: 1,    duration: 100, useNativeDriver: true }),
        ]).start();
      }
    }
    prevDone.current = done;
  }, [done]);

  // ── Blessing message fade ───────────────────────────────────────────
  // Fades in 300 ms after the anchor sunnah is checked, fades out on uncheck.
  const blessingOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showBlessing) {
      const timer = setTimeout(() => {
        Animated.timing(blessingOpacity, {
          toValue: 1, duration: 350, useNativeDriver: true,
        }).start();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      Animated.timing(blessingOpacity, {
        toValue: 0, duration: 200, useNativeDriver: true,
      }).start();
    }
  }, [showBlessing]);

  const blessingText = `بَارَكَ اللَّهُ فِيكَ · ${t.home.blessingDay} ${currentStreak}`;

  return (
    <View style={[
      styles.rowOuter,
      { flexDirection: isRTL ? "row-reverse" : "row" },
      done && { opacity: 0.55 },
    ]}>
      {/* Time-of-day colour strip — leading edge */}
      <View style={[
        styles.accentStrip,
        { backgroundColor: done ? c.divider : accentColor + "cc" },
      ]} />
    <View
      style={[
        styles.row,
        { flexDirection: isRTL ? "row-reverse" : "row", flex: 1 },
        isAnchor && !done && { backgroundColor: c.gold + "08" },
      ]}
    >
      {/* ── Leading control: checkbox for 'check', "perform" for multi-step ── */}
      <TouchableOpacity
        onPress={() => {
          if (isMultiStep && !done) {
            // Open the counter / session — performing, not binary-checking.
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPerform();
            return;
          }
          // Satisfying tap: success impact on check, light on uncheck.
          if (Platform.OS !== "web") {
            done
              ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          onToggle();
        }}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
      >
        <Animated.View
          style={[
            styles.check,
            done
              ? { backgroundColor: c.gold, borderColor: c.gold }
              : { borderColor: isMultiStep ? c.gold : isAnchor ? c.gold : c.inkMuted },
            { transform: [{ scale: circleScale }] },
          ]}
        >
          {done
            ? <Feather name="check" size={11} color={c.bg} />
            : isMultiStep
            ? <Feather name="play" size={9} color={c.gold} style={{ marginLeft: isRTL ? 0 : 1 }} />
            : null}
        </Animated.View>
      </TouchableOpacity>

      {/* ── Body (name + optional blessing + time) ── */}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.6}
        style={{ flex: 1, minWidth: 0 }}
      >
        <Text style={[
          styles.name,
          { color: done ? c.inkFaint : c.ink, textAlign: isRTL ? "right" : "left" },
          done && styles.strikethrough,
        ]}>
          {isRTL ? sunnah.name_ar : sunnah.name_en}
        </Text>

        {/* Blessing: "بَارَكَ اللَّهُ فِيكَ · Day N" */}
        {showBlessing && (
          <Animated.Text style={[
            styles.blessing,
            { color: c.gold, opacity: blessingOpacity },
          ]}>
            {blessingText}
          </Animated.Text>
        )}

        {/* Partial progress ("3/7") takes priority over the duration hint —
            it tells the user they've started and can pick up where they left off. */}
        {partialLabel && !done && !showBlessing ? (
          <Text style={[styles.timeSub, { color: c.gold, textAlign: isRTL ? "right" : "left" }]}>
            {partialLabel} · {isRTL ? "تابِع" : "continue"}
          </Text>
        ) : timeLabel && !done && !showBlessing ? (
          <Text style={[styles.timeSub, { color: c.inkFaint, textAlign: isRTL ? "right" : "left" }]}>
            {timeLabel}
          </Text>
        ) : null}
      </TouchableOpacity>

      {/* ── Anchor badge ── */}
      {isAnchor && (
        <View style={[styles.anchorBadge, { borderColor: c.gold + "60" }]}>
          <Text style={[styles.anchorText, { color: c.gold }]}>
            {isRTL ? "مرساة" : "anchor"}
          </Text>
        </View>
      )}

      {/* ── Per-sunnah streak ── */}
      {sunnah.current_streak > 1 && !done && (
        <View style={[styles.streak, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Feather name="zap" size={11} color={c.gold} />
          <Text style={[styles.streakNum, { color: c.gold }]}>{sunnah.current_streak}</Text>
        </View>
      )}

      {/* ── Chevron ── */}
      <Feather
        name={isRTL ? "chevron-left" : "chevron-right"}
        size={14}
        color={c.inkFaint}
        style={{ opacity: 0.5 }}
      />
    </View>
    </View>
  );
}

// ── Inline week dots (7-day strip inside the progress card) ───────────

function WeekDots({ activeDates, effectiveToday, isRTL, c, isDark }: {
  activeDates: Set<string>; effectiveToday: string;
  isRTL: boolean; c: Colors; isDark: boolean;
}) {
  const { t } = useLang();
  const [y, mo, d] = effectiveToday.split("-").map(Number);
  const todayDate  = new Date(y, mo - 1, d);
  const emptyBg    = isDark ? "#0d1929" : "#e8e0d0";

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(todayDate);
    date.setDate(date.getDate() - (6 - i));
    const dateStr = localDateString(date);
    return {
      dateStr,
      letter:  t.weekdayLetters[date.getDay()],
      isToday: i === 6,
      isDone:  activeDates.has(dateStr),
    };
  });

  return (
    <View style={[styles.weekRow, { flexDirection: isRTL ? "row-reverse" : "row", marginTop: 12 }]}>
      {days.map((day) => (
        <View key={day.dateStr} style={styles.weekCol}>
          <Text style={[
            isRTL ? styles.wLetterAr : styles.wLetterEn,
            { color: day.isToday ? c.gold : c.inkFaint },
          ]}>
            {day.letter}
          </Text>
          <View style={[
            styles.weekDot,
            day.isDone
              ? { backgroundColor: c.gold }
              : { backgroundColor: emptyBg },
            day.isToday && !day.isDone && { borderWidth: 1.5, borderColor: c.gold },
          ]} />
          <View style={[styles.weekTick, { backgroundColor: day.isToday ? c.gold : "transparent" }]} />
        </View>
      ))}
    </View>
  );
}

// ── Group section ──────────────────────────────────────────────────────

export function SunnahGroup({
  groupKey, sunnahs, completedIds, anchorIds,
  justCompletedId, currentStreak, progress, isNow,
  isRTL, c, onToggle, onPress, onPerform,
}: {
  groupKey:        GroupKey;
  sunnahs:         ActiveSunnah[];
  completedIds:    Set<string>;
  anchorIds:       Set<string>;
  justCompletedId: string | null;
  currentStreak:   number;
  progress:        Record<string, SunnahProgress>;
  isNow?:          boolean;
  isRTL:           boolean;
  c:               Colors;
  onToggle:        (id: string, done: boolean) => void;
  onPress:         (sunnah: ActiveSunnah) => void;
  onPerform:       (sunnah: ActiveSunnah) => void;
}) {
  if (!sunnahs.length) return null;

  const meta    = GROUP_META[groupKey];
  const done    = sunnahs.filter((s) => completedIds.has(s.sunnah_id)).length;
  const total   = sunnahs.length;
  const allDone = done === total;

  return (
    <View style={styles.group}>
      {/* Group header */}
      <View style={[styles.groupHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.groupLeft, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Feather name={meta.icon as any} size={12} color={allDone ? c.gold : isNow ? c.gold : meta.accent} />
          <Text style={[styles.groupLabel, {
            color: allDone ? c.gold : isNow ? c.gold : c.inkMuted,
            textTransform: isRTL ? "none" : "uppercase",
            ...(isRTL ? {} : { letterSpacing: 1.2 }),
          }]}>
            {isRTL ? meta.ar : meta.en}
          </Text>
          {/* "Now" — this is the time-relevant block right now. */}
          {isNow && !allDone && (
            <View style={[styles.nowPill, { backgroundColor: c.gold + "1c", borderColor: c.gold + "55" }]}>
              <View style={[styles.nowDot, { backgroundColor: c.gold }]} />
              <Text style={[styles.nowText, { color: c.gold }, isRTL && { fontFamily: "Amiri_400Regular", fontSize: 11 }]}>
                {isRTL ? "الآن" : "now"}
              </Text>
            </View>
          )}
        </View>
        {allDone ? (
          <View style={[styles.allDonePill, { borderColor: c.gold + "60", backgroundColor: c.gold + "14" }]}>
            <Feather name="check" size={9} color={c.gold} />
            <Text style={{ fontSize: 9, color: c.gold, fontWeight: "600" }}>
              {isRTL ? "تمّ" : "Done"}
            </Text>
          </View>
        ) : (
          <Text style={[styles.groupCount, { color: c.inkFaint }]}>
            {isRTL ? `${toAr(done)}/${toAr(total)}` : `${done}/${total}`}
          </Text>
        )}
      </View>

      {/* Sunnah rows */}
      <View style={[styles.card, {
        backgroundColor: c.surface,
        borderColor: allDone ? c.gold + "40" : c.divider,
        borderLeftWidth: allDone ? 0 : 0,
      }]}>
        {sunnahs.map((s, i) => {
          const isAnchor    = anchorIds.has(s.sunnah_id);
          const isDone      = completedIds.has(s.sunnah_id);
          const showBless   = isAnchor && s.sunnah_id === justCompletedId && isDone;

          return (
            <View key={s.sunnah_id}>
              {i > 0 && <View style={[styles.rowDivider, { backgroundColor: c.divider }]} />}
              <SunnahRow
                sunnah={s}
                done={isDone}
                isAnchor={isAnchor}
                isRTL={isRTL}
                c={c}
                showBlessing={showBless}
                currentStreak={currentStreak}
                groupKey={groupKey}
                progress={progress[s.sunnah_id]}
                onToggle={() => onToggle(s.sunnah_id, isDone)}
                onPress={() => onPress(s)}
                onPerform={() => onPerform(s)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Progress bar + streak ──────────────────────────────────────────────

export function DayProgress({
  done, total, streak, isRTL, c,
  activeDates, effectiveToday, isDark,
}: {
  done: number; total: number; streak: number; isRTL: boolean; c: Colors;
  activeDates?: Set<string>; effectiveToday?: string; isDark?: boolean;
}) {
  const pct = total > 0 ? done / total : 0;

  const streakScale = useRef(new Animated.Value(1)).current;
  const prevStreak  = useRef(streak);
  useEffect(() => {
    if (streak > prevStreak.current) {
      Animated.sequence([
        Animated.timing(streakScale, { toValue: 1.35, duration: 130, useNativeDriver: true }),
        Animated.spring(streakScale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      ]).start();
    }
    prevStreak.current = streak;
  }, [streak]);

  const allDone = total > 0 && done === total;

  return (
    <View style={[
      styles.progressCard,
      {
        backgroundColor: allDone ? c.gold + "14" : c.surface,
        borderColor: allDone ? c.gold + "50" : c.divider,
      },
    ]}>
      <View style={[styles.progressRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {/* Done count — big, then "من N سنة" / "of N sunnahs" context.
            Arabic: flex-end so mixed Amiri/Georgia cap heights don't float the big number.
            English: baseline since both texts are Georgia and align naturally. */}
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: isRTL ? "flex-end" : "baseline", gap: 6 }}>
          <Text style={[styles.progressNum, { color: allDone ? c.gold : c.ink, fontFamily: "Georgia" }]}>
            {isRTL ? toAr(done) : done}
          </Text>
          <Text style={[
            styles.progressOf,
            { color: c.inkMuted },
            isRTL && { fontFamily: "Amiri_400Regular", fontSize: 15, paddingBottom: 3 },
          ]}>
            {isRTL ? `من ${toAr(total)} سنة` : `of ${total} sunnahs`}
          </Text>
        </View>

        {/* Streak */}
        {streak > 0 && (
          <View style={[styles.streakRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Feather name="zap" size={13} color={c.gold} />
            <Animated.Text style={[
              styles.streakBig,
              { color: c.gold, fontFamily: "Georgia", transform: [{ scale: streakScale }] },
            ]}>
              {isRTL ? toAr(streak) : streak}
            </Animated.Text>
            <Text style={[
              styles.streakLabel,
              { color: c.inkMuted },
              isRTL && { fontFamily: "Amiri_400Regular", fontSize: 13 },
            ]}>
              {isRTL ? "يوم متتالي" : "day streak"}
            </Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View style={[styles.bar, { backgroundColor: c.divider, marginTop: 10 }]}>
        <View style={[
          styles.barFill,
          { width: `${pct * 100}%` as any, backgroundColor: c.gold },
        ]} />
      </View>

      {/* ── Inline 7-day week strip ──────────────────────────── */}
      {activeDates !== undefined && effectiveToday !== undefined && (
        <WeekDots
          activeDates={activeDates}
          effectiveToday={effectiveToday}
          isRTL={isRTL}
          c={c}
          isDark={isDark ?? false}
        />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Row with accent strip
  rowOuter: {
    overflow: "hidden",
  },
  accentStrip: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 0,
    flexShrink: 0,
  },
  row: {
    paddingHorizontal: 14, paddingVertical: 13,
    alignItems: "center", gap: 12,
  },
  check: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  name:         { fontSize: 13, fontWeight: "500", lineHeight: 18 },
  strikethrough:{ textDecorationLine: "line-through" },
  timeSub:      { fontSize: 10, marginTop: 1 },
  blessing: {
    fontFamily: "Amiri_400Regular",
    fontSize: 12,
    marginTop: 3,
    lineHeight: 18,
  },
  anchorBadge: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 99, borderWidth: 1,
  },
  anchorText: { fontSize: 9, fontWeight: "600" },
  streak:     { alignItems: "center", gap: 2 },
  streakNum:  { fontSize: 11, fontWeight: "600" },

  // Group
  group: { marginBottom: 16 },
  groupHeader: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  groupLeft:  { alignItems: "center", gap: 6 },
  groupLabel: { fontSize: 10, fontWeight: "600" },
  nowPill:    { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, borderWidth: 0.5 },
  nowDot:     { width: 5, height: 5, borderRadius: 3 },
  nowText:    { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  groupCount: { fontSize: 12, fontFamily: "Georgia" },
  allDonePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 99, borderWidth: 1,
  },
  card:       { borderRadius: 14, borderWidth: 0.5, overflow: "hidden" },
  rowDivider: { height: 0.5, marginHorizontal: 14 },

  // Progress card
  progressCard: {
    borderRadius: 14,
    borderWidth: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  progressRow: { justifyContent: "space-between", alignItems: "baseline" },
  progressNum: { fontSize: 28, fontWeight: "400" },
  progressOf:  { fontSize: 14 },
  streakRow:   { alignItems: "center", gap: 4 },
  streakBig:   { fontSize: 18, fontWeight: "400" },
  streakLabel: { fontSize: 11 },
  bar:         { height: 4, borderRadius: 2, overflow: "hidden" },
  barFill:     { height: "100%", borderRadius: 2 },

  // Inline week dots
  weekRow:   { justifyContent: "space-between" },
  weekCol:   { flex: 1, alignItems: "center", gap: 4 },
  wLetterEn: { fontSize: 8, fontWeight: "600" as const, letterSpacing: 0.2 },
  wLetterAr: { fontSize: 10 },
  weekDot:   { width: 22, height: 22, borderRadius: 11 },
  weekTick:  { width: 3, height: 3, borderRadius: 2 },
});
