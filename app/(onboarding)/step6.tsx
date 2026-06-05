import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, KeyboardAvoidingView,
  Platform, ScrollView,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Galabeya } from "@/components/Galabeya";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/hooks/useLang";

const C = {
  bg:      "#0e1a2b",
  surface: "#122236",
  ink:     "#f4ecd8",
  muted:   "#8a8876",
  faint:   "#4a5362",
  gold:    "#b8892a",
  divider: "rgba(244,236,216,0.08)",
  error:   "#d27866",
};

export default function Step6() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { t, isRTL } = useLang();
  const s = t.onboarding.s6;
  const { signUp } = useAuth();
  const { wakeTime, sleepTime, consistencyLevel, selectedIds, anchorId } = useOnboarding();

  const [anchorName,   setAnchorName]   = useState("");
  const [anchorNameAr, setAnchorNameAr] = useState("");

  // Sign-up form
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!anchorId) return;
    supabase.from("sunnahs").select("name_en, name_ar").eq("id", anchorId).single()
      .then(({ data }) => {
        if (data) { setAnchorName(data.name_en); setAnchorNameAr(data.name_ar); }
      });
  }, [anchorId]);

  async function handleBegin() {
    if (!name.trim())         { setError(s.errName);     return; }
    if (!email.trim())        { setError(s.errEmail);    return; }
    if (password.length < 6)  { setError(s.errPassword); return; }

    setSaving(true);
    setError(null);

    // 1. Create account — email confirmation is disabled on this project, so a
    //    session is returned immediately. The DB trigger also immediately creates
    //    the user_behavioral_profile row (with onboarding_complete=false).
    const authError = await signUp(email.trim(), password, name.trim());
    if (authError) { setError(authError.message); setSaving(false); return; }

    // 2. Read the session that was just created.
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;
    if (!userId) { setError(s.errGeneric); setSaving(false); return; }

    // 3. Write onboarding data — BEFORE navigating so AuthGate reads the
    //    correct onboarding_complete=true when segments flip to "(tabs)".
    const [profileResult, sunnahResult] = await Promise.all([
      supabase.from("user_behavioral_profile").upsert({
        user_id:             userId,
        wake_time:           `${String(wakeTime.getHours()).padStart(2,"0")}:${String(wakeTime.getMinutes()).padStart(2,"0")}`,
        sleep_time:          `${String(sleepTime.getHours()).padStart(2,"0")}:${String(sleepTime.getMinutes()).padStart(2,"0")}`,
        consistency_level:   consistencyLevel,
        is_morning_person:   wakeTime.getHours() < 8,
        sunnah_capacity:     3,
        onboarding_complete: true,
        updated_at:          new Date().toISOString(),
      }),
      supabase.from("user_sunnahs").upsert(
        selectedIds.map((id, idx) => ({
          user_id:   userId,
          sunnah_id: id,
          is_active: true,
          is_anchor: id === anchorId,
          position:  idx,
        })),
        { onConflict: "user_id,sunnah_id" },
      ),
    ]);

    if (profileResult.error || sunnahResult.error) {
      setError(s.errGeneric);
      setSaving(false);
      return;
    }

    router.replace("/(tabs)");
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
        }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Mascot */}
        <View style={styles.mascotWrap}>
          <Galabeya mood="happy" size={110} />
        </View>

        {/* Commitment */}
        <View style={styles.commitment}>
          <Text style={isRTL ? styles.journeyLineAr : styles.journeyLine}>{s.journey}</Text>
          <View style={styles.anchorCard}>
            <Text style={styles.anchorAr}>{anchorNameAr}</Text>
            <Text style={[styles.anchorEn, isRTL && styles.anchorEnAr]}>{anchorName}</Text>
          </View>
          <Text style={[styles.closing, isRTL && styles.closingAr]}>{s.closing}</Text>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={isRTL ? styles.dividerLabelAr : styles.dividerLabel}>{s.saveLabel}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Sign-up form */}
        <View style={styles.form}>
          {/* Name */}
          <Field
            icon="user"
            placeholder={s.namePh}
            value={name}
            onChange={setName}
            autoCapitalize="words"
            isRTL={isRTL}
          />
          {/* Email */}
          <Field
            icon="mail"
            placeholder={s.emailPh}
            value={email}
            onChange={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            isRTL={isRTL}
          />
          {/* Password */}
          <View style={[styles.inputRow, isRTL && { flexDirection: "row-reverse" }, { backgroundColor: C.surface, borderColor: C.divider }]}>
            <Feather name="lock" size={15} color={C.faint} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={s.passwordPh}
              placeholderTextColor={C.faint}
              secureTextEntry={!showPass}
              style={[styles.input, { color: C.ink, textAlign: isRTL ? "right" : "left" }]}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} activeOpacity={0.7}>
              <Feather name={showPass ? "eye-off" : "eye"} size={15} color={C.faint} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Error */}
        {error && (
          <Text style={[styles.errorText, isRTL && styles.errorTextAr]}>{error}</Text>
        )}

        {/* Begin */}
        <TouchableOpacity
          style={[styles.btn, saving && { opacity: 0.7 }]}
          activeOpacity={0.85}
          onPress={handleBegin}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={C.bg} />
            : <Text style={[styles.btnText, isRTL && styles.btnTextAr]}>{s.begin} ﷽</Text>
          }
        </TouchableOpacity>

        {/* Already have account */}
        <TouchableOpacity
          style={{ alignItems: "center", marginTop: 16 }}
          onPress={() => router.replace("/(auth)/sign-in")}
          activeOpacity={0.7}
        >
          <Text style={[{ fontSize: 13, color: C.faint }, isRTL && { fontFamily: "Amiri_400Regular", fontSize: 15 }]}>
            {s.haveAccount}{" "}
            <Text style={{ color: C.gold }}>{s.signIn}</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ icon, placeholder, value, onChange, keyboardType, autoCapitalize, isRTL }: any) {
  return (
    <View style={[styles.inputRow, isRTL && { flexDirection: "row-reverse" }, { backgroundColor: C.surface, borderColor: C.divider }]}>
      <Feather name={icon} size={15} color={C.faint} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.faint}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "none"}
        style={[styles.input, { color: C.ink, textAlign: isRTL ? "right" : "left" }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 28,
    alignItems: "center",
  },
  mascotWrap: { marginBottom: 8 },
  commitment: { alignItems: "center", gap: 10, marginBottom: 24 },
  journeyLine: { fontSize: 13, color: C.muted, letterSpacing: 0.3 },
  journeyLineAr: { fontFamily: "Amiri_400Regular", fontSize: 15, color: C.muted },
  anchorCard: {
    borderWidth: 1, borderColor: C.gold + "50",
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24,
    alignItems: "center", backgroundColor: C.gold + "0e",
    minWidth: 240,
  },
  anchorAr: {
    fontFamily: "Amiri_400Regular", fontSize: 20,
    color: C.gold, textAlign: "center",
    writingDirection: "rtl", lineHeight: 32, marginBottom: 4,
  },
  anchorEn: {
    fontFamily: "Georgia", fontSize: 14, color: C.ink,
    textAlign: "center", opacity: 0.8,
  },
  anchorEnAr: { fontFamily: "Amiri_400Regular", fontSize: 15 },
  closing: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },
  closingAr: { fontFamily: "Amiri_400Regular", fontSize: 15, lineHeight: 26 },
  dividerRow: {
    flexDirection: "row", alignItems: "center",
    gap: 10, marginBottom: 20, width: "100%",
  },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: C.faint, opacity: 0.4 },
  dividerLabel: { fontSize: 11, color: C.faint, letterSpacing: 0.5 },
  dividerLabelAr: { fontFamily: "Amiri_400Regular", fontSize: 13, color: C.faint },
  form: { width: "100%", gap: 10, marginBottom: 8 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, borderWidth: 0.5,
    paddingHorizontal: 14, gap: 10,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 15 },
  errorText: { fontSize: 13, color: C.error, textAlign: "center", marginBottom: 8 },
  errorTextAr: { fontFamily: "Amiri_400Regular", fontSize: 15 },
  btn: {
    backgroundColor: C.gold, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
    width: "100%", marginTop: 8,
  },
  btnText: { fontFamily: "Georgia", fontSize: 17, color: C.bg },
  btnTextAr: { fontFamily: "Amiri_700Bold", fontSize: 19 },
});
