/**
 * NurReward — a floating "+N ◈" that pops near the header whenever the Nūr
 * balance grows (completion, spontaneous sunnah, share). Mounted once at the
 * app root; driven by the shared NurContext `reward` signal. Uses RN's built-in
 * Animated (Reanimated worklets aren't configured — see AGENTS.md).
 */

import { useEffect, useRef, useState } from "react";
import { Animated, Text, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNur } from "@/contexts/NurContext";
import LanternIcon from "@/components/LanternIcon";
import { useLang } from "@/hooks/useLang";
import { colors } from "@/constants/theme";
import { localizeNumber } from "@/lib/arabicNumerals";

export default function NurReward() {
  const { reward } = useNur();
  const insets = useSafeAreaInsets();
  const { isRTL, isDark } = useLang();
  const c = colors(isDark);

  const [shown, setShown] = useState<{ amount: number; nonce: number } | null>(null);
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!reward) return;
    setShown(reward);
    opacity.setValue(0);
    translateY.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1,   duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -30, duration: 950, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => setShown(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reward?.nonce]);

  if (!shown) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      <Animated.View style={{
        position: "absolute",
        top: insets.top + 16,
        ...(isRTL ? { left: 22 } : { right: 22 }),
        opacity, transform: [{ translateY }],
        backgroundColor: "#0e1a2b", borderRadius: 99,
        borderWidth: 1, borderColor: c.gold + "66",
        paddingHorizontal: 12, paddingVertical: 6,
        flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 4,
        shadowColor: c.gold, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
      }}>
        <Text style={{ color: c.gold, fontSize: 13, fontWeight: "700" }}>
          +{localizeNumber(shown.amount, isRTL)}
        </Text>
        <LanternIcon size={12} color={c.gold} glow="#f2d064" />
      </Animated.View>
    </View>
  );
}
