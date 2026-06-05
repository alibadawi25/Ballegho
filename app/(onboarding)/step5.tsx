import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { useOnboarding, type SunnahOption } from "@/contexts/OnboardingContext";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/hooks/useLang";

const C = {
  bg:      "#0e1a2b",
  surface: "#122236",
  ink:     "#f4ecd8",
  muted:   "#8a8876",
  faint:   "#4a5362",
  gold:    "#b8892a",
  divider: "rgba(244,236,216,0.08)",
  emerald: "#2d6b4f",
};

export default function Step5() {
  const router = useRouter();
  const { t, isRTL } = useLang();
  const s = t.onboarding.s5;
  const { selectedIds, anchorId, setAnchor } = useOnboarding();
  const [sunnahs, setSunnahs] = useState<SunnahOption[]>([]);

  useEffect(() => {
    if (!selectedIds.length) return;
    supabase
      .from("sunnahs")
      .select("id, slug, name_en, name_ar, hadith_text_en, hadith_text_ar, hadith_source, estimated_seconds, difficulty_base, category, time_of_day")
      .in("id", selectedIds)
      .then(({ data }) => { if (data) setSunnahs(data); });
  }, [selectedIds]);

  return (
    <OnboardingShell step={5}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={isRTL ? styles.eyebrowAr : styles.eyebrow}>{s.eyebrow}</Text>
          <Text style={isRTL ? styles.titleAr : styles.title}>
            {s.titlePre}
            <Text style={{ color: C.gold }}>{s.titleGold}</Text>
            {s.titlePost}
          </Text>
        </View>

        {/* Explanation card */}
        <View style={[styles.explainCard, isRTL && { flexDirection: "row-reverse" }]}>
          <View style={styles.explainIcon}>
            <Feather name="anchor" size={16} color={C.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.explainTitle, isRTL && styles.explainTitleAr]}>{s.explainTitle}</Text>
            <Text style={[styles.explainBody, isRTL && styles.explainBodyAr]}>
              {s.explainBody}
            </Text>
          </View>
        </View>

        {/* Sunnah options */}
        <View style={styles.options}>
          {sunnahs.map((item) => {
            const active = anchorId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setAnchor(item.id)}
                activeOpacity={0.8}
                style={[styles.card, active && styles.cardActive]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.nameAr}>{item.name_ar}</Text>
                  <Text style={[styles.nameEn, isRTL && styles.nameEnAr, active && { color: C.ink }]}>{item.name_en}</Text>
                  {(isRTL ? item.hadith_text_ar : item.hadith_text_en) && (
                    <Text style={[styles.hadith, isRTL && styles.hadithAr]} numberOfLines={2}>
                      "{isRTL ? item.hadith_text_ar : item.hadith_text_en}"
                    </Text>
                  )}
                  {item.hadith_source && (
                    <Text style={styles.source}>— {item.hadith_source}</Text>
                  )}
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 24 }} />

        {/* Next */}
        <TouchableOpacity
          style={[styles.btn, !anchorId && styles.btnDisabled]}
          activeOpacity={anchorId ? 0.85 : 1}
          onPress={() => anchorId && router.push("/(onboarding)/step6")}
        >
          <Text style={[styles.btnText, isRTL && styles.btnTextAr, !anchorId && styles.btnTextDisabled]}>{t.onboarding.continue}</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginTop: 16, marginBottom: 20 },
  eyebrow: { fontSize: 10, fontWeight: "600", letterSpacing: 1.4, color: C.muted, marginBottom: 8 },
  eyebrowAr: { fontFamily: "Amiri_400Regular", fontSize: 13, fontWeight: "400", color: C.muted, textAlign: "right", writingDirection: "rtl" },
  title: {
    fontFamily: "Georgia", fontSize: 28, color: C.ink,
    letterSpacing: -0.5, lineHeight: 36,
  },
  titleAr: { fontFamily: "Amiri_700Bold", fontSize: 30, color: C.ink, lineHeight: 48, textAlign: "right", writingDirection: "rtl" },
  explainCard: {
    flexDirection: "row", gap: 14,
    backgroundColor: C.surface,
    borderRadius: 14, padding: 16,
    borderWidth: 0.5, borderColor: C.divider,
    marginBottom: 20,
  },
  explainIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#b8892a18",
    alignItems: "center", justifyContent: "center",
  },
  explainTitle: { fontSize: 13, color: C.gold, fontWeight: "600", marginBottom: 6 },
  explainTitleAr: { fontFamily: "Amiri_700Bold", fontSize: 16, fontWeight: "400", textAlign: "right", writingDirection: "rtl" },
  explainBody: { fontSize: 12, color: C.muted, lineHeight: 20 },
  explainBodyAr: { fontFamily: "Amiri_400Regular", fontSize: 14, lineHeight: 24, textAlign: "right", writingDirection: "rtl" },
  options: { gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: C.surface,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.divider,
  },
  cardActive: { borderColor: C.gold, backgroundColor: "#b8892a0e" },
  nameAr: {
    fontFamily: "Amiri_400Regular", fontSize: 17,
    color: C.gold, textAlign: "right",
    writingDirection: "rtl", lineHeight: 28, marginBottom: 4,
  },
  nameEn: { fontSize: 14, color: C.muted, marginBottom: 8, fontWeight: "500" },
  nameEnAr: { fontFamily: "Amiri_400Regular", fontWeight: "400", fontSize: 15, textAlign: "right", writingDirection: "rtl" },
  hadith: { fontSize: 11, color: C.faint, lineHeight: 17, fontStyle: "italic", marginBottom: 4 },
  hadithAr: { fontFamily: "Amiri_400Regular", fontStyle: "normal", fontSize: 13, lineHeight: 22, textAlign: "right", writingDirection: "rtl" },
  source: { fontSize: 10, color: C.faint },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: C.faint,
    alignItems: "center", justifyContent: "center",
    marginTop: 2, flexShrink: 0,
  },
  radioActive: { borderColor: C.gold, backgroundColor: C.gold },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.bg },
  btn: {
    backgroundColor: C.gold, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  btnDisabled: { backgroundColor: "rgba(244,236,216,0.12)" },
  btnText: { fontFamily: "Georgia", fontSize: 16, color: C.bg },
  btnTextAr: { fontFamily: "Amiri_700Bold", fontSize: 18 },
  btnTextDisabled: { color: "rgba(244,236,216,0.35)" },
});
