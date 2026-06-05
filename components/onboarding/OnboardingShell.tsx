import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLang } from "@/hooks/useLang";

const TOTAL = 5;
const C = {
  bg:      "#0e1a2b",
  gold:    "#b8892a",
  divider: "rgba(244,236,216,0.08)",
  ink:     "#f4ecd8",
  muted:   "#4a5362",
  faint:   "#8a8876",
};

export function OnboardingShell({
  step,
  children,
  hideBack = false,
}: {
  step: number;
  children: React.ReactNode;
  hideBack?: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLang();

  // Use replace so we exit the nested onboarding Stack entirely and land
  // on the root-level (auth) group. push() from inside a nested Stack
  // can fail silently for cross-group routes.
  function goToSignIn() {
    router.replace("/(auth)/sign-in");
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      {/* Top bar */}
      <View style={[styles.topBar, isRTL && { flexDirection: "row-reverse" }]}>
        {!hideBack ? (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={20} color={C.muted} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}

        {/* Progress dots */}
        <View style={styles.dots}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i < step ? C.gold : i === step - 1 ? C.gold : C.muted,
                  opacity:         i < step ? 1     : i === step - 1 ? 1     : 0.3,
                  width:           i === step - 1   ? 20 : 6,
                },
              ]}
            />
          ))}
        </View>

        {/* Sign-in escape hatch — replaces the old empty placeholder */}
        <TouchableOpacity
          onPress={goToSignIn}
          activeOpacity={0.7}
          style={styles.signInBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.signInText, isRTL && styles.signInTextAr]}>
            {isRTL ? "دخول" : "Sign in"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(244,236,216,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  // Matches the width of the back button so the dots stay centred.
  signInBtn: {
    width: 38, height: 38,
    alignItems: "center", justifyContent: "center",
  },
  signInText: {
    fontSize: 12,
    color: C.faint,
    letterSpacing: 0.3,
  },
  signInTextAr: {
    fontFamily: "Amiri_400Regular",
    fontSize: 15,
  },
  content: {
    flex: 1,
  },
});
