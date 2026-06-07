/**
 * ThemePicker — horizontal row of swatch circles for selecting a
 * SunnahShareCard theme before sharing. Some themes are cosmetic unlocks
 * bought with Nūr; locked ones show a lock + price and prompt to unlock on tap.
 */

import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLang } from "@/hooks/useLang";
import { useNur } from "@/contexts/NurContext";
import LanternIcon from "@/components/LanternIcon";
import { colors } from "@/constants/theme";
import { localizeNumber } from "@/lib/arabicNumerals";
import type { ShareTheme } from "@/components/SunnahShareCard";

// price 0 = free/default; >0 = costs Nūr (key matches unlock_cosmetic in DB).
const SWATCHES: { key: ShareTheme; bg: string; gold: string; en: string; ar: string; price: number }[] = [
  { key: "night",     bg: "#0e1a2b", gold: "#d4af37", en: "Night",     ar: "ليل",   price: 0   },
  { key: "parchment", bg: "#f5efe2", gold: "#b8892a", en: "Parchment", ar: "رق",    price: 0   },
  { key: "emerald",   bg: "#0f2a1e", gold: "#d4af37", en: "Emerald",   ar: "زمرد",  price: 60  },
  { key: "midnight",  bg: "#060f1b", gold: "#f2d064", en: "Midnight",  ar: "منتصف", price: 100 },
];

export default function ThemePicker({
  selected, onSelect, isRTL,
}: {
  selected: ShareTheme;
  onSelect: (t: ShareTheme) => void;
  isRTL?: boolean;
}) {
  const { isDark, t } = useLang();
  const c = colors(isDark);
  const { balance, owns, unlock } = useNur();

  function handlePress(sw: typeof SWATCHES[number]) {
    const locked = sw.price > 0 && !owns("share_theme", sw.key);
    if (!locked) { onSelect(sw.key); return; }

    Alert.alert(
      t.nur.unlockTitle,
      `${isRTL ? sw.ar : sw.en} · ${localizeNumber(sw.price, !!isRTL)} ${t.nur.label}\n${t.nur.balance}: ${localizeNumber(balance, !!isRTL)}`,
      [
        { text: t.nur.cancel, style: "cancel" },
        {
          text: t.nur.unlock,
          onPress: async () => {
            const ok = await unlock("share_theme", sw.key);
            if (ok) onSelect(sw.key);
            else Alert.alert("", t.nur.notEnough);
          },
        },
      ],
    );
  }

  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 14, marginBottom: 14 }}>
      {SWATCHES.map((sw) => {
        const active = selected === sw.key;
        const locked = sw.price > 0 && !owns("share_theme", sw.key);
        return (
          <TouchableOpacity
            key={sw.key}
            onPress={() => handlePress(sw)}
            activeOpacity={0.75}
            style={{ alignItems: "center", gap: 5 }}
          >
            <View style={{
              width: 34, height: 34, borderRadius: 17,
              backgroundColor: sw.bg,
              borderWidth: active ? 2.5 : 1.5,
              borderColor: active ? sw.gold : c.divider,
              alignItems: "center", justifyContent: "center",
              shadowColor:   active ? sw.gold : "transparent",
              shadowOpacity: active ? 0.55 : 0,
              shadowRadius:  active ? 7 : 0,
              shadowOffset:  { width: 0, height: 0 },
              elevation:     active ? 4 : 0,
            }}>
              {locked
                ? <Feather name="lock" size={12} color={sw.gold} />
                : active && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sw.gold }} />
                  )}
            </View>
            {locked ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                <Text style={{ fontSize: 9, color: c.gold }}>{localizeNumber(sw.price, !!isRTL)}</Text>
                <LanternIcon size={9} color={c.gold} />
              </View>
            ) : (
              <Text style={{
                fontSize: 9,
                color: active ? c.gold : c.inkFaint,
                ...(isRTL ? {} : { letterSpacing: 0.3, textTransform: "uppercase" as const }),
              }}>
                {isRTL ? sw.ar : sw.en}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
