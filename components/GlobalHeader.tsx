/**
 * GlobalHeader — the shared, persistent top strip (rendered once in the tab
 * layout): date (left) · Nūr balance + notifications bell (right).
 *
 * Subtle "Night & Gold" branding: a faint 8-point-star ornament behind the row,
 * a hairline gold divider so it reads as a real app bar, and a small lantern
 * (Fanous) mark on the Nūr chip with a soft gold glow.
 *
 * Self-contained: computes its own Maghrib-aware date (useHijriLine) and owns
 * the notification-permission state, so it takes no props.
 */

import { View, Text, TouchableOpacity, Alert, Linking, Platform, useWindowDimensions } from "react-native";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Svg, { Circle, G, Rect } from "react-native-svg";
import LanternIcon from "@/components/LanternIcon";
import { useLang } from "@/hooks/useLang";
import { useNur } from "@/contexts/NurContext";
import { usePrayerCtx } from "@/contexts/PrayerTimesContext";
import { useHijriLine } from "@/hooks/useHijriLine";
import { colors } from "@/constants/theme";
import { localizeNumber } from "@/lib/arabicNumerals";
import { getNotificationPermission, requestNotificationPermission } from "@/lib/notifications";

// Faint 8-point star (two overlapped squares) — Islamic geometric accent.
function StarOrnament({ color }: { color: string }) {
  const S = 46;
  return (
    <Svg width={S} height={S} viewBox="0 0 46 46">
      <G stroke={color} strokeWidth={1} fill="none" opacity={0.08}>
        <Rect x={9} y={9} width={28} height={28} transform="rotate(0 23 23)" />
        <Rect x={9} y={9} width={28} height={28} transform="rotate(45 23 23)" />
        <Circle cx={23} cy={23} r={4.5} />
      </G>
    </Svg>
  );
}

export default function GlobalHeader() {
  const insets = useSafeAreaInsets();
  const { isRTL, isDark } = useLang();
  const c = colors(isDark);
  const { width } = useWindowDimensions();
  const narrow = width < 360;
  const { balance } = useNur();

  const { prayers } = usePrayerCtx();
  const maghrib = prayers.find((p) => p.key === "maghrib")?.time ?? null;
  const dateLine = useHijriLine(maghrib);

  const [notifsEnabled, setNotifsEnabled] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "web") getNotificationPermission().then(setNotifsEnabled);
  }, []);

  async function handleBellPress() {
    if (notifsEnabled) {
      Alert.alert(
        isRTL ? "الإشعارات مفعّلة ✓" : "Notifications on",
        isRTL
          ? "ستصلك إشعارة عند الفجر لتذكيرك، وأخرى قبل المغرب إن لم تُتمّ سنتك المرساة."
          : "You get a Fajr nudge each morning and a Maghrib reminder if your anchor sunnah isn't done.",
        [
          { text: isRTL ? "موافق" : "OK", style: "cancel" },
          { text: isRTL ? "إعدادات النظام" : "System settings", onPress: () => Linking.openSettings() },
        ],
      );
    } else {
      const granted = await requestNotificationPermission();
      setNotifsEnabled(granted);
      if (!granted) {
        Alert.alert(
          isRTL ? "تفعيل الإشعارات" : "Enable notifications",
          isRTL ? "افتح إعدادات التطبيق حتى تصلك تذكيرات يومية." : "Open app settings to allow daily reminders.",
          [
            { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
            { text: isRTL ? "الإعدادات" : "Settings", onPress: () => Linking.openSettings() },
          ],
        );
      }
    }
  }

  return (
    <View style={{
      paddingTop: insets.top + 14,
      paddingHorizontal: 22,
      paddingBottom: 8,
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.bg,
      borderBottomWidth: 0.5,
      borderBottomColor: c.gold + "22",
    }}>
      {/* Faint geometric ornament behind the row (centered, decorative). */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: insets.top, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}
      >
        <StarOrnament color={c.gold} />
      </View>

      {/* Date */}
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: 10, fontWeight: "600",
          textTransform: isRTL ? "none" : "uppercase",
          ...(isRTL ? {} : { letterSpacing: 1.4 }),
          color: c.inkMuted,
          textAlign: isRTL ? "right" : "left",
          ...(isRTL ? { paddingLeft: 12 } : { paddingRight: 12 }),
        }}
      >
        {dateLine}
      </Text>

      {/* Coins + bell */}
      <View style={{ flexShrink: 0, flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: narrow ? 8 : 10 }}>
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 5,
          backgroundColor: c.gold + "18", borderColor: c.gold + "55", borderWidth: 0.5,
          borderRadius: 99, paddingHorizontal: 10, height: 28,
          shadowColor: c.gold, shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 3,
        }}>
          <LanternIcon size={13} color={c.gold} />
          <Text style={{ color: c.gold, fontSize: 13, fontFamily: "Georgia" }}>
            {localizeNumber(balance, isRTL)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleBellPress}
          activeOpacity={0.7}
          style={{
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: isDark ? "#0f1d31" : "#ede4d0",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Feather
            name={notifsEnabled ? "bell" : "bell-off"}
            size={17}
            color={notifsEnabled ? c.gold : (isDark ? "#4a5362" : "#b9bcc4")}
          />
          {notifsEnabled && (
            <View style={{
              position: "absolute", top: 6, right: 6,
              width: 6, height: 6, borderRadius: 3,
              backgroundColor: c.gold,
              borderWidth: 1, borderColor: isDark ? "#0f1d31" : "#ede4d0",
            }} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
