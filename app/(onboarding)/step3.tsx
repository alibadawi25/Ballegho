import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { useOnboarding, type ConsistencyLevel } from "@/contexts/OnboardingContext";
import { useLang } from "@/hooks/useLang";

const C = {
  bg:      "#0e1a2b",
  surface: "#122236",
  ink:     "#f4ecd8",
  muted:   "#8a8876",
  faint:   "#4a5362",
  gold:    "#b8892a",
  divider: "rgba(244,236,216,0.08)",
};

const OPTIONS: { level: ConsistencyLevel; emoji: string }[] = [
  { level: "beginner",   emoji: "🌱" },
  { level: "some",       emoji: "🌿" },
  { level: "consistent", emoji: "🌳" },
];

export default function Step3() {
  const router = useRouter();
  const { t, isRTL } = useLang();
  const s = t.onboarding.s3;
  const labels: Record<ConsistencyLevel, { label: string; sub: string }> = {
    beginner:   { label: s.beginnerLabel,   sub: s.beginnerSub },
    some:       { label: s.someLabel,       sub: s.someSub },
    consistent: { label: s.consistentLabel, sub: s.consistentSub },
  };
  const { consistencyLevel, setConsistency } = useOnboarding();

  return (
    <OnboardingShell step={3}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={isRTL ? styles.eyebrowAr : styles.eyebrow}>{s.eyebrow}</Text>
          <Text style={isRTL ? styles.titleAr : styles.title}>
            {s.titlePre}
            <Text style={{ color: C.gold }}>{s.titleGold}</Text>
            {s.titlePost}
          </Text>
          <Text style={[styles.subtitle, isRTL && styles.subtitleAr]}>{s.subtitle}</Text>
        </View>

        {/* Options */}
        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const active = consistencyLevel === opt.level;
            return (
              <TouchableOpacity
                key={opt.level}
                onPress={() => setConsistency(opt.level)}
                activeOpacity={0.8}
                style={[
                  styles.optionCard,
                  active && styles.optionCardActive,
                ]}
              >
                <Text style={styles.emoji}>{opt.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, isRTL && styles.optionLabelAr, active && { color: C.gold }]}>
                    {labels[opt.level].label}
                  </Text>
                  <Text style={[styles.optionSub, isRTL && styles.optionSubAr]}>{labels[opt.level].sub}</Text>
                </View>
                <View style={[
                  styles.radio,
                  active && { backgroundColor: C.gold, borderColor: C.gold },
                ]}>
                  {active && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Reassurance */}
        <View style={styles.note}>
          <Text style={isRTL ? styles.noteTextAr : styles.noteText}>
            {s.note}
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        {/* Next */}
        <TouchableOpacity
          style={[styles.btn, !consistencyLevel && styles.btnDisabled]}
          activeOpacity={consistencyLevel ? 0.85 : 1}
          onPress={() => consistencyLevel && router.push("/(onboarding)/step4")}
        >
          <Text style={[
            styles.btnText,
            isRTL && styles.btnTextAr,
            !consistencyLevel && styles.btnTextDisabled,
          ]}>
            {t.onboarding.continue}
          </Text>
        </TouchableOpacity>

      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginTop: 24, marginBottom: 32 },
  eyebrow: { fontSize: 10, fontWeight: "600", letterSpacing: 1.4, color: C.muted, marginBottom: 10 },
  eyebrowAr: { fontFamily: "Amiri_400Regular", fontSize: 13, fontWeight: "400", color: C.muted, textAlign: "right", writingDirection: "rtl" },
  title: {
    fontFamily: "Georgia", fontSize: 30, fontWeight: "400",
    color: C.ink, letterSpacing: -0.5, lineHeight: 38, marginBottom: 10,
  },
  titleAr: { fontFamily: "Amiri_700Bold", fontSize: 32, color: C.ink, lineHeight: 50, textAlign: "right", writingDirection: "rtl" },
  subtitle: { fontSize: 14, color: C.muted, lineHeight: 22 },
  subtitleAr: { fontFamily: "Amiri_400Regular", fontSize: 16, lineHeight: 26, textAlign: "right", writingDirection: "rtl" },
  options: { gap: 10 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 16,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.divider,
  },
  optionCardActive: {
    borderColor: C.gold,
    backgroundColor: "#b8892a10",
  },
  emoji: { fontSize: 28 },
  optionLabel: { fontSize: 16, color: C.ink, fontWeight: "500", marginBottom: 3 },
  optionLabelAr: { fontFamily: "Amiri_400Regular", fontSize: 18, fontWeight: "400", textAlign: "right", writingDirection: "rtl" },
  optionSub: { fontSize: 12, color: C.muted },
  optionSubAr: { fontFamily: "Amiri_400Regular", fontSize: 14, textAlign: "right", writingDirection: "rtl" },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.faint,
    alignItems: "center", justifyContent: "center",
  },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.bg },
  note: { marginTop: 16, alignItems: "center" },
  noteText: { fontSize: 11, color: C.faint, letterSpacing: 0.3 },
  noteTextAr: { fontFamily: "Amiri_400Regular", fontSize: 13, color: C.faint, writingDirection: "rtl" },
  btn: {
    backgroundColor: C.gold, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  // Disabled: keep a visible tint so the button is clearly inactive, not black
  btnDisabled: { backgroundColor: "rgba(244,236,216,0.12)" },
  btnText: { fontFamily: "Georgia", fontSize: 16, color: C.bg },
  btnTextAr: { fontFamily: "Amiri_700Bold", fontSize: 18 },
  btnTextDisabled: { color: "rgba(244,236,216,0.35)" },
});
