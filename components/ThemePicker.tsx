/**
 * ThemePicker — horizontal row of 4 coloured swatch circles for selecting a
 * SunnahShareCard theme before sharing. Used in both the Learn and sunnah
 * detail share modals.
 */

import { View, Text, TouchableOpacity } from "react-native";
import { useLang } from "@/hooks/useLang";
import { colors } from "@/constants/theme";
import type { ShareTheme } from "@/components/SunnahShareCard";

const SWATCHES: { key: ShareTheme; bg: string; gold: string; en: string; ar: string }[] = [
  { key: "night",     bg: "#0e1a2b", gold: "#d4af37", en: "Night",     ar: "ليل"   },
  { key: "parchment", bg: "#f5efe2", gold: "#b8892a", en: "Parchment", ar: "رق"    },
  { key: "emerald",   bg: "#0f2a1e", gold: "#d4af37", en: "Emerald",   ar: "زمرد"  },
  { key: "midnight",  bg: "#060f1b", gold: "#f2d064", en: "Midnight",  ar: "منتصف" },
];

export default function ThemePicker({
  selected, onSelect, isRTL,
}: {
  selected: ShareTheme;
  onSelect: (t: ShareTheme) => void;
  isRTL?: boolean;
}) {
  const { isDark } = useLang();
  const c = colors(isDark);

  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 14, marginBottom: 14 }}>
      {SWATCHES.map((sw) => {
        const active = selected === sw.key;
        return (
          <TouchableOpacity
            key={sw.key}
            onPress={() => onSelect(sw.key)}
            activeOpacity={0.75}
            style={{ alignItems: "center", gap: 5 }}
          >
            <View style={{
              width: 34, height: 34, borderRadius: 17,
              backgroundColor: sw.bg,
              borderWidth: active ? 2.5 : 1.5,
              borderColor: active ? sw.gold : c.divider,
              alignItems: "center", justifyContent: "center",
              // Gold glow when active (iOS shadow)
              shadowColor:   active ? sw.gold : "transparent",
              shadowOpacity: active ? 0.55 : 0,
              shadowRadius:  active ? 7 : 0,
              shadowOffset:  { width: 0, height: 0 },
              elevation:     active ? 4 : 0,
            }}>
              {/* Small gold dot in the centre when selected */}
              {active && (
                <View style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: sw.gold,
                }} />
              )}
            </View>
            <Text style={{
              fontSize: 9,
              color: active ? c.gold : c.inkFaint,
              // No letterSpacing/uppercase on Arabic
              ...(isRTL ? {} : { letterSpacing: 0.3, textTransform: "uppercase" as const }),
            }}>
              {isRTL ? sw.ar : sw.en}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
