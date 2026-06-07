/**
 * Sunnah Detail Screen
 *
 * Shows the full information for one sunnah:
 *   - Arabic + English names
 *   - Hadith (AR + EN) and source
 *   - Category / time-of-day / duration chips
 *   - Personal stats (streak, total completions, weekly rate)
 *   - Today's check/uncheck action — only if sunnah is in the user's practice
 *   - Share button — always visible; opens image share modal
 *
 * Navigation: router.push("/sunnah/<sunnah_id>")
 */

import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, StyleSheet,
  Modal, TextInput, KeyboardAvoidingView, Platform, Image,
} from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { getEffectiveDate } from "@/lib/islamicDate";
// expo-media-library is native-only; required lazily inside handleSave so it is
// never initialised on web (which lacks the native module).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const getMediaLibrary = () => require("expo-media-library") as typeof import("expo-media-library");
import { useLang } from "@/hooks/useLang";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useNur } from "@/contexts/NurContext";
import { supabase } from "@/lib/supabase";
import { TYPE, colors } from "@/constants/theme";
import SunnahShareCard, { type ShareableSunnah, type ShareTheme } from "@/components/SunnahShareCard";
import ThemePicker from "@/components/ThemePicker";
import SebhaCounter from "@/components/SebhaCounter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SunnahData {
  id:              string;
  slug:            string;
  name_en:         string;
  name_ar:         string;
  description_en:  string | null;
  description_ar:  string | null;
  hadith_text_en:  string | null;
  hadith_text_ar:  string | null;
  hadith_source:   string | null;
  category:        string;
  time_of_day:     string;
  estimated_seconds: number;
  difficulty_base: number;
  interaction_type: string;          // 'check' | 'counter' | 'playlist'
  repetitions:     number | null;    // target count when interaction_type = 'counter'
}

interface UserData {
  is_anchor:          boolean;
  is_active:          boolean; // whether sunnah is in the user's active practice
  current_streak:     number;
  longest_streak:     number;
  total_completions:  number;
  completion_rate_7d: number;
}

// ─── Metadata maps ────────────────────────────────────────────────────────────

const CATEGORY: Record<string, { en: string; ar: string }> = {
  quran:       { en: "Qurʾān",       ar: "القرآن"      },
  prayer:      { en: "Prayer",       ar: "الصلاة"      },
  dhikr:       { en: "Dhikr",        ar: "الذكر"       },
  food:        { en: "Food & Drink", ar: "الطعام"      },
  social:      { en: "Social",       ar: "الاجتماعي"   },
  cleanliness: { en: "Cleanliness",  ar: "الطهارة"     },
  sleep:       { en: "Sleep",        ar: "النوم"       },
  worship:     { en: "Worship",      ar: "العبادة"     },
  etiquette:   { en: "Etiquette",    ar: "الآداب"      },
  dua:         { en: "Duʿāʾ",        ar: "الدعاء"      },
  character:   { en: "Akhlāq",       ar: "الأخلاق"     },
};

const TIME: Record<string, { en: string; ar: string; emoji: string }> = {
  morning:      { en: "Morning",      ar: "الصباح",     emoji: "🌅" },
  evening:      { en: "Evening",      ar: "المساء",     emoji: "🌆" },
  night:        { en: "Night",        ar: "الليل",      emoji: "🌙" },
  anytime:      { en: "Any time",     ar: "أي وقت",     emoji: "☀️" },
  afternoon:    { en: "Afternoon",    ar: "بعد الظهر",  emoji: "🌤️" },
  after_prayer: { en: "After prayer", ar: "بعد الصلاة", emoji: "🤲" },
  before_sleep: { en: "Before sleep", ar: "قبل النوم",  emoji: "😴" },
};

function fmtDuration(sec: number): string {
  if (sec < 60)  return `${sec}s`;
  const m = Math.round(sec / 60);
  return m === 1 ? "1 min" : `${m} min`;
}

function fmtPct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SunnahDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, isRTL, isDark } = useLang();
  const c = colors(isDark);
  const { isFavorite, toggle: toggleFav } = useFavorites();
  const { awardShare, reload: reloadNur } = useNur();

  // sunnah/[id] is outside the (tabs) tree so it cannot use PrayerTimesContext.
  // Call usePrayerTimes directly — geolocation is already cached by this point.
  const { prayers: detailPrayers } = usePrayerTimes();
  const detailMaghribRef = useRef<Date | null>(null);
  detailMaghribRef.current = detailPrayers.find(p => p.key === "maghrib")?.time ?? null;

  const [sunnah,       setSunnah]       = useState<SunnahData | null>(null);
  const [userData,     setUserData]     = useState<UserData | null>(null);
  const [doneToday,    setDoneToday]    = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [toggling,     setToggling]     = useState(false);

  // Counter (sebha) state — current bead count for today, plus a ref holding the
  // full adhkar_sessions.counts object so we can merge our key without clobbering
  // other sunnahs' counts on upsert.
  const [count,    setCount]    = useState(0);
  const countsRef               = useRef<Record<string, number>>({});

  // Share state
  const [shareVisible, setShareVisible] = useState(false);
  const [message,      setMessage]      = useState("");
  const [shareTheme,   setShareTheme]   = useState<ShareTheme>("night");
  const [capturing,    setCapturing]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const cardRef = useRef<View>(null);

  // Hijri-adjusted date — always computed fresh from the ref at call time.
  const getToday = () => getEffectiveDate(detailMaghribRef.current);

  const load = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);

    const [
      { data: sunnahRow },
      { data: userSunnahRow },
      { data: statsRow },
      { data: completionRow },
      { data: sessionRow },
    ] = await Promise.all([
      supabase.from("sunnahs").select("*").eq("id", id).single(),
      supabase.from("user_sunnahs")
        .select("is_anchor, is_active")
        .eq("user_id", user.id).eq("sunnah_id", id)
        .maybeSingle(),
      supabase.from("user_sunnah_stats")
        .select("current_streak, longest_streak, total_completions, completion_rate_7d")
        .eq("user_id", user.id).eq("sunnah_id", id)
        .maybeSingle(),
      supabase.from("daily_completions")
        .select("sunnah_id")
        .eq("user_id", user.id).eq("sunnah_id", id).eq("completed_date", getToday())
        .maybeSingle(),
      supabase.from("adhkar_sessions")
        .select("counts")
        .eq("user_id", user.id).eq("session_date", getToday())
        .maybeSingle(),
    ]);

    if (sunnahRow) setSunnah(sunnahRow as SunnahData);

    // Hydrate today's bead count for counter-type sunnahs.
    countsRef.current = (sessionRow?.counts as Record<string, number> | undefined) ?? {};
    setCount(countsRef.current[id] ?? 0);

    setUserData({
      is_anchor:          userSunnahRow?.is_anchor        ?? false,
      is_active:          userSunnahRow?.is_active        ?? false,
      current_streak:     statsRow?.current_streak        ?? 0,
      longest_streak:     statsRow?.longest_streak        ?? 0,
      total_completions:  statsRow?.total_completions     ?? 0,
      completion_rate_7d: statsRow?.completion_rate_7d    ?? 0,
    });
    setDoneToday(!!completionRow);
    setLoading(false);
  }, [id, user?.id]);

  useEffect(() => { load(); }, [load]);

  // ── Refresh the per-sunnah stats display after a completion change ─────────
  async function refreshStats() {
    if (!user || !sunnah) return;
    const { data: fresh } = await supabase
      .from("user_sunnah_stats")
      .select("current_streak, longest_streak, total_completions, completion_rate_7d")
      .eq("user_id", user.id).eq("sunnah_id", sunnah.id)
      .maybeSingle();
    if (fresh) {
      setUserData((prev) => prev ? {
        ...prev,
        current_streak:     fresh.current_streak     ?? prev.current_streak,
        longest_streak:     fresh.longest_streak     ?? prev.longest_streak,
        total_completions:  fresh.total_completions  ?? prev.total_completions,
        completion_rate_7d: fresh.completion_rate_7d ?? prev.completion_rate_7d,
      } : prev);
    }
  }

  // ── Mark today complete (shared by the check button and the counter) ──────
  async function completeToday() {
    if (!user || !sunnah) return;
    const today = getToday();
    setDoneToday(true);
    await supabase.from("daily_completions").upsert(
      { user_id: user.id, sunnah_id: sunnah.id, completed_date: today },
      { onConflict: "user_id,sunnah_id,completed_date" },
    );
    await Promise.all([
      supabase.rpc("record_sunnah_completion", { p_user_id: user.id, p_sunnah_id: sunnah.id }),
      supabase.rpc("update_user_streak",        { p_user_id: user.id, p_effective_date: today }),
    ]);
    await refreshStats();
    reloadNur();   // completion (incl. spontaneous) awarded Nūr — refresh live
  }

  // ── Undo today's completion (recomputes streaks from history) ─────────────
  async function uncompleteToday() {
    if (!user || !sunnah) return;
    const today = getToday();
    setDoneToday(false);
    await supabase.from("daily_completions")
      .delete()
      .eq("user_id", user.id)
      .eq("sunnah_id", sunnah.id)
      .eq("completed_date", today);
    await Promise.all([
      supabase.rpc("recompute_user_streak",  { p_user_id: user.id, p_effective_date: today }),
      supabase.rpc("recompute_sunnah_stats", { p_user_id: user.id, p_sunnah_id: sunnah.id }),
    ]);
    await refreshStats();
  }

  // ── Toggle today's completion (the simple "check" interaction) ────────────
  async function toggleCompletion() {
    if (!user || !sunnah || toggling) return;
    setToggling(true);
    if (doneToday) await uncompleteToday();
    else           await completeToday();
    setToggling(false);
  }

  // ── Counter (sebha) handlers ───────────────────────────────────────────────
  // Persist the merged counts object for today. Fire-and-forget; countsRef is
  // updated synchronously so rapid taps always serialise the latest value.
  function persistCount(next: number) {
    if (!user || !sunnah) return;
    countsRef.current = { ...countsRef.current, [sunnah.id]: next };
    supabase.from("adhkar_sessions").upsert(
      { user_id: user.id, session_date: getToday(), counts: countsRef.current, updated_at: new Date().toISOString() },
      { onConflict: "user_id,session_date" },
    ).then(({ error }) => { if (error) console.error("[counter] persist failed:", error.message); });
  }

  async function incrementCounter() {
    if (!sunnah?.repetitions) return;
    const next = count + 1;
    setCount(next);
    persistCount(next);
    // Fire completion exactly once, at the threshold. Using `===` (not `>=`)
    // means continued taps past the target — or a reset-then-recount — never
    // re-trigger the completion RPCs (which aren't idempotent).
    if (!doneToday && next === sunnah.repetitions) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await completeToday();
    }
  }

  function resetCounter() {
    setCount(0);
    persistCount(0);
  }

  async function undoCounter() {
    setCount(0);
    persistCount(0);
    if (doneToday) await uncompleteToday();
  }

  // ── Remove from practice ──────────────────────────────────────────────────
  function handleRemove() {
    if (!user || !sunnah) return;
    if (userData?.is_anchor) {
      Alert.alert(t.sunnah.cantRemove, t.sunnah.cantRemoveMsg, [{ text: "OK" }]);
      return;
    }
    const sunnahName = isRTL ? sunnah.name_ar : sunnah.name_en;
    Alert.alert(
      t.sunnah.confirmRemove,
      `"${sunnahName}" — ${t.sunnah.confirmMsg}`,
      [
        { text: t.sunnah.cancel, style: "cancel" },
        {
          text: isRTL ? "إزالة" : "Remove",
          style: "destructive",
          onPress: async () => {
            await supabase
              .from("user_sunnahs")
              .update({ is_active: false })
              .eq("user_id", user.id)
              .eq("sunnah_id", sunnah.id);
            router.back();
          },
        },
      ],
    );
  }

  // ── Share: capture the card as JPEG then open native share sheet ──────────
  async function handleShare() {
    if (!cardRef.current) return;
    setCapturing(true);
    try {
      const uri = await captureRef(cardRef, { format: "jpg", quality: 0.95 });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/jpeg",
          dialogTitle: sunnah ? (isRTL ? sunnah.name_ar : sunnah.name_en) : "",
        });
        // Conveying earns Nūr (server caps to once per day).
        awardShare();
      } else {
        Alert.alert("", "Sharing is not available on this device.");
      }
    } catch (err) {
      console.error("[share] capture failed:", err);
    } finally {
      setCapturing(false);
    }
  }

  // ── Save to photos ────────────────────────────────────────────────────────
  async function handleSave() {
    if (!cardRef.current || Platform.OS === "web") return;
    setSaving(true);
    try {
      const MediaLibrary = getMediaLibrary();
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t.share.permDenied, t.share.permMsg);
        return;
      }
      const uri = await captureRef(cardRef, { format: "jpg", quality: 0.95 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("", t.share.saved);
    } catch (err) {
      console.error("[share] save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (loading || !sunnah) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={c.gold} />
      </View>
    );
  }

  const categoryMeta = CATEGORY[sunnah.category]  ?? { en: sunnah.category,    ar: sunnah.category };
  const timeMeta     = TIME[sunnah.time_of_day]    ?? { en: sunnah.time_of_day, ar: sunnah.time_of_day, emoji: "⏰" };
  const isActive     = userData?.is_active === true;

  const shareable: ShareableSunnah = {
    name_ar:        sunnah.name_ar,
    name_en:        sunnah.name_en,
    hadith_text_ar: sunnah.hadith_text_ar,
    hadith_text_en: sunnah.hadith_text_en,
    hadith_source:  sunnah.hadith_source,
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <View style={[
        styles.topBar,
        {
          paddingTop: insets.top + 10,
          backgroundColor: c.bg,
          borderBottomColor: c.divider,
          flexDirection: isRTL ? "row-reverse" : "row",
        },
      ]}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={[styles.topBtn, { backgroundColor: c.surface }]}
        >
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={19} color={c.inkMuted} />
        </TouchableOpacity>

        <Text style={[styles.topTitle, { color: c.ink }]} numberOfLines={1}>
          {isRTL ? sunnah.name_ar : sunnah.name_en}
        </Text>

        {/* Save + share — always visible once sunnah is loaded */}
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleFav(sunnah.id);
            }}
            activeOpacity={0.7}
            style={[styles.topBtn, { backgroundColor: c.surface }]}
          >
            <Ionicons
              name={isFavorite(sunnah.id) ? "heart" : "heart-outline"}
              size={18}
              color={isFavorite(sunnah.id) ? c.gold : c.inkMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShareVisible(true)}
            activeOpacity={0.7}
            style={[styles.topBtn, { backgroundColor: c.surface }]}
          >
            <Feather name="share-2" size={17} color={c.inkMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: insets.bottom + 40 }}
      >

        {/* ── Hero name ────────────────────────────────────────────────── */}
        <View style={{ alignItems: "center", marginBottom: 28, gap: 8 }}>
          <Text style={[styles.heroAr, { color: c.gold }]}>
            {sunnah.name_ar}
          </Text>
          {/* English subtitle only in English mode */}
          {!isRTL && (
            <Text style={[styles.heroEn, { color: c.ink }]}>
              {sunnah.name_en}
            </Text>
          )}
          {userData?.is_anchor && (
            <View style={[styles.anchorBadge, { borderColor: c.gold + "60", backgroundColor: c.gold + "14" }]}>
              <Feather name="anchor" size={10} color={c.gold} />
              <Text style={[styles.anchorLabel, { color: c.gold }]}>
                {isRTL ? "سنتك المرساة" : "Your anchor sunnah"}
              </Text>
            </View>
          )}
        </View>

        {/* ── Hadith card ───────────────────────────────────────────────── */}
        {(sunnah.hadith_text_ar || sunnah.hadith_text_en) && (
          <View style={[styles.hadithCard, { backgroundColor: c.surface, borderColor: c.gold + "30" }]}>
            <Text style={[isRTL ? styles.sectionLabelAr : styles.sectionLabelEn, { color: c.gold }]}>
              {t.sunnah.hadithLabel}
            </Text>
            {sunnah.hadith_text_ar && (
              <Text style={[styles.hadithAr, { color: c.ink }]}>
                «{sunnah.hadith_text_ar}»
              </Text>
            )}
            {sunnah.hadith_text_en && (
              <Text style={[styles.hadithEn, { color: c.inkMuted }]}>
                "{sunnah.hadith_text_en}"
              </Text>
            )}
            {sunnah.hadith_source && (
              <View style={[styles.sourceRow, { borderTopColor: c.divider, flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Feather name="book-open" size={11} color={c.inkFaint} />
                <Text style={[styles.sourceText, { color: c.inkFaint }]}>
                  {sunnah.hadith_source}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Description ───────────────────────────────────────────────── */}
        {(isRTL ? sunnah.description_ar : sunnah.description_en) && (
          <View style={[styles.descCard, { backgroundColor: c.surface, borderColor: c.divider }]}>
            <Text style={[isRTL ? styles.sectionLabelAr : styles.sectionLabelEn, { color: c.inkMuted }]}>
              {t.sunnah.aboutLabel}
            </Text>
            <Text style={[
              styles.descBody,
              { color: c.ink },
              isRTL && { fontFamily: "Amiri_400Regular", fontSize: 16, lineHeight: 28, textAlign: "right", writingDirection: "rtl" },
            ]}>
              {isRTL ? sunnah.description_ar : sunnah.description_en}
            </Text>
          </View>
        )}

        {/* ── Chips ────────────────────────────────────────────────────── */}
        <View style={[styles.chips, isRTL && { flexDirection: "row-reverse" }]}>
          <Chip icon="tag"   label={isRTL ? categoryMeta.ar : categoryMeta.en} c={c} isRTL={isRTL} />
          <Chip emoji={timeMeta.emoji} label={isRTL ? timeMeta.ar : timeMeta.en} c={c} isRTL={isRTL} />
          {sunnah.estimated_seconds > 0 && (
            <Chip icon="clock" label={fmtDuration(sunnah.estimated_seconds)} c={c} isRTL={isRTL} />
          )}
        </View>

        {/* ── Stats — only show when the sunnah is active or the user has
              previous data (avoids confusing 0/0/0% for library-only items) */}
        {(isActive || (userData?.total_completions ?? 0) > 0) && (
        <View style={[styles.statsCard, { backgroundColor: c.surface, borderColor: c.divider }]}>
          <Text style={[isRTL ? styles.sectionLabelAr : styles.sectionLabelEn, { color: c.inkMuted, textAlign: "center" }]}>
            {t.sunnah.statsLabel}
          </Text>
          <View style={styles.statsGrid}>
            <StatCell icon="zap"          value={String(userData?.current_streak     ?? 0)} label={t.sunnah.dayStreak} c={c} isRTL={isRTL} />
            <View style={[styles.statsDivider, { backgroundColor: c.divider }]} />
            <StatCell icon="check-circle" value={String(userData?.total_completions  ?? 0)} label={t.sunnah.totalDone} c={c} isRTL={isRTL} />
            <View style={[styles.statsDivider, { backgroundColor: c.divider }]} />
            <StatCell icon="trending-up"  value={fmtPct(userData?.completion_rate_7d ?? 0)} label={t.sunnah.thisWeek}  c={c} isRTL={isRTL} />
          </View>
          {(userData?.longest_streak ?? 0) > 0 && (
            <View style={[styles.bestRow, { borderTopColor: c.divider, flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Feather name="award" size={13} color={c.gold} />
              <Text style={[
                styles.bestText,
                { color: c.inkMuted },
                isRTL && { fontFamily: "Amiri_400Regular", fontSize: 14 },
              ]}>
                {t.sunnah.bestStreak}: {userData?.longest_streak} {t.sunnah.days}
              </Text>
            </View>
          )}
        </View>
        )}

        {/* ── Practice actions — only shown when sunnah is in user's list ─ */}
        {isActive && (
          <>
            {sunnah.interaction_type === "playlist" ? (
              /* Playlist — opens the step-by-step adhkār session player */
              <TouchableOpacity
                onPress={() => router.push({ pathname: "/adhkar/[slug]", params: { slug: sunnah.slug } })}
                activeOpacity={0.85}
                style={[
                  styles.checkBtn,
                  doneToday
                    ? { backgroundColor: c.green + "22", borderColor: c.green + "50", borderWidth: 1 }
                    : { backgroundColor: c.gold },
                ]}
              >
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                  <Feather
                    name={doneToday ? "check-circle" : "play-circle"}
                    size={20}
                    color={doneToday ? c.green : "#0e1a2b"}
                  />
                  <Text style={[
                    styles.checkBtnText,
                    { color: doneToday ? c.green : "#0e1a2b" },
                    isRTL && { fontFamily: "Amiri_700Bold", fontSize: 20 },
                  ]}>
                    {doneToday ? t.sunnah.sessionDoneToday : t.sunnah.startSession}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : sunnah.interaction_type === "counter" && sunnah.repetitions ? (
              /* Counter (sebha) interaction */
              <View style={{ marginTop: 4, marginBottom: 4 }}>
                <SebhaCounter
                  count={count}
                  target={sunnah.repetitions}
                  done={doneToday}
                  onIncrement={incrementCounter}
                  onReset={resetCounter}
                  onUndo={undoCounter}
                  c={c}
                  isRTL={isRTL}
                  t={{
                    tapToCount:  t.sunnah.tapToCount,
                    counterDone: t.sunnah.counterDone,
                    reset:       t.sunnah.reset,
                    of:          t.sunnah.of,
                    markNotDone: t.sunnah.markNotDone,
                  }}
                />
              </View>
            ) : (
              /* Simple "check" interaction */
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS !== "web") {
                    doneToday
                      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                  toggleCompletion();
                }}
                activeOpacity={0.85}
                disabled={toggling}
                style={[
                  styles.checkBtn,
                  doneToday
                    ? { backgroundColor: c.green + "22", borderColor: c.green + "50", borderWidth: 1 }
                    : { backgroundColor: c.gold },
                ]}
              >
                {toggling ? (
                  <ActivityIndicator color={doneToday ? c.green : "#0e1a2b"} />
                ) : (
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                    <Feather
                      name={doneToday ? "check-circle" : "circle"}
                      size={20}
                      color={doneToday ? c.green : "#0e1a2b"}
                    />
                    <Text style={[
                      styles.checkBtnText,
                      { color: doneToday ? c.green : "#0e1a2b" },
                      isRTL && { fontFamily: "Amiri_700Bold", fontSize: 20 },
                    ]}>
                      {doneToday ? t.sunnah.doneToday : t.sunnah.markDone}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleRemove}
              activeOpacity={0.7}
              style={{ alignItems: "center", marginTop: 16 }}
            >
              <Text style={[
                styles.removeText,
                { color: userData?.is_anchor ? c.inkFaint : c.rose },
                isRTL && { fontFamily: "Amiri_400Regular", fontSize: 15 },
              ]}>
                {t.sunnah.remove}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Not in the active list — the user can still do it once for the
              reward (spontaneous, earns extra Nūr) WITHOUT committing it to
              their daily list. The app grows the list itself as you stay
              consistent (keeps the "master a few first" philosophy intact). ── */}
        {!isActive && (
          <>
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== "web") {
                  doneToday
                    ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                toggleCompletion();
              }}
              activeOpacity={0.85}
              disabled={toggling}
              style={[
                styles.checkBtn,
                doneToday
                  ? { backgroundColor: c.green + "22", borderColor: c.green + "50", borderWidth: 1 }
                  : { backgroundColor: c.surface, borderColor: c.gold + "55", borderWidth: 1 },
              ]}
            >
              {toggling ? (
                <ActivityIndicator color={doneToday ? c.green : c.gold} />
              ) : (
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                  <Feather
                    name={doneToday ? "check-circle" : "moon"}
                    size={18}
                    color={doneToday ? c.green : c.gold}
                  />
                  <Text style={[
                    styles.checkBtnText,
                    { color: doneToday ? c.green : c.gold, fontSize: 16 },
                    isRTL && { fontFamily: "Amiri_700Bold", fontSize: 19 },
                  ]}>
                    {doneToday ? t.sunnah.didOnceDone : t.sunnah.didOnce}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={[
              styles.lockedHint,
              { borderColor: c.divider, backgroundColor: c.surface, flexDirection: isRTL ? "row-reverse" : "row", marginTop: 14 },
            ]}>
              <Feather name="compass" size={15} color={c.gold} />
              <Text style={[
                styles.lockedHintText,
                { color: c.inkMuted },
                isRTL && { fontFamily: "Amiri_400Regular", fontSize: 14, textAlign: "right" },
              ]}>
                {t.sunnah.willUnlock}
              </Text>
            </View>
          </>
        )}

        {/* Share is in the top bar — no duplicate bottom button needed */}

      </ScrollView>

      {/* ── Share modal ─────────────────────────────────────────────────────── */}
      <Modal
        visible={shareVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setShareVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          {/* Tap-to-dismiss overlay */}
          <TouchableOpacity
            style={styles.shareOverlay}
            activeOpacity={1}
            onPress={() => setShareVisible(false)}
          />

          {/* Bottom sheet */}
          <View style={[
            styles.shareSheet,
            { backgroundColor: c.surface, paddingBottom: insets.bottom + 16 },
          ]}>
            {/* Sheet header */}
            <View style={[styles.shareHeaderRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Text style={[
                styles.shareTitle,
                { color: c.ink },
                isRTL && { fontFamily: "Amiri_700Bold", fontSize: 18, writingDirection: "rtl" },
              ]}>
                {t.share.title}
              </Text>
              <TouchableOpacity onPress={() => setShareVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={20} color={c.inkMuted} />
              </TouchableOpacity>
            </View>

            {/* Handle bar */}
            <View style={[styles.sheetHandle, { backgroundColor: c.divider }]} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: 8, alignItems: "center" }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Message input */}
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder={t.share.messagePh}
                placeholderTextColor={c.inkFaint}
                maxLength={120}
                multiline
                style={[
                  styles.messageInput,
                  {
                    backgroundColor: c.bg,
                    borderColor: c.divider,
                    color: c.ink,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
              />

              {/* Card preview */}
              <ThemePicker selected={shareTheme} onSelect={setShareTheme} isRTL={isRTL} />
              <View style={styles.cardWrap}>
                <SunnahShareCard
                  ref={cardRef}
                  sunnah={shareable}
                  message={message}
                  isRTL={isRTL}
                  theme={shareTheme}
                />
              </View>
            </ScrollView>

            {/* Action buttons */}
            <View style={[styles.shareActions, { borderTopColor: c.divider }]}>
              {/* Primary: Share image */}
              <TouchableOpacity
                onPress={handleShare}
                disabled={capturing || saving}
                activeOpacity={0.85}
                style={[styles.shareBtn, { backgroundColor: c.gold }]}
              >
                {capturing ? (
                  <ActivityIndicator color="#0e1a2b" size="small" />
                ) : (
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
                    <Feather name="share-2" size={16} color="#0e1a2b" />
                    <Text style={[
                      styles.shareBtnText,
                      isRTL && { fontFamily: "Amiri_700Bold", fontSize: 17 },
                    ]}>
                      {t.share.shareImage}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Secondary: Save to photos (native only) */}
              {Platform.OS !== "web" && (
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={capturing || saving}
                  activeOpacity={0.7}
                  style={[styles.saveBtn, { borderColor: c.divider }]}
                >
                  {saving ? (
                    <ActivityIndicator color={c.inkMuted} size="small" />
                  ) : (
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
                      <Feather name="download" size={16} color={c.inkMuted} />
                      <Text style={[
                        styles.saveBtnText,
                        { color: c.inkMuted },
                        isRTL && { fontFamily: "Amiri_400Regular", fontSize: 15 },
                      ]}>
                        {t.share.savePhoto}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type C = ReturnType<typeof colors>;

function Chip({ icon, emoji, label, c, isRTL }: {
  icon?: string; emoji?: string; label: string; c: C; isRTL: boolean;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: c.surface, borderColor: c.divider, flexDirection: isRTL ? "row-reverse" : "row" }]}>
      {emoji
        ? <Text style={{ fontSize: 12 }}>{emoji}</Text>
        : <Feather name={icon as any} size={12} color={c.inkMuted} />
      }
      <Text style={[
        styles.chipLabel,
        { color: c.inkMuted },
        isRTL && { fontFamily: "Amiri_400Regular", fontSize: 13 },
      ]}>
        {label}
      </Text>
    </View>
  );
}

function StatCell({ icon, value, label, c, isRTL }: {
  icon: string; value: string; label: string; c: C; isRTL: boolean;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
      <Feather name={icon as any} size={16} color={c.gold} />
      <Text style={[styles.statValue, { color: c.ink, fontFamily: "Georgia" }]}>{value}</Text>
      <Text style={[
        styles.statLabel,
        { color: c.inkMuted },
        isRTL && { fontFamily: "Amiri_400Regular", fontSize: 12 },
      ]}>
        {label}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  topBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  topTitle: {
    flex: 1,
    fontFamily: "Georgia",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 8,
  },

  // Hero
  heroAr: {
    fontFamily: "Amiri_700Bold",
    fontSize: 34,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 52,
  },
  heroEn: {
    fontFamily: "Georgia",
    fontSize: 18,
    textAlign: "center",
    opacity: 0.75,
  },
  anchorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    marginTop: 4,
  },
  anchorLabel: { fontSize: 11, fontWeight: "600" },

  // Section labels — always use sectionLabelEn or sectionLabelAr, never merged
  sectionLabelEn: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  sectionLabelAr: {
    fontFamily: "Amiri_400Regular",
    fontSize: 13,
    textAlign: "right",
    writingDirection: "rtl",
  },

  // Hadith
  hadithCard: { borderRadius: 16, borderWidth: 0.5, padding: 18, marginBottom: 14, gap: 12 },
  hadithAr: {
    fontFamily: "Amiri_400Regular",
    fontSize: 19,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 34,
  },
  hadithEn: { fontFamily: "Georgia", fontStyle: "italic", fontSize: 14, lineHeight: 24 },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 10, borderTopWidth: 0.5 },
  sourceText: { fontSize: 11 },

  // Description
  descCard: { borderRadius: 14, borderWidth: 0.5, padding: 16, marginBottom: 14, gap: 8 },
  descBody:  { fontSize: 14, lineHeight: 22 },

  // Chips
  chips:     { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip:      { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, borderWidth: 0.5 },
  chipLabel: { fontSize: 11, fontWeight: "500" },

  // Stats
  statsCard:    { borderRadius: 16, borderWidth: 0.5, padding: 16, marginBottom: 24, gap: 14 },
  statsGrid:    { flexDirection: "row", alignItems: "center" },
  statsDivider: { width: 0.5, height: 40 },
  statValue:    { fontSize: 22, fontWeight: "400" },
  statLabel:    { fontSize: 10, textAlign: "center" },
  bestRow:      { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 12, borderTopWidth: 0.5, justifyContent: "center" },
  bestText:     { fontSize: 12 },

  // CTA
  checkBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  checkBtnText: { fontFamily: "Georgia", fontSize: 17 },
  removeText:   { fontSize: 13 },

  // Not-yet-active hint
  lockedHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  lockedHintText: { flex: 1, fontSize: 13, lineHeight: 19 },

  // Bottom share button
  shareBottomBtn: {
    borderRadius: 14,
    borderWidth: 0.5,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  shareBottomText: { fontFamily: "Georgia", fontSize: 15 },

  // Share modal
  shareOverlay: { flex: 1 },
  shareSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  shareHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  shareTitle: { fontFamily: "Georgia", fontSize: 17 },
  messageInput: {
    width: "100%",
    minHeight: 44,
    maxHeight: 80,
    borderRadius: 12,
    borderWidth: 0.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardWrap: {
    borderRadius: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  shareActions: {
    paddingTop: 16,
    borderTopWidth: 0.5,
    gap: 10,
    marginTop: 4,
  },
  shareBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  shareBtnText: {
    fontFamily: "Georgia",
    fontSize: 16,
    color: "#0e1a2b",
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    minHeight: 48,
  },
  saveBtnText: { fontSize: 14, fontWeight: "500" },
});
