/**
 * Favorites / Saved — a dedicated page for everything the user has hearted,
 * across both content types: practice sunnahs and hadiths.
 *
 * Opened from the Profile "Saved" row. Resolves the favorite ids (from
 * useFavorites) into their content rows and groups them into sections. Hearts
 * here un-save; tapping opens the matching detail/reader screen.
 */

import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet,
} from "react-native";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLang } from "@/hooks/useLang";
import { useFavorites } from "@/hooks/useFavorites";
import { extractMatn } from "@/lib/hadithUtils";
import { supabase } from "@/lib/supabase";
import { colors, type Colors } from "@/constants/theme";

interface SavedSunnah { id: string; name_en: string; name_ar: string; category: string; estimated_seconds: number; }
interface SavedHadith { id: string; number: number; arabic: string | null; english: string | null; }

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const toArabicDigits = (n: number) => String(n).replace(/[0-9]/g, (d) => AR_DIGITS[+d]);

function fmtDuration(sec: number): string | null {
  if (!sec) return null;
  return sec < 60 ? `${sec}s` : `${Math.round(sec / 60)}m`;
}

export default function FavoritesScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { t, isRTL, isDark } = useLang();
  const c = colors(isDark);

  const { isFavorite, toggle, idsOfType, loading: favLoading, reload } = useFavorites();
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const sunnahIds = useMemo(() => [...idsOfType("sunnah")].sort(), [idsOfType]);
  const hadithIds = useMemo(() => [...idsOfType("hadith")].sort(), [idsOfType]);
  const sunnahKey = sunnahIds.join(",");
  const hadithKey = hadithIds.join(",");

  const [sunnahs, setSunnahs] = useState<SavedSunnah[]>([]);
  const [hadiths, setHadiths] = useState<SavedHadith[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [{ data: sData }, { data: hData }] = await Promise.all([
        sunnahIds.length
          ? supabase.from("sunnahs").select("id, name_en, name_ar, category, estimated_seconds").in("id", sunnahIds)
          : Promise.resolve({ data: [] as any[] }),
        hadithIds.length
          ? supabase.from("hadiths").select("id, number, arabic, english").in("id", hadithIds).order("number")
          : Promise.resolve({ data: [] as any[] }),
      ]);
      if (!alive) return;
      setSunnahs((sData ?? []) as SavedSunnah[]);
      setHadiths((hData ?? []) as SavedHadith[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [sunnahKey, hadithKey]);

  const busy  = favLoading || loading;
  const empty = !busy && sunnahs.length === 0 && hadiths.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* ── Top bar ─────────────────────────────────────────── */}
      <View style={[
        styles.topBar,
        { paddingTop: insets.top + 10, backgroundColor: c.bg, borderBottomColor: c.divider,
          flexDirection: isRTL ? "row-reverse" : "row" },
      ]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={[styles.topBtn, { backgroundColor: c.surface }]}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={19} color={c.inkMuted} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: c.ink }]} numberOfLines={1}>{t.favorites.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: insets.bottom + 40 }}
      >
        {busy ? (
          <ActivityIndicator color={c.gold} style={{ marginTop: 48 }} />
        ) : empty ? (
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={34} color={c.inkFaint} />
            <Text style={[styles.emptyText, { color: c.inkMuted }, isRTL && { fontFamily: "Amiri_400Regular", fontSize: 15 }]}>
              {t.favorites.empty}
            </Text>
            <Text style={[styles.emptyHint, { color: c.inkFaint }, isRTL && { fontFamily: "Amiri_400Regular", fontSize: 13 }]}>
              {t.favorites.emptyHint}
            </Text>
          </View>
        ) : (
          <>
            {/* ── Sunnahs ─────────────────────────────────────── */}
            {sunnahs.length > 0 && (
              <Section title={t.favorites.sunnahsSection} count={sunnahs.length} c={c} isRTL={isRTL}>
                {sunnahs.map((s, i) => (
                  <View key={s.id}>
                    {i > 0 && <View style={[styles.rowDivider, { backgroundColor: c.divider }]} />}
                    <SunnahRow
                      s={s} c={c} isRTL={isRTL}
                      onToggle={() => toggle(s.id, "sunnah")}
                      onPress={() => router.push({ pathname: "/sunnah/[id]", params: { id: s.id } })}
                    />
                  </View>
                ))}
              </Section>
            )}

            {/* ── Hadith ──────────────────────────────────────── */}
            {hadiths.length > 0 && (
              <Section title={t.favorites.hadithSection} count={hadiths.length} c={c} isRTL={isRTL}>
                {hadiths.map((h, i) => (
                  <View key={h.id}>
                    {i > 0 && <View style={[styles.rowDivider, { backgroundColor: c.divider }]} />}
                    <HadithRow
                      h={h} c={c} isRTL={isRTL}
                      onToggle={() => toggle(h.id, "hadith")}
                      onPress={() => router.push({ pathname: "/hadith/[id]", params: { id: h.id } })}
                    />
                  </View>
                ))}
              </Section>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, count, c, isRTL, children }: {
  title: string; count: number; c: Colors; isRTL: boolean; children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 22 }}>
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center", justifyContent: "space-between",
        marginBottom: 10, paddingHorizontal: 2,
      }}>
        <Text style={[
          isRTL ? styles.sectionAr : styles.sectionEn,
          { color: c.inkMuted },
        ]}>
          {title}
        </Text>
        <Text style={{ fontSize: 12, fontFamily: "Georgia", color: c.inkFaint }}>
          {isRTL ? toArabicDigits(count) : count}
        </Text>
      </View>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
        {children}
      </View>
    </View>
  );
}

function SunnahRow({ s, c, isRTL, onToggle, onPress }: {
  s: SavedSunnah; c: Colors; isRTL: boolean; onToggle: () => void; onPress: () => void;
}) {
  const duration = fmtDuration(s.estimated_seconds);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
      <View style={[styles.iconWrap, { backgroundColor: c.gold + "16" }]}>
        <Ionicons name="heart" size={16} color={c.gold} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13, fontWeight: "500", color: c.ink, textAlign: isRTL ? "right" : "left" }} numberOfLines={1}>
          {isRTL ? s.name_ar : s.name_en}
        </Text>
        {duration && (
          <Text style={{ fontSize: 10, color: c.inkFaint, marginTop: 1, textAlign: isRTL ? "right" : "left" }}>{duration}</Text>
        )}
      </View>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.6} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
        <Ionicons name="heart" size={18} color={c.gold} />
      </TouchableOpacity>
      <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={14} color={c.inkFaint} style={{ opacity: 0.5 }} />
    </TouchableOpacity>
  );
}

function HadithRow({ h, c, isRTL, onToggle, onPress }: {
  h: SavedHadith; c: Colors; isRTL: boolean; onToggle: () => void; onPress: () => void;
}) {
  // Arabic text for RTL, English for LTR. Extract matn (skip the sanad).
  const raw   = isRTL ? (h.arabic ?? h.english ?? "") : (h.english ?? h.arabic ?? "");
  const matn  = extractMatn(raw, isRTL);
  const LIMIT = isRTL ? 70 : 80;
  const preview = matn.slice(0, LIMIT).trim();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row", alignItems: "flex-start" }]}>
      <View style={[styles.numBadge, { backgroundColor: c.ink + "12" }]}>
        <Text style={{ fontFamily: "Georgia", fontSize: 13, color: c.ink }}>
          {isRTL ? toArabicDigits(h.number) : h.number}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
        <Text
          style={isRTL
            ? { fontFamily: "Amiri_400Regular", fontSize: 14, color: c.ink, lineHeight: 22, textAlign: "right", writingDirection: "rtl" }
            : { fontSize: 12.5, color: c.ink, lineHeight: 18, textAlign: "left" }}
          numberOfLines={2}
        >
          {preview}{preview.length >= LIMIT ? "…" : ""}
        </Text>
      </View>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.6} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }} style={{ marginTop: 2 }}>
        <Ionicons name="heart" size={18} color={c.gold} />
      </TouchableOpacity>
      <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={14} color={c.inkFaint} style={{ opacity: 0.5, marginTop: 4 }} />
    </TouchableOpacity>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topBar:   { alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5 },
  topBtn:   { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, fontFamily: "Georgia", fontSize: 16, textAlign: "center", paddingHorizontal: 8 },

  sectionEn: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.4 },
  sectionAr: { fontFamily: "Amiri_400Regular", fontSize: 13, writingDirection: "rtl" },

  card:       { borderRadius: 14, borderWidth: 0.5, overflow: "hidden" },
  rowDivider: { height: 0.5, marginHorizontal: 14 },
  row:        { paddingHorizontal: 14, paddingVertical: 12, alignItems: "center", gap: 12 },
  iconWrap:   { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  numBadge:   { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },

  empty:     { alignItems: "center", paddingVertical: 64, gap: 12 },
  emptyText: { fontSize: 14, textAlign: "center" },
  emptyHint: { fontSize: 12, textAlign: "center", paddingHorizontal: 40, lineHeight: 18 },
});
