/**
 * FirstNurTip — a one-time, friendly explainer shown the first time a user earns
 * Nūr (which is also their first completed sunnah). Motivational + a 10-second
 * rundown of what Nūr is, how to earn it, and what it's for. Shows once ever
 * (AsyncStorage flag), then never again.
 *
 * Mounted at the app root; listens to the shared NurContext reward signal.
 */

import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Fanous } from "@/components/Fanous";
import LanternIcon from "@/components/LanternIcon";
import { useNur } from "@/contexts/NurContext";
import { useLang } from "@/hooks/useLang";
import { colors } from "@/constants/theme";
import { localizeNumber } from "@/lib/arabicNumerals";
import { hasSeenTip, markTipSeen } from "@/lib/tips";

const TIP_KEY = "nur";

export default function FirstNurTip() {
  const { reward } = useNur();
  const { t, isRTL, isDark } = useLang();
  const c = colors(isDark);
  const [visible, setVisible] = useState(false);
  const handled = useRef(false);

  // On the first reward of the session, check whether the tip was ever seen.
  useEffect(() => {
    if (!reward || handled.current) return;
    handled.current = true;
    hasSeenTip(TIP_KEY).then((seen) => { if (!seen) setVisible(true); });
  }, [reward?.nonce]);

  function dismiss() {
    markTipSeen(TIP_KEY);
    setVisible(false);
  }

  const tip = t.nurTip;
  const earnRows = [
    { icon: "check-circle", label: tip.earnDo,    amount: 5  },
    { icon: "moon",         label: tip.earnExtra, amount: 10 },
    { icon: "share-2",      label: tip.earnShare, amount: 15 },
  ] as const;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.gold + "33" }]}>
          <View style={{ alignItems: "center", marginTop: -4 }}>
            <Fanous mood="happy" size={84} isDark={isDark} />
          </View>

          {/* Title */}
          <Text style={[
            styles.title,
            { color: c.gold },
            isRTL ? { fontFamily: "Amiri_700Bold" } : { fontFamily: "Georgia" },
          ]}>
            {tip.title}
          </Text>

          {/* Body */}
          <Text style={[
            styles.body,
            { color: c.inkMuted },
            isRTL && { fontFamily: "Amiri_400Regular", fontSize: 15, lineHeight: 26, writingDirection: "rtl" },
          ]}>
            {tip.body}
          </Text>

          {/* Earn rows */}
          <Text style={[
            styles.eyebrow,
            { color: c.inkFaint },
            isRTL && { fontFamily: "Amiri_400Regular", fontSize: 13, letterSpacing: 0, textTransform: "none", textAlign: "right", writingDirection: "rtl" },
          ]}>
            {tip.earnTitle}
          </Text>
          <View style={{ gap: 8, alignSelf: "stretch" }}>
            {earnRows.map((r) => (
              <View
                key={r.icon}
                style={[styles.row, { borderColor: c.divider, flexDirection: isRTL ? "row-reverse" : "row" }]}
              >
                <Feather name={r.icon as any} size={16} color={c.gold} />
                <Text style={[
                  styles.rowLabel,
                  { color: c.ink },
                  isRTL && { fontFamily: "Amiri_400Regular", fontSize: 15, textAlign: "right" },
                ]}>
                  {r.label}
                </Text>
                <View style={[styles.amountPill, { backgroundColor: c.gold + "18", flexDirection: "row", alignItems: "center", gap: 3 }]}>
                  <Text style={{ color: c.gold, fontSize: 12, fontFamily: "Georgia" }}>
                    +{localizeNumber(r.amount, isRTL)}
                  </Text>
                  <LanternIcon size={11} color={c.gold} />
                </View>
              </View>
            ))}
          </View>

          {/* Spend line */}
          <Text style={[
            styles.spend,
            { color: c.inkMuted },
            isRTL && { fontFamily: "Amiri_400Regular", fontSize: 13, lineHeight: 22, writingDirection: "rtl" },
          ]}>
            {tip.spend}
          </Text>

          {/* CTA */}
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
  body: { fontSize: 13, lineHeight: 20, textAlign: "center", marginBottom: 4 },
  eyebrow: {
    fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.2,
    marginTop: 4, alignSelf: "stretch", textAlign: "left",
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 0.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
  },
  rowLabel: { flex: 1, fontSize: 14 },
  amountPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99 },
  spend: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 6 },
  cta: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  ctaText: { fontFamily: "Georgia", fontSize: 16, color: "#0e1a2b" },
});
