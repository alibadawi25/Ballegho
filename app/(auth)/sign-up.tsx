import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/hooks/useLang";

export default function SignUpScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { signUp } = useAuth();
  const { isRTL } = useLang();

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const c = {
    bg:       "#0e1a2b",
    surface:  "#122236",
    ink:      "#f4ecd8",
    inkMuted: "#8a8876",
    inkFaint: "#4a5362",
    gold:     "#b8892a",
    divider:  "rgba(244,236,216,0.08)",
    error:    "#d27866",
  };

  async function handleSignUp() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError(isRTL ? "يرجى ملء جميع الحقول." : "Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError(isRTL ? "يجب أن تتكوّن كلمة المرور من ٦ أحرف على الأقل." : "Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError(null);

    const err = await signUp(email.trim(), password, name.trim());
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    // Account created — send them into onboarding. Keep loading=true so
    // the spinner stays up while we navigate; the screen unmounts itself.
    router.replace("/(onboarding)/step0");
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
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
        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { alignSelf: isRTL ? "flex-end" : "flex-start" }]}
          activeOpacity={0.7}
        >
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={20} color={c.inkMuted} />
        </TouchableOpacity>

        {/* Header */}
        <View style={{ marginTop: 32, marginBottom: 40, alignItems: isRTL ? "flex-end" : "flex-start" }}>
          <Text style={[styles.eyebrow, { color: c.inkMuted, textAlign: isRTL ? "right" : "left" }]}>
            {isRTL ? "إنشاء حساب" : "New account"}
          </Text>
          <Text style={[styles.title, { color: c.ink, textAlign: isRTL ? "right" : "left" }]}>
            {isRTL ? "ابدأ رحلتك" : "Begin your\n"}
            {isRTL ? "" : <Text style={{ color: c.gold }}>journey</Text>}
          </Text>
        </View>

        {/* Fields */}
        <View style={{ gap: 14 }}>
          <Field
            label={isRTL ? "الاسم" : "Name"}
            value={name}
            onChange={setName}
            placeholder={isRTL ? "اسمك" : "Your name"}
            autoCapitalize="words"
            c={c}
            isRTL={isRTL}
          />
          <Field
            label={isRTL ? "البريد الإلكتروني" : "Email"}
            value={email}
            onChange={setEmail}
            placeholder={isRTL ? "example@email.com" : "you@email.com"}
            keyboardType="email-address"
            autoCapitalize="none"
            c={c}
            isRTL={isRTL}
          />
          <Field
            label={isRTL ? "كلمة المرور" : "Password"}
            value={password}
            onChange={setPassword}
            placeholder={isRTL ? "٦ أحرف على الأقل" : "6+ characters"}
            secureTextEntry={!showPass}
            c={c}
            isRTL={isRTL}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Feather name={showPass ? "eye-off" : "eye"} size={16} color={c.inkMuted} />
              </TouchableOpacity>
            }
          />
        </View>

        {/* Error */}
        {error && (
          <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: c.gold, marginTop: 32 }]}
          onPress={handleSignUp}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#0e1a2b" />
            : <Text style={[styles.primaryBtnText, { color: "#0e1a2b" }]}>
                {isRTL ? "إنشاء الحساب" : "Create account"}
              </Text>
          }
        </TouchableOpacity>

        {/* Sign in link */}
        <TouchableOpacity
          style={{ marginTop: 20, alignItems: "center" }}
          onPress={() => router.replace("/(auth)/sign-in")}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 13, color: c.inkMuted }}>
            {isRTL ? "لديك حساب؟ " : "Already have an account? "}
            <Text style={{ color: c.gold }}>
              {isRTL ? "تسجيل الدخول" : "Sign in"}
            </Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Reusable field ─────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder,
  keyboardType, autoCapitalize, secureTextEntry,
  c, isRTL, rightIcon,
}: any) {
  return (
    <View>
      <Text style={{
        fontSize: 11, fontWeight: "600",
        textTransform: isRTL ? "none" : "uppercase",
        ...(isRTL ? {} : { letterSpacing: 1.1 }),
        color: c.inkMuted,
        marginBottom: 8,
        textAlign: isRTL ? "right" : "left",
      }}>
        {label}
      </Text>
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center",
        backgroundColor: c.surface,
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: c.divider,
        paddingHorizontal: 14,
        gap: 10,
      }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={c.inkFaint}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "none"}
          secureTextEntry={secureTextEntry}
          style={{
            flex: 1,
            paddingVertical: 14,
            fontSize: 15,
            color: c.ink,
            textAlign: isRTL ? "right" : "left",
          }}
        />
        {rightIcon}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#122236",
    alignItems: "center", justifyContent: "center",
  },
  eyebrow: {
    fontSize: 10, fontWeight: "600",
    textTransform: "uppercase", letterSpacing: 1.4,
    marginBottom: 8,
  },
  title: {
    fontFamily: "Georgia",
    fontSize: 32, fontWeight: "400",
    letterSpacing: -0.5, lineHeight: 38,
  },
  errorText: {
    fontSize: 13, marginTop: 12, textAlign: "center",
  },
  primaryBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: "center",
  },
  primaryBtnText: {
    fontFamily: "Georgia", fontSize: 16, fontWeight: "400",
  },
});
