/**
 * MilestoneCard — full-screen celebration overlay shown when the user's
 * global streak hits a milestone (7 / 14 / 21 / 40 / 100 days).
 *
 * Animation: slides up from the bottom (Modal slide). The streak number
 * springs into view using React Native's built-in Animated API.
 * Always dark (Night & Gold palette) regardless of app theme.
 */

import { useRef, useEffect } from "react";
import {
  Modal, View, Text, TouchableOpacity,
  ScrollView, StyleSheet, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NIGHT, PALETTE } from "@/constants/theme";
import { Galabeya } from "@/components/Galabeya";
import { useLang } from "@/hooks/useLang";

// ─── Public exports ───────────────────────────────────────────────────────────

export const MILESTONE_DAYS = [7, 14, 21, 40, 100] as const;
export type MilestoneDay = typeof MILESTONE_DAYS[number];

interface Props {
  streak:    number | null; // null = hidden
  onDismiss: () => void;
}

// ─── Milestone content lookup ────────────────────────────────────────────────

function getMilestoneContent(t: ReturnType<typeof useLang>["t"], streak: number) {
  const m = t.milestones;
  switch (streak) {
    case 7:   return { headline: m.m7head,   body: m.m7body,   hadithAr: m.m7hadith, source: m.m7source };
    case 14:  return { headline: m.m14head,  body: m.m14body,  hadithAr: null,        source: null       };
    case 21:  return { headline: m.m21head,  body: m.m21body,  hadithAr: null,        source: null       };
    case 40:  return { headline: m.m40head,  body: m.m40body,  hadithAr: null,        source: null       };
    case 100: return { headline: m.m100head, body: m.m100body, hadithAr: null,        source: null       };
    default:  return null;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MilestoneCard({ streak, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLang();

  // Spring the number in from small when the modal opens
  const numScale = useRef(new Animated.Value(0.5)).current;
  const numOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (streak) {
      numScale.setValue(0.5);
      numOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(numScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(numOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [streak]);

  if (!streak || !MILESTONE_DAYS.includes(streak as MilestoneDay)) return null;

  const content = getMilestoneContent(t, streak);
  if (!content) return null;

  const N = NIGHT;
  const mascotMood = streak >= 40 ? "streak" : "happy";

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      {/* Tap-to-dismiss backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onDismiss}
      />

      {/* Sheet */}
      <View style={[
        styles.sheet,
        { backgroundColor: N.bg, paddingBottom: insets.bottom + 20 },
      ]}>
        {/* Handle bar */}
        <View style={[styles.handle, { backgroundColor: N.divider }]} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          bounces={false}
        >
          {/* Eyebrow */}
          <Text style={[
            isRTL ? styles.eyebrowAr : styles.eyebrowEn,
            { color: N.gold },
          ]}>
            {t.milestones.eyebrow}
          </Text>

          {/* Mascot */}
          <View style={styles.mascotWrap}>
            <Galabeya mood={mascotMood} size={110} animate />
          </View>

          {/* Animated streak number */}
          <Animated.Text style={[
            styles.number,
            { color: N.gold, transform: [{ scale: numScale }], opacity: numOpacity },
          ]}>
            {streak}
          </Animated.Text>

          {/* "days in a row" */}
          <Text style={[
            styles.daysLabel,
            { color: N.muted },
            isRTL && { fontFamily: "Amiri_400Regular", fontSize: 15, writingDirection: "rtl" },
          ]}>
            {t.milestones.days}
          </Text>

          {/* Headline */}
          <Text style={[
            styles.headlineEn,
            { color: N.ink },
            isRTL && styles.headlineAr,
          ]}>
            {content.headline}
          </Text>

          {/* Body */}
          <Text style={[
            styles.bodyEn,
            { color: N.muted },
            isRTL && styles.bodyAr,
          ]}>
            {content.body}
          </Text>

          {/* Hadith card (day 7 only) */}
          {content.hadithAr && (
            <View style={[styles.hadithCard, {
              backgroundColor: N.surface,
              borderColor: N.gold + "30",
            }]}>
              <Text style={[styles.hadithAr, { color: N.ink }]}>
                «{content.hadithAr}»
              </Text>
              {content.source && (
                <Text style={[styles.hadithSource, { color: N.faint }]}>
                  — {content.source}
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* Dismiss CTA */}
        <TouchableOpacity
          onPress={onDismiss}
          activeOpacity={0.85}
          style={[styles.dismissBtn, { backgroundColor: N.gold, marginHorizontal: 24 }]}
        >
          <Text style={[
            styles.dismissTextEn,
            isRTL && styles.dismissTextAr,
          ]}>
            {t.milestones.dismiss}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const N = NIGHT;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: "88%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 6,
  },

  // Eyebrow
  eyebrowEn: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  eyebrowAr: {
    fontFamily: "Amiri_400Regular",
    fontSize: 14,
    writingDirection: "rtl",
    marginBottom: 4,
  },

  // Mascot
  mascotWrap: { marginBottom: 4 },

  // Streak number
  number: {
    fontFamily: "Georgia",
    fontSize: 80,
    lineHeight: 90,
    fontWeight: "400",
    marginBottom: 0,
  },

  // "days in a row"
  daysLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 12,
  },

  // Headline
  headlineEn: {
    fontFamily: "Georgia",
    fontSize: 22,
    letterSpacing: -0.3,
    textAlign: "center",
    marginBottom: 8,
  },
  headlineAr: {
    fontFamily: "Amiri_700Bold",
    fontSize: 24,
    lineHeight: 38,
    writingDirection: "rtl",
    textAlign: "center",
    letterSpacing: 0, // override Georgia's letterSpacing
  },

  // Body
  bodyEn: {
    fontFamily: "Georgia",
    fontStyle: "italic",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 16,
  },
  bodyAr: {
    fontFamily: "Amiri_400Regular",
    fontSize: 17,
    lineHeight: 30,
    writingDirection: "rtl",
    textAlign: "center",
    fontStyle: "normal",
    letterSpacing: 0,
    marginBottom: 16,
  },

  // Hadith card (day 7)
  hadithCard: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 16,
    gap: 8,
    marginBottom: 8,
    alignItems: "flex-end",
  },
  hadithAr: {
    fontFamily: "Amiri_400Regular",
    fontSize: 17,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 30,
  },
  hadithSource: {
    fontSize: 11,
    textAlign: "right",
  },

  // Dismiss button
  dismissBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  dismissTextEn: {
    fontFamily: "Georgia",
    fontSize: 18,
    color: PALETTE.night2,
  },
  dismissTextAr: {
    fontFamily: "Amiri_700Bold",
    fontSize: 22,
    color: PALETTE.night2,
    writingDirection: "rtl",
  },
});
