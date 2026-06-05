/**
 * Sunnah Library — browse the full catalogue of sunnahs.
 *
 * Read-only for now: users can search, filter by category, and open any sunnah
 * to read its hadith and details, but cannot add sunnahs to their practice list
 * from here. Rows already in the user's practice show a subtle "active" badge.
 *
 * Design ref: SunnahHiFi (docs/DESIGN_SYSTEM.md screen 4).
 */

import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Platform,
} from "react-native";
import { useCallback, useMemo, useState } from "react";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLang } from "@/hooks/useLang";
import { colors } from "@/constants/theme";
import {
  CATEGORY_META, CATEGORY_ORDER, GROUP_META, GROUP_ORDER,
} from "@/constants/sunnahMeta";
import { useSunnahLibrary, type LibrarySunnah } from "@/hooks/useSunnahLibrary";
import { useFavorites } from "@/hooks/useFavorites";
import type { GroupKey } from "@/hooks/useSunnahs";

type C = ReturnType<typeof colors>;

function toGroup(timeOfDay: string): GroupKey {
  if (timeOfDay === "morning") return "morning";
  if (timeOfDay === "evening") return "evening";
  if (timeOfDay === "night")   return "night";
  return "daily"; // anytime / afternoon
}

function fmtDuration(sec: number): string | null {
  if (!sec) return null;
  if (sec < 60) return `${sec}s`;
  return `${Math.round(sec / 60)}m`;
}

export default function SunnahLibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL, isDark } = useLang();
  const c = colors(isDark);

  const { items, loading, reload } = useSunnahLibrary();
  const { isFavorite, toggle: toggleFav, idsOfType, reload: reloadFavs } = useFavorites();

  // Accept an optional `filter` param — either a category (from the Learn tab
  // collections grid) or the special "saved" token (from Profile).
  const { filter: initialFilter } = useLocalSearchParams<{ filter?: string }>();
  const [query,     setQuery]     = useState("");
  const [category,  setCategory]  = useState<string | null>(
    initialFilter && initialFilter !== "saved" ? initialFilter : null,
  );
  const [savedOnly, setSavedOnly] = useState(initialFilter === "saved");

  const savedIds = idsOfType("sunnah");

  // Refresh active badges + saved state whenever the screen regains focus.
  useFocusEffect(useCallback(() => { reload(); reloadFavs(); }, [reload, reloadFavs]));

  const totalCount  = items.length;
  const activeCount = useMemo(() => items.filter((s) => s.is_active).length, [items]);

  // Filter pills: "All" + only the categories that actually exist in the data.
  const presentCategories = useMemo(() => {
    const set = new Set(items.map((s) => s.category));
    return CATEGORY_ORDER.filter((cat) => set.has(cat));
  }, [items]);

  // Apply search + category filter, then bucket by time-of-day.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const buckets: Record<GroupKey, LibrarySunnah[]> = {
      morning: [], daily: [], evening: [], night: [],
    };
    for (const s of items) {
      if (savedOnly && !savedIds.has(s.id)) continue;
      if (category && s.category !== category) continue;
      if (q && !s.name_en.toLowerCase().includes(q) && !s.name_ar.includes(query.trim())) continue;
      buckets[toGroup(s.time_of_day)].push(s);
    }
    return buckets;
  }, [items, query, category, savedOnly, savedIds]);

  const resultCount = GROUP_ORDER.reduce((n, k) => n + groups[k].length, 0);
  const eyebrow = `${activeCount} ${t.library.active} · ${totalCount} ${t.library.inLibrary}`;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 22, marginBottom: 16 }}>
          <Text style={[
            isRTL ? styles.eyebrowAr : styles.eyebrowEn,
            { color: c.inkMuted, marginBottom: 6, textAlign: isRTL ? "right" : "left" },
          ]}>
            {eyebrow}
          </Text>
          <Text style={[
            isRTL ? styles.titleAr : styles.titleEn,
            { color: c.ink, textAlign: isRTL ? "right" : "left" },
          ]}>
            {t.library.title}
          </Text>
        </View>

        {/* ── Search bar ─────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 22, marginBottom: 14 }}>
          <View style={[
            styles.search,
            { backgroundColor: c.surface, borderColor: c.divider, flexDirection: isRTL ? "row-reverse" : "row" },
          ]}>
            <Feather name="search" size={16} color={c.inkMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t.library.searchPh}
              placeholderTextColor={c.inkFaint}
              style={[styles.searchInput, { color: c.ink, textAlign: isRTL ? "right" : "left" }]}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={15} color={c.inkMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Filter pills ───────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 22, gap: 8, flexDirection: isRTL ? "row-reverse" : "row" }}
          style={{ marginBottom: 18, flexGrow: 0 }}
        >
          <FilterPill
            label={t.library.filterAll}
            active={category === null && !savedOnly}
            onPress={() => { setCategory(null); setSavedOnly(false); }}
            c={c} isRTL={isRTL}
          />
          <FilterPill
            label={t.favorites.filter}
            active={savedOnly}
            icon="heart"
            onPress={() => { setSavedOnly((p) => !p); setCategory(null); }}
            c={c} isRTL={isRTL}
          />
          {presentCategories.map((cat) => (
            <FilterPill
              key={cat}
              label={isRTL ? CATEGORY_META[cat].ar : CATEGORY_META[cat].en}
              active={category === cat && !savedOnly}
              onPress={() => { setSavedOnly(false); setCategory((prev) => (prev === cat ? null : cat)); }}
              c={c} isRTL={isRTL}
            />
          ))}
        </ScrollView>

        {/* ── List ───────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 22 }}>
          {loading ? (
            <ActivityIndicator color={c.gold} style={{ marginTop: 48 }} />
          ) : resultCount === 0 ? (
            <View style={styles.empty}>
              <Feather name={savedOnly ? "heart" : "search"} size={30} color={c.inkFaint} />
              <Text style={[
                styles.emptyText,
                { color: c.inkMuted },
                isRTL && { fontFamily: "Amiri_400Regular", fontSize: 15 },
              ]}>
                {savedOnly ? t.favorites.empty : t.library.empty}
              </Text>
              {savedOnly && (
                <Text style={[
                  styles.emptyHint,
                  { color: c.inkFaint },
                  isRTL && { fontFamily: "Amiri_400Regular", fontSize: 13 },
                ]}>
                  {t.favorites.emptyHint}
                </Text>
              )}
            </View>
          ) : (
            GROUP_ORDER.map((key) => (
              <LibraryGroup
                key={key}
                groupKey={key}
                sunnahs={groups[key]}
                c={c}
                isRTL={isRTL}
                t={t}
                isFavorite={isFavorite}
                onToggleFav={toggleFav}
                onPress={(s) => router.push({ pathname: "/sunnah/[id]", params: { id: s.id } })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Filter pill ───────────────────────────────────────────────────────────────

function FilterPill({ label, active, onPress, c, isRTL, icon }: {
  label: string; active: boolean; onPress: () => void; c: C; isRTL: boolean; icon?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.pill,
        { flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 5 },
        active
          ? { backgroundColor: c.gold, borderColor: c.gold }
          : { backgroundColor: c.surface, borderColor: c.divider },
      ]}
    >
      {icon && (
        <Feather name={icon as any} size={12} color={active ? c.surface : c.inkMuted} />
      )}
      <Text style={[
        styles.pillText,
        { color: active ? c.surface : c.inkMuted },
        isRTL && { fontFamily: "Amiri_400Regular", fontSize: 13 },
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Group section ─────────────────────────────────────────────────────────────

function LibraryGroup({ groupKey, sunnahs, c, isRTL, t, onPress, isFavorite, onToggleFav }: {
  groupKey: GroupKey;
  sunnahs: LibrarySunnah[];
  c: C; isRTL: boolean;
  t: ReturnType<typeof useLang>["t"];
  onPress: (s: LibrarySunnah) => void;
  isFavorite: (id: string) => boolean;
  onToggleFav: (id: string) => void;
}) {
  if (!sunnahs.length) return null;
  const meta = GROUP_META[groupKey];

  return (
    <View style={styles.group}>
      {/* Group header */}
      <View style={[styles.groupHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.groupLeft, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Feather name={meta.icon as any} size={12} color={c.inkMuted} />
          <Text style={[styles.groupLabel, {
            color: c.inkMuted,
            textTransform: isRTL ? "none" : "uppercase",
            ...(isRTL ? {} : { letterSpacing: 1.2 }),
          }]}>
            {isRTL ? meta.ar : meta.en}
          </Text>
        </View>
        <Text style={[styles.groupCount, { color: c.inkFaint }]}>{sunnahs.length}</Text>
      </View>

      {/* Rows */}
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
        {sunnahs.map((s, i) => (
          <View key={s.id}>
            {i > 0 && <View style={[styles.rowDivider, { backgroundColor: c.divider }]} />}
            <LibraryRow
              s={s} c={c} isRTL={isRTL} t={t}
              fav={isFavorite(s.id)}
              onToggleFav={() => onToggleFav(s.id)}
              onPress={() => onPress(s)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Single row ────────────────────────────────────────────────────────────────

function LibraryRow({ s, c, isRTL, t, onPress, fav, onToggleFav }: {
  s: LibrarySunnah; c: C; isRTL: boolean;
  t: ReturnType<typeof useLang>["t"];
  onPress: () => void;
  fav: boolean;
  onToggleFav: () => void;
}) {
  const catMeta  = CATEGORY_META[s.category];
  const icon     = catMeta?.icon ?? "circle";
  const duration = fmtDuration(s.estimated_seconds);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row" }]}
    >
      {/* Category icon */}
      <View style={[styles.iconWrap, { backgroundColor: c.gold + "16" }]}>
        <Feather name={icon as any} size={14} color={c.gold} />
      </View>

      {/* Name + sub */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[styles.name, { color: c.ink, textAlign: isRTL ? "right" : "left" }]}
          numberOfLines={1}
        >
          {isRTL ? s.name_ar : s.name_en}
        </Text>
        {duration && (
          <Text style={[styles.sub, { color: c.inkFaint, textAlign: isRTL ? "right" : "left" }]}>
            {duration}
          </Text>
        )}
      </View>

      {/* Active badge (informational only) */}
      {s.is_active && (
        <View style={[styles.activeBadge, { borderColor: c.gold + "60", backgroundColor: c.gold + "14" }]}>
          <Text style={[
            styles.activeText,
            { color: c.gold },
            isRTL && { fontFamily: "Amiri_400Regular", fontSize: 11 },
          ]}>
            {t.library.activeBadge}
          </Text>
        </View>
      )}

      {/* Favorite heart */}
      <TouchableOpacity
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggleFav();
        }}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      >
        <Ionicons
          name={fav ? "heart" : "heart-outline"}
          size={18}
          color={fav ? c.gold : c.inkFaint}
        />
      </TouchableOpacity>

      {/* Chevron */}
      <Feather
        name={isRTL ? "chevron-left" : "chevron-right"}
        size={14}
        color={c.inkFaint}
        style={{ opacity: 0.5 }}
      />
    </TouchableOpacity>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  eyebrowEn: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.4 },
  eyebrowAr: { fontFamily: "Amiri_400Regular", fontSize: 13, writingDirection: "rtl" },
  titleEn:   { fontFamily: "Georgia", fontSize: 28, letterSpacing: -0.5 },
  titleAr:   { fontFamily: "Amiri_700Bold", fontSize: 30, lineHeight: 46, writingDirection: "rtl" },

  // Search
  search: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  // Filter pills
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 0.5,
  },
  pillText: { fontSize: 12, fontWeight: "500", letterSpacing: 0.1 },

  // Group
  group: { marginBottom: 16 },
  groupHeader: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  groupLeft:  { alignItems: "center", gap: 6 },
  groupLabel: { fontSize: 10, fontWeight: "600" },
  groupCount: { fontSize: 12, fontFamily: "Georgia" },
  card:       { borderRadius: 14, borderWidth: 0.5, overflow: "hidden" },
  rowDivider: { height: 0.5, marginHorizontal: 14 },

  // Row
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  name: { fontSize: 13, fontWeight: "500", lineHeight: 18 },
  sub:  { fontSize: 10, marginTop: 1 },
  activeBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 99, borderWidth: 1,
  },
  activeText: { fontSize: 9, fontWeight: "600" },

  // Empty
  empty:     { alignItems: "center", paddingVertical: 56, gap: 12 },
  emptyText: { fontSize: 14, textAlign: "center" },
  emptyHint: { fontSize: 12, textAlign: "center", paddingHorizontal: 40, lineHeight: 18, marginTop: -4 },
});
