/**
 * WeekStrip — 7 circles showing the last 7 Islamic days.
 *
 * Each circle corresponds to one day. Gold filled = had any completion that day.
 * Dim = no completions. Today always has a small gold dot beneath it, and an
 * outlined border when empty (so the user always knows where "today" is).
 *
 * Dates are Hijri-adjusted (passed in from the home screen which computes
 * getEffectiveDate(maghrib)) so the strip respects the Maghrib day boundary.
 */

import { View, Text, StyleSheet } from "react-native";
import { useMemo } from "react";
import { useLang } from "@/hooks/useLang";
import { localDateString } from "@/lib/islamicDate";

interface Props {
  activeDates:    Set<string>; // YYYY-MM-DD dates that had ≥ 1 completion
  effectiveToday: string;      // YYYY-MM-DD (Hijri-adjusted today)
  isRTL:          boolean;
  isDark:         boolean;
  c: {
    gold:       string;
    inkFaint:   string;
    surface:    string;
    divider:    string;
  };
}

export function WeekStrip({ activeDates, effectiveToday, isRTL, isDark, c }: Props) {
  const { t } = useLang();

  const days = useMemo(() => {
    // Parse effectiveToday as a local date (avoid UTC midnight shift)
    const [y, mo, d] = effectiveToday.split("-").map(Number);
    const todayDate  = new Date(y, mo - 1, d);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(todayDate);
      date.setDate(date.getDate() - (6 - i)); // i=0 → 6 days ago … i=6 → today
      const dateStr = localDateString(date);
      return {
        dateStr,
        // weekdayLetters has dedicated single-char abbreviations per language —
        // avoids extracting [0] from Arabic day names (all start with "ا" from "ال").
        letter:  t.weekdayLetters[date.getDay()],
        isToday: i === 6,
        isDone:  activeDates.has(dateStr),
      };
    });
  }, [activeDates, effectiveToday, t.weekdays]);

  // Dim circle colour — slightly darker than bg but distinct from surface
  const emptyBg = isDark ? "#0d1929" : "#e8e0d0";

  return (
    <View style={[styles.strip, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
      {days.map((day) => (
        <View key={day.dateStr} style={styles.dayCol}>

          {/* Day letter — exclusive styles: Arabic must never have fontWeight/letterSpacing */}
          <Text style={[
            isRTL ? styles.letterAr : styles.letterEn,
            { color: day.isToday ? c.gold : c.inkFaint },
          ]}>
            {day.letter}
          </Text>

          {/* Circle */}
          <View style={[
            styles.circle,
            day.isDone
              ? { backgroundColor: c.gold }
              : { backgroundColor: emptyBg },
            // Today empty → gold outline
            day.isToday && !day.isDone && {
              borderWidth: 1.5,
              borderColor: c.gold,
            },
            // Today done → subtle glow (iOS shadow)
            day.isToday && day.isDone && {
              shadowColor: c.gold,
              shadowOpacity: 0.45,
              shadowRadius: 5,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            },
          ]}>
            {/* Tiny checkmark for done days */}
            {day.isDone && (
              <View style={[
                styles.checkDot,
                { backgroundColor: isDark ? "#0a1422" : "#ffffff" },
              ]} />
            )}
          </View>

          {/* Today indicator dot */}
          <View style={[
            styles.todayDot,
            { backgroundColor: day.isToday ? c.gold : "transparent" },
          ]} />

        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    justifyContent: "space-between",
  },
  dayCol: {
    flex:        1,
    alignItems:  "center",
    gap:         5,
  },
  // Exclusive letter styles — never merge these (fontWeight/letterSpacing must not appear on Arabic)
  letterEn: { fontSize: 9,  fontWeight: "600" as const, letterSpacing: 0.3 },
  letterAr: { fontSize: 11 },  // system font, no fontWeight, no letterSpacing
  circle: {
    width:        30,
    height:       30,
    borderRadius: 15,
    alignItems:   "center",
    justifyContent: "center",
  },
  // Small white/dark dot inside done circles (gives depth without an icon)
  checkDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
    opacity:      0.5,
  },
  todayDot: {
    width:        4,
    height:       4,
    borderRadius: 2,
  },
});
