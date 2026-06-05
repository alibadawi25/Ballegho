/**
 * Collection screen — a curated set of sunnahs (e.g. "The 40", "Ḥiṣn al-Muslim").
 *
 * Opened from the Learn tab's collections grid. Membership is defined by slug in
 * `constants/collections.ts`; display text lives in `t.collections[key]`.
 *
 * Reuses the app's favorite-heart + tap-to-detail behaviour. Outside the (tabs)
 * tree (like sunnah/[id]) so the back button returns to Learn.
 */

import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLang } from "@/hooks/useLang";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useHadithCollection, type Hadith } from "@/hooks/useHadithCollection";
import { extractMatn } from "@/lib/hadithUtils";
import { supabase } from "@/lib/supabase";
import { colors, type Colors } from "@/constants/theme";
import { COLLECTIONS, collectionAccent, type CollectionKey } from "@/constants/collections";

interface CollectionItem {
  id:                string;
  slug:              string;
  name_en:           string;
  name_ar:           string;
  estimated_seconds: number;
}

function fmtDuration(sec: number): string | null {
  if (!sec) return null;
  if (sec < 60) return `${sec}s`;
  return `${Math.round(sec / 60)}m`;
}

// Eastern Arabic-Indic digits for counts shown in RTL.
const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const toArabicDigits = (n: number) => String(n).replace(/[0-9]/g, (d) => AR_DIGITS[+d]);

export default function CollectionScreen() {
  const { key }  = useLocalSearchParams<{ key: string }>();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, isRTL, isDark } = useLang();
  const c = colors(isDark);

  const { isFavorite, toggle: toggleFav, reload: reloadFavs } = useFavorites();
  useFocusEffect(useCallback(() => { reloadFavs(); }, [reloadFavs]));

  const def      = COLLECTIONS[key as CollectionKey];
  const accent   = def ? collectionAccent(def.accent, c) : c.gold;
  const text     = def ? (t.collections as any)[def.key] as { title: string; sub: string; desc: string } : null;
  const isHadith = def?.kind === "hadith";

  // Hadith-backed collections (e.g. The 40) load from public.hadiths.
  const { items: hadiths, loading: hadithLoading } = useHadithCollection(
    isHadith ? def?.hadithCollection : undefined,
  );

  // Sunnah-backed collections load curated slugs from public.sunnahs.
  const [items,   setItems]   = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!def || def.kind !== "sunnah" || !def.slugs) { setLoading(false); return; }
      const slugs = def.slugs;
      const { data } = await supabase
        .from("sunnahs")
        .select("id, slug, name_en, name_ar, estimated_seconds")
        .in("slug", slugs);

      if (!alive) return;
      // Preserve the curated order from the slug list.
      const order = new Map(slugs.map((s, i) => [s, i]));
      const sorted = (data ?? [])
        .slice()
        .sort((a: any, b: any) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
      setItems(sorted as CollectionItem[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [def?.key]);

  const listLoading = isHadith ? hadithLoading : loading;
  const listCount   = isHadith ? hadiths.length : items.length;
  const countNoun   = isHadith ? t.collections.hadithItems : t.collections.items;

  // Unknown collection key — show a minimal not-found rather than crashing.
  if (!def || !text) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ color: c.inkMuted, fontSize: 14 }}>—</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: c.gold, fontSize: 14 }}>{isRTL ? "رجوع" : "Back"}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* ── Top bar ─────────────────────────────────────────── */}
      <View style={[
        styles.topBar,
        { paddingTop: insets.top + 10, backgroundColor: c.bg, borderBottomColor: c.divider,
          flexDirection: isRTL ? "row-reverse" : "row" },
      ]}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={[styles.topBtn, { backgroundColor: c.surface }]}
        >
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={19} color={c.inkMuted} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: c.ink }]} numberOfLines={1}>
          {text.title}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* ── Hero header ───────────────────────────────────── */}
        <View style={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: 8 }}>
          <View style={[styles.heroIcon, { backgroundColor: accent + "18", alignSelf: isRTL ? "flex-end" : "flex-start" }]}>
            <Feather name={def.icon as any} size={22} color={accent} />
          </View>
          <Text style={[
            isRTL ? styles.eyebrowAr : styles.eyebrowEn,
            { color: c.inkMuted, marginTop: 14, textAlign: isRTL ? "right" : "left" },
          ]}>
            {t.collections.label}
          </Text>
          <Text style={[
            isRTL ? styles.titleAr : styles.titleEn,
            { color: c.ink, marginTop: 4, textAlign: isRTL ? "right" : "left" },
          ]}>
            {text.title}
          </Text>
          <Text style={[
            isRTL ? styles.descAr : styles.descEn,
            { color: c.inkMuted, marginTop: 8, textAlign: isRTL ? "right" : "left" },
          ]}>
            {text.desc}
          </Text>
          {!listLoading && (
            <Text style={[
              styles.count,
              { color: c.inkFaint, marginTop: 10, textAlign: isRTL ? "right" : "left" },
            ]}>
              {isRTL ? toArabicDigits(listCount) : listCount} {countNoun}
            </Text>
          )}
        </View>

        {/* ── List ──────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 22, marginTop: 8 }}>
          {listLoading ? (
            <ActivityIndicator color={c.gold} style={{ marginTop: 40 }} />
          ) : listCount === 0 ? (
            <Text style={{ color: c.inkMuted, fontSize: 13, textAlign: "center", marginTop: 32 }}>
              {t.collections.empty}
            </Text>
          ) : isHadith ? (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
              {hadiths.map((h, i) => (
                <View key={h.id}>
                  {i > 0 && <View style={[styles.rowDivider, { backgroundColor: c.divider }]} />}
                  <HadithRow
                    h={h} c={c} isRTL={isRTL} accent={accent}
                    onPress={() => router.push({ pathname: "/hadith/[id]", params: { id: h.id } })}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
              {items.map((s, i) => (
                <View key={s.id}>
                  {i > 0 && <View style={[styles.rowDivider, { backgroundColor: c.divider }]} />}
                  <Row
                    s={s} c={c} isRTL={isRTL} accent={accent}
                    fav={isFavorite(s.id)}
                    onToggleFav={() => toggleFav(s.id)}
                    onPress={() => router.push({ pathname: "/sunnah/[id]", params: { id: s.id } })}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Row ────────────────────────────────────────────────────────────────────────

function Row({ s, c, isRTL, accent, fav, onToggleFav, onPress }: {
  s: CollectionItem; c: Colors; isRTL: boolean; accent: string;
  fav: boolean; onToggleFav: () => void; onPress: () => void;
}) {
  const duration = fmtDuration(s.estimated_seconds);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row" }]}
    >
      <View style={[styles.dot, { backgroundColor: accent + "22" }]}>
        <View style={[styles.dotInner, { backgroundColor: accent }]} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ fontSize: 13, fontWeight: "500", color: c.ink, textAlign: isRTL ? "right" : "left" }}
          numberOfLines={1}
        >
          {isRTL ? s.name_ar : s.name_en}
        </Text>
        {duration && (
          <Text style={{ fontSize: 10, color: c.inkFaint, marginTop: 1, textAlign: isRTL ? "right" : "left" }}>
            {duration}
          </Text>
        )}
      </View>

      <TouchableOpacity
        onPress={onToggleFav}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      >
        <Ionicons name={fav ? "heart" : "heart-outline"} size={18} color={fav ? c.gold : c.inkFaint} />
      </TouchableOpacity>

      <Feather
        name={isRTL ? "chevron-left" : "chevron-right"}
        size={14}
        color={c.inkFaint}
        style={{ opacity: 0.5 }}
      />
    </TouchableOpacity>
  );
}

// ─── Hadith row ──────────────────────────────────────────────────────────────────

function HadithRow({ h, c, isRTL, accent, onPress }: {
  h: Hadith; c: Colors; isRTL: boolean; accent: string; onPress: () => void;
}) {
  // Arabic in RTL, English in LTR. Extract the matn (Prophet's words) rather
  // than showing the sanad (narrator chain) in the preview.
  const raw     = isRTL ? (h.arabic ?? h.english ?? "") : (h.english ?? h.arabic ?? "");
  const matn    = extractMatn(raw, isRTL);
  const LIMIT   = isRTL ? 70 : 85; // Arabic is denser per char
  const preview = matn.slice(0, LIMIT).trim();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row", alignItems: "flex-start" }]}
    >
      <View style={[styles.numBadge, { backgroundColor: accent + "18" }]}>
        <Text style={[styles.numText, { color: accent }]}>
          {isRTL ? toArabicDigits(h.number) : h.number}
        </Text>
      </View>

      <View style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
        <Text
          style={isRTL
            ? { fontFamily: "Amiri_400Regular", fontSize: 14, color: c.ink, lineHeight: 22, textAlign: "right", writingDirection: "rtl" }
            : { fontSize: 13, color: c.ink, lineHeight: 19, textAlign: "left" }}
          numberOfLines={2}
        >
          {preview}{preview.length >= LIMIT ? "…" : ""}
        </Text>
      </View>

      <Feather
        name={isRTL ? "chevron-left" : "chevron-right"}
        size={14}
        color={c.inkFaint}
        style={{ opacity: 0.5, marginTop: 4 }}
      />
    </TouchableOpacity>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topBar: {
    alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5,
  },
  topBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, fontFamily: "Georgia", fontSize: 16, textAlign: "center", paddingHorizontal: 8 },

  heroIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },

  // Exclusive Arabic/English pairs
  eyebrowEn: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.4 },
  eyebrowAr: { fontFamily: "Amiri_400Regular", fontSize: 13, writingDirection: "rtl" },
  titleEn:   { fontFamily: "Georgia", fontSize: 28, letterSpacing: -0.5 },
  titleAr:   { fontFamily: "Amiri_700Bold", fontSize: 30, lineHeight: 46, writingDirection: "rtl" },
  descEn:    { fontFamily: "Georgia", fontStyle: "italic", fontSize: 14, lineHeight: 22 },
  descAr:    { fontFamily: "Amiri_400Regular", fontSize: 16, lineHeight: 28, writingDirection: "rtl" },
  count:     { fontSize: 11, fontFamily: "Georgia" },

  card:       { borderRadius: 14, borderWidth: 0.5, overflow: "hidden" },
  rowDivider: { height: 0.5, marginHorizontal: 14 },
  row:        { paddingHorizontal: 14, paddingVertical: 12, alignItems: "center", gap: 12 },
  dot:        { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  dotInner:   { width: 8, height: 8, borderRadius: 4 },
  numBadge:   { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  numText:    { fontFamily: "Georgia", fontSize: 14 },
});
