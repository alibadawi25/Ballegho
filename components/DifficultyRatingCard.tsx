/**
 * DifficultyRatingCard — compact banner version.
 *
 * Shown on the home screen after a sunnah has been active for 7+ days.
 * Redesigned as a slim 2-row banner to minimise vertical footprint:
 *   Row 1: question text + dismiss button
 *   Row 2: 5 inline emoji rating buttons
 */

import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLang } from "@/hooks/useLang";
import type { RatingSunnah } from "@/hooks/useDifficultyRating";

interface Props {
  sunnah: RatingSunnah;
  onRate: (rating: number) => void;
  onDismiss: () => void;
}

const LEVELS = [
  { value: 1, emoji: "🌳", ar: "طبيعي جداً", en: "Natural"   },
  { value: 2, emoji: "🌿", ar: "سهل",        en: "Easy"      },
  { value: 3, emoji: "🌱", ar: "متوسط",      en: "Medium"    },
  { value: 4, emoji: "💪", ar: "صعب",        en: "Hard"      },
  { value: 5, emoji: "🔥", ar: "صعب جداً",   en: "Very hard" },
];

export function DifficultyRatingCard({ sunnah, onRate, onDismiss }: Props) {
  const { isRTL, isDark } = useLang();

  const gold    = isDark ? "#d4af37" : "#b8892a";
  const ink     = isDark ? "#f4ecd8" : "#0e1a2b";
  const inkMuted= isDark ? "#8a8876" : "#7a8193";
  const inkFaint= isDark ? "#4a5362" : "#b9bcc4";
  const surface = isDark ? "#122236" : "#ffffff";
  const divider = isDark ? "rgba(244,236,216,0.08)" : "rgba(14,26,43,0.1)";
  const bg      = isDark ? "#0e1a2b" : "#f5efe2";

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: gold + "35" }]}>
      {/* Row 1 — question + dismiss */}
      <View style={[styles.topRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Text style={[
          styles.question,
          { color: ink, flex: 1, textAlign: isRTL ? "right" : "left" },
          isRTL && { fontFamily: "Amiri_400Regular", fontSize: 14 },
        ]} numberOfLines={1}>
          {isRTL
            ? `كيف تجد ${sunnah.name_ar}؟`
            : `How natural is "${sunnah.name_en}"?`}
        </Text>
        <TouchableOpacity onPress={onDismiss} activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 0 }}>
          <Feather name="x" size={15} color={inkFaint} />
        </TouchableOpacity>
      </View>

      {/* Row 2 — 5 emoji buttons */}
      <View style={[styles.btns, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {LEVELS.map((lvl) => (
          <TouchableOpacity
            key={lvl.value}
            onPress={() => onRate(lvl.value)}
            activeOpacity={0.75}
            style={[styles.btn, { backgroundColor: bg, borderColor: divider }]}
          >
            <Text style={styles.emoji}>{lvl.emoji}</Text>
            <Text style={[
              styles.label, { color: inkMuted },
              isRTL && { fontFamily: "Amiri_400Regular", fontSize: 10 },
            ]}>
              {isRTL ? lvl.ar : lvl.en}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card:   { borderRadius: 12, borderWidth: 0.5, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  topRow: { alignItems: "center", gap: 8 },
  question:{ fontSize: 13, fontWeight: "500", lineHeight: 18 },
  btns:   { gap: 5 },
  btn:    { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 9, borderWidth: 0.5, gap: 3 },
  emoji:  { fontSize: 16 },
  label:  { fontSize: 9, fontWeight: "500", textAlign: "center" },
});
