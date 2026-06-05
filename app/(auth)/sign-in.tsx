import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/hooks/useLang";

export default function SignInScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { signIn } = useAuth();
  const { isRTL } = useLang();

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

  async function handleSignIn() {
    if (!email.trim() || !password.trim()) {
      setError(isRTL ? "أدخل بريدك الإلكتروني وكلمة المرور." : "Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);

    const err = await signIn(email.trim(), password);

    if (err) {
      // Only stop loading on error — on success we keep the spinner
      // running until AuthGate navigates us out.
      setError(err.message);
      setLoading(false);
    }
    // On success: loading stays true, AuthGate will call router.replace()
    // which unmounts this screen.
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, {
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 32,
      }]}>
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
          <Text style={[styles.eyebrow, { color: c.inkMuted }]}>
            {isRTL ? "مرحباً بعودتك" : "Welcome back"}
          </Text>
          <Text style={[styles.title, { color: c.ink }]}>
            {isRTL ? "تسجيل " : "Sign "}
            <Text style={{ color: c.gold }}>{isRTL ? "الدخول" : "in"}</Text>
          </Text>
        </View>

        {/* Fields */}
        <View style={{ gap: 14 }}>
          {/* Email */}
          <View>
            <Text style={[styles.fieldLabel, {
              color: c.inkMuted,
              textAlign: isRTL ? "right" : "left",
              textTransform: isRTL ? "none" : "uppercase",
              ...(isRTL ? {} : { letterSpacing: 1.1 }),
            }]}>
              {isRTL ? "البريد الإلكتروني" : "Email"}
            </Text>
            <View style={[styles.inputRow, {
              backgroundColor: c.surface,
              borderColor: c.divider,
              flexDirection: isRTL ? "row-reverse" : "row",
            }]}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={isRTL ? "example@email.com" : "you@email.com"}
                placeholderTextColor={c.inkFaint}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { color: c.ink, textAlign: isRTL ? "right" : "left" }]}
              />
            </View>
          </View>

          {/* Password */}
          <View>
            <Text style={[styles.fieldLabel, {
              color: c.inkMuted,
              textAlign: isRTL ? "right" : "left",
              textTransform: isRTL ? "none" : "uppercase",
              ...(isRTL ? {} : { letterSpacing: 1.1 }),
            }]}>
              {isRTL ? "كلمة المرور" : "Password"}
            </Text>
            <View style={[styles.inputRow, {
              backgroundColor: c.surface,
              borderColor: c.divider,
              flexDirection: isRTL ? "row-reverse" : "row",
            }]}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={isRTL ? "كلمة المرور" : "Your password"}
                placeholderTextColor={c.inkFaint}
                secureTextEntry={!showPass}
                style={[styles.input, { color: c.ink, textAlign: isRTL ? "right" : "left" }]}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Feather name={showPass ? "eye-off" : "eye"} size={16} color={c.inkMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Error */}
        {error && (
          <Text style={{ fontSize: 13, color: c.error, marginTop: 12, textAlign: "center" }}>
            {error}
          </Text>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: c.gold, marginTop: 32 }]}
          onPress={handleSignIn}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#0e1a2b" />
            : <Text style={[styles.primaryBtnText, { color: "#0e1a2b" }]}>
                {isRTL ? "دخول" : "Sign in"}
              </Text>
          }
        </TouchableOpacity>

        {/* Sign up link */}
        <TouchableOpacity
          style={{ marginTop: 20, alignItems: "center" }}
          onPress={() => router.replace("/(auth)/sign-up")}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 13, color: c.inkMuted }}>
            {isRTL ? "ليس لديك حساب؟ " : "Don't have an account? "}
            <Text style={{ color: c.gold }}>
              {isRTL ? "إنشاء حساب" : "Sign up"}
            </Text>
          </Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
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
    letterSpacing: -0.5,
  },
  fieldLabel: {
    fontSize: 11, fontWeight: "600",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 0.5,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
  },
  primaryBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: "center",
  },
  primaryBtnText: {
    fontFamily: "Georgia", fontSize: 16, fontWeight: "400",
  },
});
