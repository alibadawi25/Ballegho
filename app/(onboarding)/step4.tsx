import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { useOnboarding, type SunnahOption, type ConsistencyLevel } from "@/contexts/OnboardingContext";
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
  rose:    "#a84a3d",
};

function formatTime(sec: number) {
  if (sec === 0) return "0 sec";
  if (sec < 60)  return `${sec} sec`;
  return `${Math.round(sec / 60)} min`;
}

// Difficulty filter per consistency level
const DIFFICULTY_MAP: Record<ConsistencyLevel, number[]> = {
  beginner:   [1, 2],
  some:       [1, 2, 3],
  consistent: [2, 3, 4],
};

// Prioritise certain slugs for first-time users
const STARTER_SLUGS = [
  "smile", "bismillah-eating", "sleep-right-side",
  "salawat", "alhamdulillah-sneeze", "spread-salam",
  "jazakallah", "right-shoe-first", "ayat-kursi-sleep",
  "drink-three-sips", "alhamdulillah-eating", "bismillah-enter-home",
];

export default function Step4() {
  const router = useRouter();
  const { t, isRTL } = useLang();
  const s = t.onboarding.s4;
  const { consistencyLevel, selectedIds, toggleSunnah, canSelectMore } = useOnboarding();
  const [sunnahs, setSunnahs] = useState<SunnahOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCap, setShowCap] = useState(false);

  useEffect(() => {
    async function load() {
      const difficulties = consistencyLevel
        ? DIFFICULTY_MAP[consistencyLevel]
        : [1, 2];

      const { data } = await supabase
        .from("sunnahs")
        .select("id, slug, name_en, name_ar, hadith_text_en, hadith_text_ar, hadith_source, estimated_seconds, difficulty_base, category, time_of_day")
        .in("difficulty_base", difficulties)
        .eq("is_occasional", false)
        .order("sort_order");

      if (!data) { setLoading(false); return; }

      // Sort: starter slugs first
      const sorted = [...data].sort((a, b) => {
        const ai = STARTER_SLUGS.indexOf(a.slug);
        const bi = STARTER_SLUGS.indexOf(b.slug);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });

      setSunnahs(sorted.slice(0, 12)); // show 12 max
      setLoading(false);
    }
    load();
  }, [consistencyLevel]);

  function handleToggle(id: string) {
    if (!canSelectMore && !selectedIds.includes(id)) {
      setShowCap(true);
      setTimeout(() => setShowCap(false), 2500);
      return;
    }
    toggleSunnah(id);
  }

  return (
    <OnboardingShell step={4}>
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

        {/* Counter */}
        <View style={[styles.counter, isRTL && { flexDirection: "row-reverse" }]}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.counterDot, selectedIds.length > i && styles.counterDotFilled]}
            />
          ))}
          <Text style={[styles.counterText, isRTL && styles.counterTextAr]}>
            {selectedIds.length} / 3 {s.selected}
          </Text>
        </View>

        {/* Cap warning */}
        {showCap && (
          <View style={[styles.capBanner, isRTL && { flexDirection: "row-reverse" }]}>
            <Feather name="info" size={13} color={C.gold} />
            <Text style={[styles.capText, isRTL && styles.capTextAr]}>
              {s.capText}
            </Text>
          </View>
        )}

        {/* Sunnah cards */}
        {loading ? (
          <ActivityIndicator color={C.gold} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={styles.grid}>
              {sunnahs.map((s) => {
                const selected = selectedIds.includes(s.id);
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => handleToggle(s.id)}
                    activeOpacity={0.8}
                    style={[styles.card, selected && styles.cardSelected]}
                  >
                    {/* Check */}
                    <View style={[styles.check, selected && styles.checkSelected]}>
                      {selected && <Feather name="check" size={12} color={C.bg} strokeWidth={2.5} />}
                    </View>

                    {/* Name */}
                    <Text style={styles.nameAr}>{s.name_ar}</Text>
                    <Text style={[styles.nameEn, selected && { color: C.ink }]}>{s.name_en}</Text>

                    {/* Footer */}
                    <View style={styles.cardFooter}>
                      <Text style={styles.timeEst}>{formatTime(s.estimated_seconds)}</Text>
                      {s.hadith_source && (
                        <Text style={styles.source}>{s.hadith_source}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Next */}
        <TouchableOpacity
          style={[styles.btn, selectedIds.length === 0 && styles.btnDisabled]}
          activeOpacity={selectedIds.length > 0 ? 0.85 : 1}
          onPress={() => selectedIds.length > 0 && router.push("/(onboarding)/step5")}
        >
          <Text style={[styles.btnText, isRTL && styles.btnTextAr, selectedIds.length === 0 && styles.btnTextDisabled]}>
            {t.onboarding.continue}
          </Text>
        </TouchableOpacity>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginTop: 16, marginBottom: 16 },
  eyebrow: { fontSize: 10, fontWeight: "600", letterSpacing: 1.4, color: C.muted, marginBottom: 8 },
  eyebrowAr: { fontFamily: "Amiri_400Regular", fontSize: 13, fontWeight: "400", color: C.muted, textAlign: "right", writingDirection: "rtl" },
  title: {
    fontFamily: "Georgia", fontSize: 26, color: C.ink,
    letterSpacing: -0.5, lineHeight: 34, marginBottom: 8,
  },
  titleAr: { fontFamily: "Amiri_700Bold", fontSize: 30, color: C.ink, lineHeight: 46, textAlign: "right", writingDirection: "rtl" },
  subtitle: { fontSize: 13, color: C.muted, lineHeight: 20 },
  subtitleAr: { fontFamily: "Amiri_400Regular", fontSize: 15, lineHeight: 24, textAlign: "right", writingDirection: "rtl" },
  counter: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  counterDot: {
    width: 8, height: 8, borderRadius: 4,
    borderWidth: 1.5, borderColor: C.faint,
  },
  counterDotFilled: { backgroundColor: C.gold, borderColor: C.gold },
  counterText: { fontSize: 11, color: C.muted, marginLeft: 4 },
  counterTextAr: { fontFamily: "Amiri_400Regular", fontSize: 13, marginLeft: 0, marginRight: 4 },
  capBanner: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    backgroundColor: "#b8892a14", borderRadius: 10,
    padding: 12, marginBottom: 10,
    borderWidth: 0.5, borderColor: "#b8892a40",
  },
  capText: { flex: 1, fontSize: 12, color: C.muted, lineHeight: 18 },
  capTextAr: { fontFamily: "Amiri_400Regular", fontSize: 14, lineHeight: 22, textAlign: "right", writingDirection: "rtl" },
  grid: {
    flexDirection: "row", flexWrap: "wrap", gap: 10,
    paddingBottom: 16,
  },
  card: {
    width: "47%",
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.divider,
  },
  cardSelected: {
    borderColor: C.gold,
    backgroundColor: "#b8892a0e",
  },
  check: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: C.faint,
    alignItems: "center", justifyContent: "center",
    marginBottom: 10,
  },
  checkSelected: { backgroundColor: C.gold, borderColor: C.gold },
  nameAr: {
    fontFamily: "Amiri_400Regular",
    fontSize: 15, color: C.gold,
    textAlign: "right", writingDirection: "rtl",
    lineHeight: 24, marginBottom: 4,
  },
  nameEn: { fontSize: 12, color: C.muted, lineHeight: 17, marginBottom: 10 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timeEst: { fontSize: 10, color: C.faint },
  source: { fontSize: 10, color: C.faint, fontStyle: "italic" },
  btn: {
    backgroundColor: C.gold, borderRadius: 14,
    paddingVertical: 16, alignItems: "center", marginTop: 12,
  },
  btnDisabled: { backgroundColor: "rgba(244,236,216,0.12)" },
  btnText: { fontFamily: "Georgia", fontSize: 16, color: C.bg },
  btnTextDisabled: { color: "rgba(244,236,216,0.35)" },
  btnTextAr: { fontFamily: "Amiri_700Bold", fontSize: 18 },
});
