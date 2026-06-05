import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Polygon, G, Line } from "react-native-svg";
import { useLang } from "@/hooks/useLang";

const { width } = Dimensions.get("window");

// tashkeel: ba+fatha, lam+shadda+kasra, ghayn+damma, waw, alif
const BALLEGHO_AR = "بلّغوا";






function GeometricBg() {
  return (
    <Svg
      width={width * 1.2}
      height={width * 1.2}
      viewBox="0 0 400 400"
      style={StyleSheet.absoluteFillObject}
    >
      <G stroke="#b8892a" strokeWidth="0.8" fill="none" opacity={0.18}>
        <Circle cx="200" cy="200" r="180" />
        <Circle cx="200" cy="200" r="140" />
        <Circle cx="200" cy="200" r="100" />
        <Circle cx="200" cy="200" r="60"  />
        <Polygon points="200,30 370,130 370,270 200,370 30,270 30,130" />
        <Polygon points="200,60 340,140 340,260 200,340 60,260 60,140" />
      </G>
    </Svg>
  );
}

export default function WelcomeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { t, isRTL } = useLang();

  return (
    <View style={[styles.container, {
      paddingTop: insets.top + 24,
      paddingBottom: insets.bottom + 24,
    }]}>
      <View style={styles.bgWrap}>
        <GeometricBg />
      </View>

      {/* Center content */}
      <View style={styles.body}>
        {/* Ornament */}
        <Svg width={80} height={14} viewBox="0 0 80 14">
          <G stroke="#b8892a" fill="none" opacity={0.7}>
            <Circle cx="40" cy="7" r="3.5" strokeWidth="0.9" />
            <Circle cx="40" cy="7" r="1" fill="#b8892a" stroke="none" />
            <Line x1="0"    y1="7" x2="34"   y2="7" strokeWidth="0.8" opacity="0.5" />
            <Line x1="46"   y1="7" x2="80"   y2="7" strokeWidth="0.8" opacity="0.5" />
            <Line x1="40"   y1="1" x2="40"   y2="3.5" strokeWidth="0.9" />
            <Line x1="40"   y1="10.5" x2="40" y2="13" strokeWidth="0.9" />
            <Line x1="34"   y1="7" x2="36.5" y2="7" strokeWidth="0.9" />
            <Line x1="43.5" y1="7" x2="46"   y2="7" strokeWidth="0.9" />
          </G>
        </Svg>

        {/* Arabic wordmark — full tashkeel */}
        <Text style={styles.arabic}>{BALLEGHO_AR}</Text>

        {/* Latin wordmark */}
        <Text style={styles.wordmark}>Ballegho</Text>

        {/* Hadith — Arabic */}
        <Text style={styles.hadithArabic}>
          {"بَلِّغوا عَنِّي وَلَوْ آيَةً"}
        </Text>

        {/* Hadith — English */}
        <Text style={styles.tagline}>
          "Convey from me,{"\n"}even if it is one verse."
        </Text>
        <Text style={styles.source}>— The Prophet ﷺ · Bukhārī</Text>
      </View>

      {/* Bottom actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => router.push("/(onboarding)/step0")}
        >
          <Text style={[
            styles.primaryBtnText,
            isRTL && { fontFamily: "Amiri_700Bold", fontSize: 18 },
          ]}>
            {t.welcome.begin}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/(auth)/sign-in")}
        >
          <Text style={[
            styles.secondaryText,
            isRTL && { fontFamily: "Amiri_400Regular", fontSize: 16 },
          ]}>
            {t.welcome.haveAccount}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e1a2b",
    paddingHorizontal: 32,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  bgWrap: {
    position: "absolute",
    top: -80,
    right: -100,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  arabic: {
    fontFamily: "Amiri_700Bold",
    fontSize: 58,
    color: "#b8892a",
    marginTop: 18,
    lineHeight: 78,
    textAlign: "center",
  },
  wordmark: {
    fontFamily: "Georgia",
    fontSize: 44,
    fontWeight: "400",
    color: "#f5efe2",
    letterSpacing: -1,
    marginTop: 2,
    textAlign: "center",
  },
  hadithArabic: {
    fontFamily: "ScheherazadeNew_400Regular",
    fontSize: 22,
    color: "#f5efe2",
    opacity: 0.85,
    marginTop: 20,
    textAlign: "center",
    lineHeight: 38,
    writingDirection: "rtl",
  },
  tagline: {
    fontFamily: "Georgia",
    fontStyle: "italic",
    fontSize: 15,
    color: "#f5efe2",
    opacity: 0.7,
    marginTop: 6,
    lineHeight: 24,
    maxWidth: 260,
    textAlign: "center",
  },
  source: {
    fontSize: 11,
    color: "#b8892a",
    marginTop: 8,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  actions: {
    gap: 16,
    zIndex: 1,
  },
  primaryBtn: {
    backgroundColor: "#b8892a",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    fontFamily: "Georgia",
    fontSize: 16,
    fontWeight: "400",
    color: "#0e1a2b",
    letterSpacing: 0.2,
  },
  secondaryText: {
    textAlign: "center",
    fontSize: 13,
    color: "#f5efe2",
    opacity: 0.5,
  },
});
