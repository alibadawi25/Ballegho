import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Svg, { Circle, G, Polygon } from "react-native-svg";
import { useSettings } from "@/contexts/SettingsContext";
import type { LangPref } from "@/contexts/SettingsContext";

const { width } = Dimensions.get("window");

const C = {
  bg:      "#0e1a2b",
  surface: "#122236",
  ink:     "#f4ecd8",
  muted:   "#8a8876",
  faint:   "#4a5362",
  gold:    "#b8892a",
  divider: "rgba(244,236,216,0.08)",
};

const OPTIONS: { value: LangPref; labelEn: string; labelAr: string }[] = [
  { value: "en",     labelEn: "English",  labelAr: "الإنجليزية" },
  { value: "ar",     labelEn: "Arabic",   labelAr: "العربية"    },
  { value: "system", labelEn: "Auto",     labelAr: "تلقائي"     },
];

export default function Step0() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { langPref, setLangPref } = useSettings();

  // First tap selects; Continue button navigates
  function handleSelect(lang: LangPref) {
    setLangPref(lang);
  }

  function handleContinue() {
    router.push("/(onboarding)/step1");
  }

  // Replace (not push) so we exit the nested onboarding Stack entirely.
  function handleSignIn() {
    router.replace("/(auth)/sign-in");
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>

      {/* Subtle background geometry */}
      <View style={styles.bgWrap}>
        <Svg width={width * 1.1} height={width * 1.1} viewBox="0 0 400 400">
          <G stroke="#b8892a" strokeWidth="0.6" fill="none" opacity={0.08}>
            <Circle cx="200" cy="200" r="180" />
            <Circle cx="200" cy="200" r="130" />
            <Circle cx="200" cy="200" r="80"  />
            <Polygon points="200,20 380,120 380,280 200,380 20,280 20,120" />
          </G>
        </Svg>
      </View>

      {/* Logo */}
      <View style={styles.logoWrap}>
        <Text style={styles.logoAr}>بلّغوا</Text>
        <Text style={styles.logoEn}>Ballegho</Text>
      </View>

      {/* Prompt — bilingual, since we don't know language yet */}
      <View style={styles.promptWrap}>
        <Text style={styles.promptAr}>اختر لغتك</Text>
        <Text style={styles.promptEn}>Choose your language</Text>
      </View>

      {/* Language options */}
      <View style={styles.options}>
        {/* English + Arabic as big primary buttons */}
        <View style={styles.mainRow}>
          {OPTIONS.filter(o => o.value !== "system").map((opt) => {
            const active = langPref === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => handleSelect(opt.value)}
                activeOpacity={0.8}
                style={[styles.mainBtn, active && styles.mainBtnActive]}
              >
                {active && (
                  <View style={styles.checkMark}>
                    <Feather name="check" size={12} color={C.bg} />
                  </View>
                )}
                <Text style={[styles.mainBtnAr, active && { color: C.bg }]}>
                  {opt.labelAr}
                </Text>
                <Text style={[styles.mainBtnEn, active && { color: C.bg + "cc" }]}>
                  {opt.labelEn}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Auto — smaller, secondary */}
        <TouchableOpacity
          onPress={() => handleSelect("system")}
          activeOpacity={0.7}
          style={[styles.autoBtn, langPref === "system" && { borderColor: C.gold + "60", backgroundColor: C.gold + "0e" }]}
        >
          <Text style={[styles.autoBtnText, langPref === "system" && { color: C.gold }]}>
            Use device language{" "}
            <Text style={{ color: langPref === "system" ? C.gold : C.faint }}>· تلقائي</Text>
          </Text>
        </TouchableOpacity>

        {/* Continue — only active after a selection */}
        <TouchableOpacity
          onPress={handleContinue}
          activeOpacity={langPref ? 0.85 : 1}
          style={[styles.continueBtn, { backgroundColor: langPref ? C.gold : C.faint }]}
        >
          <Text style={styles.continueBtnText}>
            {langPref === "ar" ? "متابعة" : "Continue"}
          </Text>
        </TouchableOpacity>

        {/* Sign-in escape hatch — bilingual since we don't know the lang yet */}
        <TouchableOpacity
          onPress={handleSignIn}
          activeOpacity={0.7}
          style={styles.signInLink}
          hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
        >
          <Text style={styles.signInLinkText}>
            Already have an account?{"  "}
            <Text style={styles.signInLinkGold}>Sign in · </Text>
            <Text style={styles.signInLinkAr}>تسجيل الدخول</Text>
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 28,
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
  },
  bgWrap: {
    position: "absolute",
    top: "10%",
    left: -width * 0.05,
    zIndex: 0,
  },

  // Logo
  logoWrap: {
    alignItems: "center",
    zIndex: 1,
    marginTop: 16,
  },
  logoAr: {
    fontFamily: "Amiri_700Bold",
    fontSize: 52,
    color: C.gold,
    lineHeight: 72,
  },
  logoEn: {
    fontFamily: "Georgia",
    fontSize: 32,
    color: C.ink,
    letterSpacing: -0.5,
    opacity: 0.85,
    marginTop: -4,
  },

  // Prompt
  promptWrap: {
    alignItems: "center",
    zIndex: 1,
  },
  promptAr: {
    fontFamily: "Amiri_400Regular",
    fontSize: 20,
    color: C.muted,
    marginBottom: 4,
    writingDirection: "rtl",
  },
  promptEn: {
    fontSize: 14,
    color: C.faint,
    letterSpacing: 0.5,
  },

  // Options
  options: {
    width: "100%",
    gap: 12,
    zIndex: 1,
  },
  mainRow: {
    flexDirection: "row",
    gap: 12,
  },
  mainBtn: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.divider,
    gap: 4,
  },
  mainBtnActive: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },
  mainBtnAr: {
    fontFamily: "Amiri_400Regular",
    fontSize: 20,
    color: C.gold,
    lineHeight: 28,
  },
  mainBtnEn: {
    fontSize: 12,
    color: C.muted,
    letterSpacing: 0.3,
  },
  autoBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: C.surface,
    borderWidth: 0.5,
    borderColor: C.divider,
  },
  autoBtnText: {
    fontSize: 13,
    color: C.muted,
  },
  checkMark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  continueBtnText: {
    fontFamily: "Georgia",
    fontSize: 16,
    color: C.bg,
  },
  signInLink: {
    alignItems: "center",
    paddingVertical: 6,
  },
  signInLinkText: {
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
  },
  signInLinkGold: {
    color: C.gold,
  },
  signInLinkAr: {
    fontFamily: "Amiri_400Regular",
    color: C.gold,
  },
});
