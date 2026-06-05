import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Svg, { Circle, G, Line, Polygon } from "react-native-svg";
import { useLang } from "@/hooks/useLang";

const { width } = Dimensions.get("window");

const C = {
  bg:      "#0e1a2b",
  surface: "#0f1d2e",
  ink:     "#f4ecd8",
  gold:    "#b8892a",
  muted:   "rgba(244,236,216,0.45)",
  faint:   "rgba(244,236,216,0.15)",
};

const HADITH_AR = "أحبُّ الأعمالِ إلى اللّهِ أدومُها وإنْ قَلَّ";

export default function Step1() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLang();
  const s = t.onboarding.s1;

  return (
    <View style={[styles.container, {
      paddingTop: insets.top + 8,
      paddingBottom: insets.bottom + 24,
    }]}>

      {/* Subtle background geometry */}
      <View style={styles.bgWrap} pointerEvents="none">
        <Svg width={width * 1.3} height={width * 1.3} viewBox="0 0 400 400">
          <G stroke="#b8892a" strokeWidth="0.7" fill="none" opacity={0.1}>
            <Circle cx="200" cy="200" r="180" />
            <Circle cx="200" cy="200" r="130" />
            <Circle cx="200" cy="200" r="80"  />
            <Polygon points="200,20 380,120 380,280 200,380 20,280 20,120" />
            <Polygon points="200,60 340,140 340,260 200,340 60,260 60,140" />
          </G>
        </Svg>
      </View>

      {/* Top bar */}
      <View style={[styles.topBar, isRTL && { flexDirection: "row-reverse" }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={20} color={C.muted} />
        </TouchableOpacity>
        {/* Sign-in escape hatch */}
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/sign-in")}
          activeOpacity={0.7}
          style={styles.signInBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={isRTL ? { fontFamily: "Amiri_400Regular", fontSize: 15, color: "#4a5362" } : styles.signInBtnText}>
            {isRTL ? "دخول" : "Sign in"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Main content — natural flow, not floating ── */}
      <View style={styles.content}>

        {/* App wordmark — anchors the top */}
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmarkAr}>بلّغوا</Text>
          <View style={styles.wordmarkDivider} />
          <Text style={styles.wordmarkEn}>Ballegho</Text>
        </View>

        {/* Ornament */}
        <View style={styles.ornament}>
          <Svg width={120} height={14} viewBox="0 0 120 14">
            <G stroke="#b8892a" fill="none">
              <Line x1="0"  y1="7" x2="50" y2="7" strokeWidth="0.7" opacity="0.4"/>
              <Line x1="70" y1="7" x2="120" y2="7" strokeWidth="0.7" opacity="0.4"/>
              <Circle cx="60" cy="7" r="4" strokeWidth="1" opacity="0.7"/>
              <Circle cx="60" cy="7" r="1.5" fill="#b8892a" strokeWidth="0"/>
              <Line x1="54" y1="7" x2="56.5" y2="7" strokeWidth="1" opacity="0.7"/>
              <Line x1="63.5" y1="7" x2="66" y2="7" strokeWidth="1" opacity="0.7"/>
              <Line x1="60" y1="1" x2="60" y2="3.5" strokeWidth="1" opacity="0.7"/>
              <Line x1="60" y1="10.5" x2="60" y2="13" strokeWidth="1" opacity="0.7"/>
            </G>
          </Svg>
        </View>

        {/* Hadith card */}
        <View style={styles.hadithCard}>
          <Text style={styles.hadithAr}>{HADITH_AR}</Text>

          {/* English translation — only shown when not already in Arabic */}
          {!isRTL && (
            <Text style={styles.hadithEn}>{s.hadithEn}</Text>
          )}

          <Text style={isRTL ? styles.sourceAr : styles.source}>{s.source}</Text>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
        </View>

        {/* Tagline */}
        <View style={styles.taglineBlock}>
          <Text style={[styles.tagline, isRTL && styles.taglineAr]}>
            {s.tagline1}
          </Text>
          <Text style={[styles.tagline, isRTL && styles.taglineAr]}>
            {s.tagline2pre}
            <Text style={{ color: C.gold }}>{s.tagline2gold}</Text>
          </Text>
        </View>

      </View>

      {/* CTA */}
      <TouchableOpacity
        style={styles.btn}
        activeOpacity={0.85}
        onPress={() => router.push("/(onboarding)/step2")}
      >
        <Text style={[styles.btnText, isRTL && styles.btnTextAr]}>{s.cta}</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 28,
  },
  bgWrap: {
    position: "absolute",
    top: "5%",
    left: -width * 0.15,
    zIndex: 0,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    zIndex: 2,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(244,236,216,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  signInBtn: {
    width: 38, height: 38,
    alignItems: "center", justifyContent: "center",
  },
  signInBtnText: {
    fontSize: 12,
    color: "#4a5362",
    letterSpacing: 0.3,
  },

  // Content
  content: {
    flex: 1,
    justifyContent: "center",
    zIndex: 1,
    gap: 0,
  },

  // Wordmark
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginBottom: 28,
  },
  wordmarkAr: {
    fontFamily: "Amiri_700Bold",
    fontSize: 26,
    color: C.gold,
    lineHeight: 36,
  },
  wordmarkDivider: {
    width: 1,
    height: 20,
    backgroundColor: C.faint,
  },
  wordmarkEn: {
    fontFamily: "Georgia",
    fontSize: 18,
    color: C.ink,
    opacity: 0.6,
    letterSpacing: -0.3,
  },

  // Ornament
  ornament: {
    alignItems: "center",
    marginBottom: 24,
  },

  // Hadith
  hadithCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 24,
    borderWidth: 0.5,
    borderColor: "rgba(184,137,42,0.2)",
    alignItems: "center",
    gap: 14,
    marginBottom: 28,
  },
  hadithAr: {
    fontFamily: "Amiri_400Regular",
    fontSize: 21,
    color: C.gold,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 36,
  },
  hadithEn: {
    fontFamily: "Georgia",
    fontStyle: "italic",
    fontSize: 15,
    color: C.ink,
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.8,
  },
  source: {
    fontSize: 11,
    color: C.muted,
    letterSpacing: 0.3,
  },
  sourceAr: {
    fontFamily: "Amiri_400Regular",
    fontSize: 13,
    color: C.muted,
  },

  // Divider
  dividerRow: {
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    width: 32,
    height: 1,
    backgroundColor: C.faint,
  },

  // Tagline
  taglineBlock: {
    alignItems: "center",
    gap: 4,
  },
  tagline: {
    fontSize: 15,
    color: C.ink,
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.55,
  },
  taglineAr: {
    fontFamily: "Amiri_400Regular",
    fontSize: 18,
    lineHeight: 30,
    writingDirection: "rtl",
  },

  // CTA
  btn: {
    backgroundColor: C.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    zIndex: 1,
    marginTop: 24,
  },
  btnText: {
    fontFamily: "Georgia",
    fontSize: 16,
    color: C.bg,
  },
  btnTextAr: {
    fontFamily: "Amiri_700Bold",
    fontSize: 18,
  },
});
