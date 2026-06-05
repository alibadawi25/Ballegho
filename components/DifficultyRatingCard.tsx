/**
 * DifficultyRatingCard
 *
 * Shown on the home screen after a sunnah has been active for 7+ days.
 * Asks the user how natural/hard this sunnah feels.
 * Their answer personalises the adaptive engine going forward.
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
  { value: 1, labelEn: "Natural",   labelAr: "طبيعي جداً", emoji: "🌳" },
  { value: 2, labelEn: "Easy",      labelAr: "سهل",        emoji: "🌿" },
  { value: 3, labelEn: "Medium",    labelAr: "متوسط",      emoji: "🌱" },
  { value: 4, labelEn: "Hard",      labelAr: "صعب",        emoji: "💪" },
  { value: 5, labelEn: "Very Hard", labelAr: "صعب جداً",   emoji: "🔥" },
];

export function DifficultyRatingCard({ sunnah, onRate, onDismiss }: Props) {
  const { t, isRTL, isDark } = useLang();

  const c = {
    bg:      isDark ? "#0e1a2b" : "#f5efe2",
    surface: isDark ? "#122236" : "#ffffff",
    ink:     isDark ? "#f4ecd8" : "#0e1a2b",
    inkMuted:isDark ? "#8a8876" : "#7a8193",
    inkFaint:isDark ? "#4a5362" : "#b9bcc4",
    gold:    isDark ? "#d4af37" : "#b8892a",
    divider: isDark ? "rgba(244,236,216,0.08)" : "rgba(14,26,43,0.1)",
  };

  return (
    <View style={[styles.card, {
      backgroundColor: c.surface,
      borderColor: c.gold + "40",
    }]}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.iconWrap, { backgroundColor: c.gold + "18" }]}>
          <Feather name="sliders" size={14} color={c.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, {
            color: c.gold,
            textAlign: isRTL ? "right" : "left",
            textTransform: isRTL ? "none" : "uppercase",
            ...(isRTL ? {} : { letterSpacing: 1.1 }),
          }]}>
            {isRTL ? "بعد أسبوع" : "After 7 days"}
          </Text>
          <Text style={[styles.question, {
            color: c.ink,
            textAlign: isRTL ? "right" : "left",
          }]}>
            {isRTL
              ? `كيف تجد ${sunnah.name_ar}؟`
              : `How natural does "${sunnah.name_en}" feel?`
            }
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} activeOpacity={0.7}>
          <Feather name="x" size={16} color={c.inkFaint} />
        </TouchableOpacity>
      </View>

      {/* Hadith reminder */}
      <Text style={[styles.reminder, { color: c.inkMuted, textAlign: "center" }]}>
        {isRTL
          ? "مستواك الشخصي يساعد التطبيق على اقتراح ما يناسبك"
          : "Your answer personalises what we suggest next"
        }
      </Text>

      {/* Rating buttons */}
      <View style={[styles.ratings, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {LEVELS.map((level) => (
          <TouchableOpacity
            key={level.value}
            onPress={() => onRate(level.value)}
            activeOpacity={0.75}
            style={[styles.ratingBtn, { borderColor: c.divider, backgroundColor: c.bg }]}
          >
            <Text style={styles.ratingEmoji}>{level.emoji}</Text>
            <Text style={[
              styles.ratingLabel,
              { color: c.inkMuted },
              isRTL && { fontFamily: "Amiri_400Regular", fontSize: 11 },
            ]}>
              {isRTL ? level.labelAr : level.labelEn}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  header: {
    alignItems: "flex-start",
    gap: 10,
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
  },
  eyebrow: {
    fontSize: 10, fontWeight: "600",
    marginBottom: 3,
  },
  question: {
    fontSize: 14, fontWeight: "500",
    lineHeight: 20,
  },
  reminder: {
    fontSize: 11,
    lineHeight: 17,
    opacity: 0.8,
  },
  ratings: {
    gap: 6,
  },
  ratingBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 0.5,
    gap: 4,
  },
  ratingEmoji: {
    fontSize: 18,
  },
  ratingLabel: {
    fontSize: 9,
    fontWeight: "500",
    textAlign: "center",
  },
});
