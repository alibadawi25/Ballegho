/**
 * FirstTodayTip — a one-time welcome shown the first time the user reaches a
 * populated Today screen. Orients them to the core idea in ~10 seconds:
 * begin with your anchor, the app grows your practice for you, and there's no
 * guilt. Shows once ever (AsyncStorage flag via lib/tips), then never again.
 *
 * Rendered by the Today screen, which passes `ready` once its sunnahs load.
 */

import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Fanous } from "@/components/Fanous";
import { useLang } from "@/hooks/useLang";
import { colors } from "@/constants/theme";
import { hasSeenTip, markTipSeen } from "@/lib/tips";

const TIP_KEY = "today-welcome";

export default function FirstTodayTip({ ready }: { ready: boolean }) {
  const { t, isRTL, isDark } = useLang();
  const c = colors(isDark);
  const [visible, setVisible] = useState(false);
  const handled = useRef(false);

  useEffect(() => {
    if (!ready || handled.current) return;
    handled.current = true;
    hasSeenTip(TIP_KEY).then((seen) => { if (!seen) setVisible(true); });
  }, [ready]);

  function dismiss() {
    markTipSeen(TIP_KEY);
    setVisible(false);
  }

  const tip = t.todayTip;
  const rows = [
    { icon: "anchor",       title: tip.p1Title, sub: tip.p1Sub },
    { icon: "trending-up",  title: tip.p2Title, sub: tip.p2Sub },
    { icon: "heart",        title: tip.p3Title, sub: tip.p3Sub },
  ] as const;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.gold + "33" }]}>
          <View style={{ alignItems: "center", marginTop: -4 }}>
            <Fanous mood="happy" size={84} isDark={isDark} />
          </View>

          <Text style={[
            styles.title,
            { color: c.gold },
            isRTL ? { fontFamily: "Amiri_700Bold" } : { fontFamily: "Georgia" },
          ]}>
            {tip.title}
          </Text>

          <Text style={[
            styles.body,
            { color: c.inkMuted },
            isRTL && { fontFamily: "Amiri_400Regular", fontSize: 15, lineHeight: 26, writingDirection: "rtl" },
          ]}>
            {tip.body}
          </Text>

          {/* Three pillars of the idea */}
          <View style={{ gap: 10, alignSelf: "stretch", marginTop: 4 }}>
            {rows.map((r) => (
              <View
                key={r.icon}
                style={[styles.row, { borderColor: c.divider, flexDirection: isRTL ? "row-reverse" : "row" }]}
              >
                <View style={[styles.iconWrap, { backgroundColor: c.gold + "18" }]}>
                  <Feather name={r.icon as any} size={16} color={c.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.rowTitle,
                    { color: c.ink, textAlign: isRTL ? "right" : "left" },
                    isRTL && { fontFamily: "Amiri_700Bold", fontSize: 15 },
                  ]}>
                    {r.title}
                  </Text>
                  <Text style={[
                    styles.rowSub,
                    { color: c.inkMuted, textAlign: isRTL ? "right" : "left" },
                    isRTL && { fontFamily: "Amiri_400Regular", fontSize: 13, lineHeight: 20 },
                  ]}>
                    {r.sub}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={dismiss} activeOpacity={0.85} style={[styles.cta, { backgroundColor: c.gold }]}>
            <Text style={[styles.ctaText, isRTL && { fontFamily: "Amiri_700Bold", fontSize: 17 }]}>
              {tip.cta}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(6,15,27,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 0.5,
    padding: 22,
    gap: 10,
    ...(Platform.OS === "web" ? {} : {
      shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12,
    }),
  },
  title: { fontSize: 21, textAlign: "center" },
  body:  { fontSize: 13, lineHeight: 20, textAlign: "center", marginBottom: 2 },
  row: {
    alignItems: "center", gap: 12,
    borderWidth: 0.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
  },
  iconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rowTitle: { fontSize: 14, fontWeight: "600" },
  rowSub:   { fontSize: 12, lineHeight: 18, marginTop: 2 },
  cta: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 10 },
  ctaText: { fontFamily: "Georgia", fontSize: 16, color: "#0e1a2b" },
});
