import "../global.css";
import { useEffect, useRef, useState } from "react";
import { configureNotificationHandler } from "@/lib/notifications";

// Set up notification display behaviour immediately at module load
configureNotificationHandler();
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import { Amiri_400Regular, Amiri_700Bold } from "@expo-google-fonts/amiri";
import {
  ScheherazadeNew_400Regular,
  ScheherazadeNew_700Bold,
} from "@expo-google-fonts/scheherazade-new";
import * as SplashScreen from "expo-splash-screen";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NurProvider } from "@/contexts/NurContext";
import NurReward from "@/components/NurReward";
import FirstNurTip from "@/components/FirstNurTip";
import { supabase } from "@/lib/supabase";

SplashScreen.preventAutoHideAsync();

// ─── AuthGate ─────────────────────────────────────────────────────────────────
//
// Routing rules:
//   No session                          → /(auth)/welcome
//   Session + onboarding_complete=false → /(onboarding)/step0
//   Session + onboarding_complete=true  → /(tabs)
//
// Race-condition fixes:
//   1. Re-query DB when BOTH session.user.id AND segments[0] change.
//      This catches the step6 case: after it writes onboarding_complete=true
//      and calls router.replace("/(tabs)"), segments[0] flips from
//      "(onboarding)" → "(tabs)", which triggers a fresh DB read that now
//      returns true — so AuthGate does NOT bounce the user back to step0.
//
//   2. Reset onboardingChecked=false before every new query. This prevents
//      the stale-null window where session is present but onboardingDone is
//      still null from a previous no-session run.
//
//   3. While the query is in-flight, an opaque loading overlay is rendered
//      over the Stack so the user never sees a half-loaded screen or a flash
//      of the wrong route.
//
function AuthGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router   = useRouter();

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone,    setOnboardingDone]    = useState<boolean | null>(null);

  const prevUserId  = useRef<string | undefined>(undefined);
  const prevSegment = useRef<string | undefined>(undefined);

  // ── 1. Query DB on meaningful boundary crossings ─────────────────────────
  //
  // We re-query when:
  //   a) The signed-in user changes (new login / logout)
  //   b) The segment crosses the auth-or-onboarding ↔ app boundary
  //      e.g. (onboarding) → (tabs)  after step6 completes
  //           (auth)        → (tabs)  after sign-in
  //
  // We do NOT re-query when navigating within the app zone
  //   e.g. (tabs) → sunnah → (tabs)
  // That would reset onboardingChecked, show a loading overlay, and
  // the routing effect would then redirect the user back to tabs.
  //
  const isAuthOrOnboarding = (seg?: string) =>
    seg === "(auth)" || seg === "(onboarding)";

  useEffect(() => {
    const currentSegment = segments[0];
    const currentUserId  = session?.user.id;

    const userChanged         = currentUserId  !== prevUserId.current;
    const prevSeg             = prevSegment.current;
    // Crossing the auth/onboarding ↔ app boundary in either direction
    const crossedZoneBoundary = isAuthOrOnboarding(prevSeg) !== isAuthOrOnboarding(currentSegment);

    prevUserId.current  = currentUserId;
    prevSegment.current = currentSegment;

    if (!session) {
      setOnboardingDone(null);
      setOnboardingChecked(true);
      return;
    }

    // Skip re-query for same-zone app navigation (tabs ↔ sunnah, etc.)
    if (!userChanged && !crossedZoneBoundary) return;

    // Reset while fetching — the loading overlay blocks routing until done.
    setOnboardingChecked(false);

    supabase
      .from("user_behavioral_profile")
      .select("onboarding_complete")
      .eq("user_id", session.user.id)
      .single()
      .then(({ data }) => {
        setOnboardingDone(data?.onboarding_complete ?? false);
        setOnboardingChecked(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, segments[0]]);

  // ── 2. Route once we have fresh, confirmed data ────────────────────────────
  useEffect(() => {
    if (loading || !onboardingChecked) return;

    const inAuth       = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "(onboarding)";
    const inTabs       = segments[0] === "(tabs)";

    if (!session) {
      // No session → must be on welcome / sign-in / onboarding (pre-account)
      if (!inAuth && !inOnboarding) router.replace("/(auth)/welcome");
    } else if (onboardingDone === false) {
      // Incomplete onboarding → stay in onboarding flow
      if (!inOnboarding) router.replace("/(onboarding)/step0");
    } else if (onboardingDone === true) {
      // Fully onboarded → only redirect if still stuck on an auth/onboarding screen.
      // Do NOT redirect when the user is navigating other app routes (sunnah detail, etc.)
      if (inAuth || inOnboarding) router.replace("/(tabs)");
    }
  }, [session, loading, onboardingChecked, onboardingDone, segments]);

  // ── 3. Loading overlay — prevents blank flashes while query is in-flight ──
  if (loading || !onboardingChecked) {
    return (
      <View style={[StyleSheet.absoluteFillObject, styles.loadingOverlay]}>
        <ActivityIndicator size="large" color="#b8892a" />
      </View>
    );
  }

  return null;
}

// ─── Root layout ─────────────────────────────────────────────────────────────
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Amiri_400Regular,
    Amiri_700Bold,
    ScheherazadeNew_400Regular,
    ScheherazadeNew_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SettingsProvider>
      <AuthProvider>
        <NurProvider>
        {/* Stack renders first so the navigator is always present when
            AuthGate calls router.replace(). AuthGate sits on top as an
            overlay and returns null once it has routed. */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)"       />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)"       />
          <Stack.Screen name="sunnah/[id]"  options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="adhkar/[slug]" options={{ animation: "slide_from_right" }} />
        </Stack>
        <AuthGate />
        <NurReward />
        <FirstNurTip />
        </NurProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    backgroundColor: "#0e1a2b",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
});
