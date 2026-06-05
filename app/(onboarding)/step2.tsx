import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useLang } from "@/hooks/useLang";

const C = {
  bg:      "#0e1a2b",
  surface: "#122236",
  ink:     "#f4ecd8",
  muted:   "#8a8876",
  faint:   "#4a5362",
  gold:    "#b8892a",
  divider: "rgba(244,236,216,0.08)",
};

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
}

function TimeRow({
  icon, label, sublabel, time, onPress, isRTL,
}: {
  icon: string; label: string; sublabel: string; time: Date; onPress: () => void; isRTL: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.timeRow, isRTL && { flexDirection: "row-reverse" }]}
    >
      <View style={styles.timeIcon}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.timeLabel, isRTL && styles.timeLabelAr]}>{label}</Text>
        <Text style={[styles.timeSub, isRTL && styles.timeSubAr]}>{sublabel}</Text>
      </View>
      <Text style={styles.timeValue}>{formatTime(time)}</Text>
    </TouchableOpacity>
  );
}

export default function Step2() {
  const router = useRouter();
  const { t, isRTL } = useLang();
  const s = t.onboarding.s2;
  const { wakeTime, sleepTime, setWakeTime, setSleepTime } = useOnboarding();
  const [picking, setPicking] = useState<"wake" | "sleep" | null>(null);

  const currentTime = picking === "wake" ? wakeTime : sleepTime;

  function handleChange(_: any, date?: Date) {
    if (!date) { setPicking(null); return; }
    if (picking === "wake") setWakeTime(date);
    else setSleepTime(date);
    if (Platform.OS === "android") setPicking(null);
  }

  return (
    <OnboardingShell step={2}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={isRTL ? styles.eyebrowAr : styles.eyebrow}>{s.eyebrow}</Text>
          <Text style={isRTL ? styles.titleAr : styles.title}>
            {s.titlePre}
            <Text style={{ color: C.gold }}>{s.titleGold}</Text>
            {s.titlePost}
          </Text>
          <Text style={[styles.subtitle, isRTL && styles.subtitleAr]}>
            {s.subtitle}
          </Text>
        </View>

        {/* Time pickers */}
        <View style={styles.card}>
          <TimeRow
            icon="🌅"
            label={s.wakeLabel}
            sublabel={s.wakeSub}
            time={wakeTime}
            isRTL={isRTL}
            onPress={() => setPicking("wake")}
          />
          <View style={styles.rowDivider} />
          <TimeRow
            icon="🌙"
            label={s.sleepLabel}
            sublabel={s.sleepSub}
            time={sleepTime}
            isRTL={isRTL}
            onPress={() => setPicking("sleep")}
          />
        </View>

        {/* Inline picker (iOS shows inline, Android shows modal) */}
        {picking && (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={currentTime}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleChange}
              textColor={C.ink}
              themeVariant="dark"
            />
            {Platform.OS === "ios" && (
              <TouchableOpacity
                onPress={() => setPicking(null)}
                style={styles.doneBtn}
                activeOpacity={0.8}
              >
                <Text style={[{ color: C.gold, fontSize: 14, fontWeight: "600" }, isRTL && { fontFamily: "Amiri_700Bold", fontWeight: "400" }]}>{t.onboarding.done}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ flex: 1 }} />

        {/* Next */}
        <TouchableOpacity
          style={styles.btn}
          activeOpacity={0.85}
          onPress={() => router.push("/(onboarding)/step3")}
        >
          <Text style={[styles.btnText, isRTL && styles.btnTextAr]}>{t.onboarding.continue}</Text>
        </TouchableOpacity>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginTop: 24, marginBottom: 32 },
  eyebrow: {
    fontSize: 10, fontWeight: "600", letterSpacing: 1.4,
    color: C.muted, marginBottom: 10,
  },
  eyebrowAr: {
    fontFamily: "Amiri_400Regular", fontSize: 13, fontWeight: "400",
    color: C.muted, textAlign: "right", writingDirection: "rtl",
  },
  title: {
    fontFamily: "Georgia", fontSize: 30, fontWeight: "400",
    color: C.ink, letterSpacing: -0.5, lineHeight: 38, marginBottom: 12,
  },
  titleAr: {
    fontFamily: "Amiri_700Bold", fontSize: 32,
    color: C.ink, lineHeight: 50, textAlign: "right", writingDirection: "rtl",
  },
  subtitle: {
    fontSize: 14, color: C.muted, lineHeight: 22,
  },
  subtitleAr: {
    fontFamily: "Amiri_400Regular", fontSize: 16, lineHeight: 26,
    textAlign: "right", writingDirection: "rtl",
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: C.divider,
    overflow: "hidden",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 14,
  },
  timeIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "rgba(244,236,216,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  timeLabel: { fontSize: 14, color: C.ink, fontWeight: "500", marginBottom: 2 },
  timeLabelAr: { fontFamily: "Amiri_400Regular", fontSize: 16, fontWeight: "400", textAlign: "right", writingDirection: "rtl" },
  timeSub: { fontSize: 11, color: C.muted },
  timeSubAr: { fontFamily: "Amiri_400Regular", fontSize: 13, textAlign: "right", writingDirection: "rtl" },
  timeValue: {
    fontFamily: "Georgia", fontSize: 18, color: C.gold, fontWeight: "400",
  },
  rowDivider: { height: 0.5, backgroundColor: C.divider, marginHorizontal: 18 },
  pickerWrap: {
    marginTop: 16,
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: C.divider,
  },
  doneBtn: {
    alignItems: "flex-end",
    padding: 14,
    borderTopWidth: 0.5,
    borderTopColor: C.divider,
  },
  btn: {
    backgroundColor: C.gold, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  btnText: { fontFamily: "Georgia", fontSize: 16, color: C.bg },
  btnTextAr: { fontFamily: "Amiri_700Bold", fontSize: 18 },
});
