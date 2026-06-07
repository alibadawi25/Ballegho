/**
 * SebhaCounter — tap-to-count widget for counter-type sunnahs (dhikr).
 *
 * A digital misbaḥa (سبحة): a big tappable ring that increments a count toward
 * a target (e.g. 33, 100). The parent owns persistence and completion — this
 * component is presentational plus the per-tap haptic.
 *
 *   - Tap anywhere on the ring → onIncrement()
 *   - Ring fills toward `target`; turns green once `done`
 *   - Reset zeroes the bead count (does NOT un-complete the day)
 *   - When `done`, a subtle "mark not done" link calls onUndo()
 *
 * Uses react-native-svg for the ring and RN's built-in Animated for the tap
 * pulse (the Reanimated worklets babel plugin is not configured — see AGENTS.md).
 */

import { useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { Colors } from "@/constants/theme";
import { localizeNumber } from "@/lib/arabicNumerals";

const SIZE = 236;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

interface CounterStrings {
  tapToCount: string;
  counterDone: string;
  reset: string;
  of: string;
  markNotDone: string;
}

export default function SebhaCounter({
  count,
  target,
  done,
  onIncrement,
  onReset,
  onUndo,
  c,
  isRTL,
  t,
}: {
  count: number;
  target: number;
  done: boolean;
  onIncrement: () => void;
  onReset: () => void;
  onUndo?: () => void;
  c: Colors;
  isRTL: boolean;
  t: CounterStrings;
}) {
  const progress = Math.min(count / target, 1);
  const dashoffset = CIRCUMFERENCE * (1 - progress);
  const ringColor = done ? c.green : c.gold;
  const scale = useRef(new Animated.Value(1)).current;

  function handleTap() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    // Quick pulse on the count.
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 70, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    onIncrement();
  }

  return (
    <View style={{ alignItems: "center", gap: 18 }}>
      {/* ── Tappable ring ──────────────────────────────────────────────── */}
      <TouchableOpacity activeOpacity={0.85} onPress={handleTap} style={styles.ringWrap}>
        <Svg width={SIZE} height={SIZE}>
          {/* Track */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={c.divider}
            strokeWidth={STROKE}
            fill="none"
          />
          {/* Progress — starts at 12 o'clock */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={ringColor}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>

        {/* Center readout */}
        <View style={styles.center}>
          <Animated.Text
            style={[
              styles.count,
              { color: done ? c.green : c.ink },
              isRTL ? styles.countAr : styles.countEn,
              { transform: [{ scale }] },
            ]}
          >
            {localizeNumber(count, isRTL)}
          </Animated.Text>
          <Text
            style={[
              styles.target,
              { color: c.inkMuted },
              isRTL && { fontSize: 15 },
            ]}
          >
            {t.of} {localizeNumber(target, isRTL)}
          </Text>
        </View>
      </TouchableOpacity>

      {/* ── Hint ───────────────────────────────────────────────────────── */}
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 7 }}>
        {done && <Feather name="check-circle" size={15} color={c.green} />}
        <Text
          style={[
            { fontSize: 13, color: done ? c.green : c.inkMuted },
            isRTL && { fontFamily: "Amiri_400Regular", fontSize: 15 },
          ]}
        >
          {done ? t.counterDone : t.tapToCount}
        </Text>
      </View>

      {/* ── Reset ──────────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onReset();
        }}
        activeOpacity={0.7}
        disabled={count === 0}
        style={[
          styles.resetBtn,
          { borderColor: c.divider, opacity: count === 0 ? 0.4 : 1, flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <Feather name="rotate-ccw" size={14} color={c.inkMuted} />
        <Text style={[{ fontSize: 13, color: c.inkMuted }, isRTL && { fontFamily: "Amiri_400Regular", fontSize: 15 }]}>
          {t.reset}
        </Text>
      </TouchableOpacity>

      {/* ── Undo completion (only once done, and only if undo is wired) ── */}
      {done && onUndo && (
        <TouchableOpacity onPress={onUndo} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[{ fontSize: 12, color: c.inkFaint }, isRTL && { fontFamily: "Amiri_400Regular", fontSize: 14 }]}>
            {t.markNotDone}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ringWrap: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 2 },
  count: { fontSize: 62, lineHeight: 70 },
  countEn: { fontFamily: "Georgia", fontWeight: "400" },
  countAr: {}, // system font — Georgia/Fraunces have no Arabic-Indic glyphs
  target: { fontSize: 13, marginTop: 2 },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 99,
    borderWidth: 0.5,
  },
});
