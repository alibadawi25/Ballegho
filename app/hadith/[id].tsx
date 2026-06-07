/**
 * Hadith reader — full Arabic + English of a single hadith (e.g. one of
 * al-Nawawī's Forty), with in-collection navigation.
 *
 *   • Collection eyebrow + "N of total" position
 *   • Large Arabic card, translation, reference
 *   • Favorite (item_type 'hadith') + text share
 *   • Previous / Next move through the collection in place
 *
 * Read-only content from public.hadiths. Outside the (tabs) tree, opened from
 * the collection screen.
 */

import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Share,
} from "react-native";
import { useEffect, useState, useCallback, useRef } from "react";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLang } from "@/hooks/useLang";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/lib/supabase";
import { colors, type Colors } from "@/constants/theme";
import { toArabicDigits } from "@/lib/arabicNumerals";

interface HadithRow {
  id:         string;
  collection: string;
  number:     number;
  arabic:     string;
  english:    string | null;
  reference:  string | null;
}
interface NavItem { id: string; number: number; }

// Map a hadiths.collection key → its i18n collection title.
const COLLECTION_I18N: Record<string, string> = { nawawi40: "the40" };

export default function HadithReaderScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { t, isRTL, isDark } = useLang();
  const c = colors(isDark);

  const { isFavorite, toggle: toggleFav, reload: reloadFavs } = useFavorites();
  useFocusEffect(useCallback(() => { reloadFavs(); }, [reloadFavs]));

  const [h,        setH]       = useState<HadithRow | null>(null);
  const [nav,      setNav]     = useState<NavItem[]>([]);
  const [loading,  setLoading] = useState(true);
  // Font size control — Arabic base 23px, clamped 18–32.
  const [fontSize, setFontSize] = useState(23);
  const MIN_SIZE = 18, MAX_SIZE = 32;
  const bumpSize = (delta: number) =>
    setFontSize((s) => Math.min(MAX_SIZE, Math.max(MIN_SIZE, s + delta)));

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) { setLoading(false); return; }
      setLoading(true);
      const { data } = await supabase
        .from("hadiths")
        .select("id, collection, number, arabic, english, reference")
        .eq("id", id)
        .maybeSingle();
      if (!alive) return;
      const row = (data as HadithRow) ?? null;
      setH(row);
      setLoading(false);

      // Load sibling ids for prev/next + position (small set).
      if (row) {
        const { data: list } = await supabase
          .from("hadiths")
          .select("id, number")
          .eq("collection", row.collection)
          .order("number");
        if (alive) setNav((list ?? []) as NavItem[]);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  function handleShare() {
    if (!h) return;
    const msg = isRTL
      ? `${h.arabic}\n\n${h.english ?? ""}\n\n— ${h.reference ?? ""}`
      : `${h.english ?? ""}\n\n${h.arabic}\n\n— ${h.reference ?? ""}`;
    Share.share({ message: msg }).catch(() => {});
  }

  if (loading || !h) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
        {loading ? <ActivityIndicator size="large" color={c.gold} /> : (
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: c.gold }}>{isRTL ? "رجوع" : "Back"}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const fav        = isFavorite(h.id, "hadith");
  const numLabel   = `${t.hadith.number} ${isRTL ? toArabicDigits(h.number) : h.number}`;
  const collKey    = COLLECTION_I18N[h.collection];
  const collTitle  = collKey ? ((t.collections as any)[collKey].title as string) : null;

  const index = nav.findIndex((n) => n.id === h.id);
  const total = nav.length;
  // In RTL the visual "previous/next" flips so the arrows point intuitively.
  const prev  = index > 0 ? nav[index - 1] : null;
  const next  = index >= 0 && index < total - 1 ? nav[index + 1] : null;
  const go    = (n: NavItem | null) => n && router.replace({ pathname: "/hadith/[id]", params: { id: n.id } });

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
        <Text style={[styles.topTitle, { color: c.ink }]} numberOfLines={1}>{numLabel}</Text>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
          {/* A− / A+ font size controls */}
          <TouchableOpacity onPress={() => bumpSize(-2)} disabled={fontSize <= MIN_SIZE} activeOpacity={0.7}
            style={[styles.topBtn, { backgroundColor: c.surface, opacity: fontSize <= MIN_SIZE ? 0.35 : 1 }]}>
            <Text style={{ fontSize: 11, color: c.inkMuted, fontWeight: "600" }}>A−</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => bumpSize(2)} disabled={fontSize >= MAX_SIZE} activeOpacity={0.7}
            style={[styles.topBtn, { backgroundColor: c.surface, opacity: fontSize >= MAX_SIZE ? 0.35 : 1 }]}>
            <Text style={{ fontSize: 13, color: c.inkMuted, fontWeight: "600" }}>A+</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => toggleFav(h.id, "hadith")} activeOpacity={0.7} style={[styles.topBtn, { backgroundColor: c.surface }]}>
            <Ionicons name={fav ? "heart" : "heart-outline"} size={18} color={fav ? c.gold : c.inkMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} activeOpacity={0.7} style={[styles.topBtn, { backgroundColor: c.surface }]}>
            <Feather name="share-2" size={17} color={c.inkMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: insets.bottom + 32 }}
      >
        {/* ── Hero: collection + big number + position ────────── */}
        <View style={{ alignItems: "center", marginBottom: 22 }}>
          {collTitle && (
            <Text style={[
              isRTL ? styles.collAr : styles.collEn,
              { color: c.gold, marginBottom: 10 },
            ]}>
              {collTitle}
            </Text>
          )}
          <View style={[styles.numCircle, { borderColor: c.gold + "55", backgroundColor: c.gold + "10" }]}>
            <Text style={[styles.numCircleText, { color: c.gold }]}>
              {isRTL ? toArabicDigits(h.number) : h.number}
            </Text>
          </View>
          {total > 0 && (
            <Text style={{ fontSize: 11, color: c.inkFaint, marginTop: 10 }}>
              {isRTL
                ? `${toArabicDigits(h.number)} ${t.hadith.of} ${toArabicDigits(total)}`
                : `${h.number} ${t.hadith.of} ${total}`}
            </Text>
          )}
        </View>

        {/* ── Arabic ──────────────────────────────────────────── */}
        <View style={[styles.arCard, { backgroundColor: c.surface, borderColor: c.gold + "30" }]}>
          <Text style={[styles.arText, { color: c.ink, fontSize, lineHeight: fontSize * 2 }]}>{h.arabic}</Text>
        </View>

        {/* ── Translation ─────────────────────────────────────── */}
        {h.english && (
          <View style={{ marginTop: 22 }}>
            <View style={[styles.transLabelRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.transTick, { backgroundColor: c.gold }]} />
              <Text style={[isRTL ? styles.labelAr : styles.labelEn, { color: c.inkMuted }]}>
                {t.hadith.translation}
              </Text>
            </View>
            <Text style={[styles.enText, { color: c.ink, textAlign: isRTL ? "right" : "left" }]}>
              {h.english}
            </Text>
          </View>
        )}

        {/* ── Reference ───────────────────────────────────────── */}
        {h.reference && (
          <View style={[styles.refRow, { borderTopColor: c.divider, flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Feather name="book-open" size={12} color={c.inkFaint} />
            <Text style={{ fontSize: 11, color: c.inkFaint }}>{h.reference}</Text>
          </View>
        )}

        {/* ── Prev / Next ─────────────────────────────────────── */}
        {total > 1 && (
          <View style={[styles.navRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <NavBtn
              dir="prev" label={t.hadith.prev} disabled={!prev} c={c} isRTL={isRTL}
              onPress={() => go(prev)}
            />
            <NavBtn
              dir="next" label={t.hadith.next} disabled={!next} c={c} isRTL={isRTL}
              onPress={() => go(next)}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Prev/Next button ────────────────────────────────────────────────────────────

function NavBtn({ dir, label, disabled, c, isRTL, onPress }: {
  dir: "prev" | "next"; label: string; disabled: boolean; c: Colors; isRTL: boolean; onPress: () => void;
}) {
  // Arrow points outward in reading order: prev = back, next = forward.
  const back = dir === "prev";
  const icon = (back ? (isRTL ? "chevron-right" : "chevron-left") : (isRTL ? "chevron-left" : "chevron-right")) as any;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.navBtn,
        { backgroundColor: c.surface, borderColor: c.divider, opacity: disabled ? 0.4 : 1,
          flexDirection: isRTL ? "row-reverse" : "row" },
      ]}
    >
      {back && <Feather name={icon} size={15} color={c.gold} />}
      <Text style={[styles.navText, { color: c.ink }, isRTL && { fontFamily: "Amiri_400Regular", fontSize: 14 }]}>
        {label}
      </Text>
      {!back && <Feather name={icon} size={15} color={c.gold} />}
    </TouchableOpacity>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topBar:   { alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5 },
  topBtn:   { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, fontFamily: "Georgia", fontSize: 16, textAlign: "center", paddingHorizontal: 8 },

  collEn: { fontFamily: "Georgia", fontSize: 13, fontStyle: "italic", letterSpacing: 0.2 },
  collAr: { fontFamily: "Amiri_700Bold", fontSize: 16, writingDirection: "rtl" },

  numCircle:     { width: 60, height: 60, borderRadius: 30, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  numCircleText: { fontFamily: "Georgia", fontSize: 28 },

  arCard:  { borderRadius: 16, borderWidth: 0.5, padding: 22 },
  arText:  { fontFamily: "Amiri_400Regular", lineHeight: 46, textAlign: "right", writingDirection: "rtl" },

  transLabelRow: { alignItems: "center", gap: 7, marginBottom: 10 },
  transTick:     { width: 14, height: 2, borderRadius: 1 },
  labelEn: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.2 },
  labelAr: { fontFamily: "Amiri_400Regular", fontSize: 13, writingDirection: "rtl" },
  enText:  { fontFamily: "Georgia", fontSize: 16, lineHeight: 27 },

  refRow:  { alignItems: "center", gap: 6, marginTop: 22, paddingTop: 14, borderTopWidth: 0.5, justifyContent: "center" },

  navRow:  { justifyContent: "space-between", gap: 12, marginTop: 28 },
  navBtn:  { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 0.5 },
  navText: { fontFamily: "Georgia", fontSize: 14 },
});
