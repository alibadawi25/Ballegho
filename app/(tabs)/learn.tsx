/**
 * Learn & Convey — the content tab.
 *
 * Powered entirely by our own Supabase sunnahs table (zero external API keys).
 *
 *  • Hadith of the Day   — rotates through the 42 DB hadiths by dayOfYear % 42
 *  • Sunnah of the Week  — weekly rotation with a half-cycle offset (no overlap)
 *  • Ballegh share       — reuses existing SunnahShareCard infrastructure
 *  • Collections grid    — 4 cards that deep-link to the Library with pre-set filter
 */

import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, Share, Alert,
} from "react-native";
import { useRef, useState } from "react";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLang } from "@/hooks/useLang";
import { colors, RADIUS, SHADOW_SM } from "@/constants/theme";
import { useLearnContent, type LearnSunnah } from "@/hooks/useLearnContent";
import { useFavorites } from "@/hooks/useFavorites";
import { usePrayerCtx } from "@/contexts/PrayerTimesContext";
import { COLLECTIONS, COLLECTION_ORDER } from "@/constants/collections";
import SunnahShareCard, { type ShareableSunnah, type ShareTheme } from "@/components/SunnahShareCard";
import ThemePicker from "@/components/ThemePicker";
import { captureRef } from "react-native-view-shot";
import * as SharingLib from "expo-sharing";
import {
  View as RNView,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from "react-native";

// ─── Source badge localisation ───────────────────────────────────────────────
//
// Hadith source strings are stored in English transliteration with Unicode
// diacritics (e.g. "Bukhārī" with macrons). The simple /Bukhari/gi regex won't
// match them — we strip diacritics first, then map to Arabic.

function stripDiacritics(s: string) {
  // Normalise to NFD then remove combining chars (macrons, dots, etc.)
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const SOURCE_MAP: [RegExp, string][] = [
  [/bukhari/i,     "البخاري"],
  [/muslim/i,      "مسلم"],
  [/abu.dawud/i,   "أبو داود"],
  [/tirmidhi/i,    "الترمذي"],
  [/ibn.majah/i,   "ابن ماجه"],
  [/nasa.i/i,      "النسائي"],
  [/ahmad/i,       "أحمد"],
  [/ibn.hibban/i,  "ابن حبان"],
  [/hakim/i,       "الحاكم"],
];

function localiseSource(src: string): string {
  const plain = stripDiacritics(src);
  for (const [pattern, arabic] of SOURCE_MAP) {
    if (pattern.test(plain)) return arabic;
  }
  return src; // fallback: return as-is if no match
}

// ─── Collections data ─────────────────────────────────────────────────────────

function getCollections(t: ReturnType<typeof useLang>["t"], inkColor: string) {
  const co = t.collections;
  return COLLECTION_ORDER.map((key) => {
    const def = COLLECTIONS[key];
    const txt = co[key] as { title: string; sub: string };
    return {
      key,
      icon:  def.icon,
      title: txt.title,
      sub:   txt.sub,
      // ink accent is theme-adaptive (cream in dark, navy in light); others fixed.
      accent:
        def.accent === "ink"     ? inkColor
        : def.accent === "emerald" ? "#2d6b4f"
        : def.accent === "rose"    ? "#a84a3d"
        : "#b8892a",
    };
  });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LearnScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL, isDark } = useLang();
  const c = colors(isDark);

  // Pass Maghrib time so rotation advances at the Islamic day boundary.
  const { prayers } = usePrayerCtx();
  const maghrib = prayers.find(p => p.key === "maghrib")?.time ?? null;

  const { hadithOfDay, sunnahOfWeek, loading, weekNum, reload: reloadContent } = useLearnContent(maghrib);
  const { isFavorite, toggle: toggleFav, reload: reloadFavs } = useFavorites();
  // Reload both content and favorites on tab focus.
  useFocusEffect(useCallback(() => { reloadContent(); reloadFavs(); }, [reloadContent, reloadFavs]));
  const collections = getCollections(t, c.ink);

  // ── Share modal state ─────────────────────────────────────────────────────
  const [shareTarget,  setShareTarget]  = useState<LearnSunnah | null>(null);
  const [shareMessage, setShareMessage] = useState("");
  const [shareTheme,   setShareTheme]   = useState<ShareTheme>("night");
  const [capturing,    setCapturing]    = useState(false);
  const cardRef = useRef<RNView>(null);

  function openShare(sunnah: LearnSunnah) {
    setShareTarget(sunnah);
    setShareMessage("");
  }

  async function handleShare() {
    if (!cardRef.current || !shareTarget) return;
    setCapturing(true);
    try {
      const uri = await captureRef(cardRef, { format: "jpg", quality: 0.95 });
      const ok  = await SharingLib.isAvailableAsync();
      if (ok) {
        await SharingLib.shareAsync(uri, {
          mimeType: "image/jpeg",
          dialogTitle: isRTL ? shareTarget.name_ar : shareTarget.name_en,
        });
      }
    } catch (e) {
      console.error("[learn share]", e);
    } finally {
      setCapturing(false);
    }
  }

  function handleCopy(sunnah: LearnSunnah) {
    const text = isRTL
      ? `${sunnah.name_ar}\n\n${sunnah.hadith_text_ar ?? ""}\n— ${sunnah.hadith_source ?? ""}`
      : `${sunnah.name_en}\n\n"${sunnah.hadith_text_en ?? ""}"\n— ${sunnah.hadith_source ?? ""}`;
    Share.share({ message: text }).catch(() => {});
  }

  // weekNum comes from useLearnContent — already Maghrib-aware.

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
        }}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 22, marginBottom: 22 }}>
          <Text style={[
            isRTL ? styles.eyebrowAr : styles.eyebrowEn,
            { color: c.inkMuted },
          ]}>
            {t.learn.eyebrow}
          </Text>
          <Text style={[
            isRTL ? styles.titleAr : styles.titleEn,
            { color: c.ink },
          ]}>
            {t.learn.title}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={c.gold} style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* ── Hadith of the Day ────────────────────────────── */}
            {hadithOfDay && (
              <View style={{ paddingHorizontal: 22, marginBottom: 20 }}>
                <Text style={[
                  isRTL ? styles.sectionLabelAr : styles.sectionLabelEn,
                  { color: c.inkMuted, marginBottom: 10,
                    textAlign: isRTL ? "right" : "left" },
                ]}>
                  {t.learn.hadithDay}
                </Text>

                <View style={[
                  styles.hadithCard,
                  {
                    backgroundColor: c.surface,
                    borderColor:     c.gold + "40",
                    ...SHADOW_SM,
                  },
                ]}>
                  {/* Source pill — use Arabic source names in RTL */}
                  <View style={[
                    styles.sourcePill,
                    { backgroundColor: "#2d6b4f" + "20", borderColor: "#2d6b4f" + "40" },
                    isRTL && { alignSelf: "flex-end" },
                  ]}>
                    <Text style={[styles.sourcePillText, { color: "#2d6b4f" }]}>
                      {isRTL
                        ? localiseSource(hadithOfDay.hadith_source ?? "")
                        : (hadithOfDay.hadith_source ?? "")}
                    </Text>
                  </View>

                  {/* Arabic hadith */}
                  {hadithOfDay.hadith_text_ar && (
                    <Text style={[styles.hadithAr, { color: c.ink }]}>
                      «{hadithOfDay.hadith_text_ar}»
                    </Text>
                  )}

                  {/* English hadith */}
                  {hadithOfDay.hadith_text_en && (
                    <Text style={[styles.hadithEn, { color: c.inkMuted }]}>
                      "{hadithOfDay.hadith_text_en}"
                    </Text>
                  )}

                  <Text style={[
                    styles.prophetText,
                    { color: c.inkFaint },
                    isRTL && { textAlign: "right" },
                  ]}>
                    — {isRTL ? "النبي ﷺ" : "The Prophet ﷺ"}
                  </Text>

                  {/* Divider */}
                  <View style={[styles.divider, { backgroundColor: c.divider }]} />

                  {/* Action row */}
                  <View style={[styles.actions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <TouchableOpacity
                      onPress={() => openShare(hadithOfDay)}
                      activeOpacity={0.8}
                      style={[styles.balleghBtn, { backgroundColor: c.gold }]}
                    >
                      <Feather name="share-2" size={13} color={isDark ? "#0a1422" : "#0e1a2b"} />
                      <Text style={[
                        styles.balleghText,
                        { color: isDark ? "#0a1422" : "#0e1a2b" },
                        isRTL && { fontFamily: "Amiri_700Bold", fontSize: 15 },
                      ]}>
                        {t.learn.share}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleCopy(hadithOfDay)}
                      activeOpacity={0.7}
                      style={[styles.iconBtn, { borderColor: c.divider }]}
                    >
                      <Feather name="copy" size={15} color={c.inkMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => toggleFav(hadithOfDay.id)}
                      activeOpacity={0.7}
                      style={[styles.iconBtn, {
                        borderColor: isFavorite(hadithOfDay.id) ? c.gold + "60" : c.divider,
                        backgroundColor: isFavorite(hadithOfDay.id) ? c.gold + "12" : "transparent",
                      }]}
                    >
                      <Ionicons
                        name={isFavorite(hadithOfDay.id) ? "heart" : "heart-outline"}
                        size={16}
                        color={isFavorite(hadithOfDay.id) ? c.gold : c.inkMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* ── Sunnah of the Week ───────────────────────────── */}
            {sunnahOfWeek && (
              <View style={{ paddingHorizontal: 22, marginBottom: 20 }}>
                <Text style={[
                  isRTL ? styles.sectionLabelAr : styles.sectionLabelEn,
                  { color: c.inkMuted, marginBottom: 10,
                    textAlign: isRTL ? "right" : "left" },
                ]}>
                  {t.learn.sunnahWeek}
                </Text>

                <View style={[
                  styles.weekCard,
                  { backgroundColor: c.gold },
                ]}>
                  {/* Eyebrow */}
                  <View style={[
                    styles.weekEyebrowRow,
                    { flexDirection: isRTL ? "row-reverse" : "row" },
                  ]}>
                    <Text style={[
                      styles.weekEyebrowEn,
                      isRTL && styles.weekEyebrowAr,
                      { color: isDark ? "#0a1422" : "#0e1a2b", opacity: 0.7 },
                    ]}>
                      {isRTL
                        ? `${t.learn.weekLabel} ${weekNum}`
                        : `${t.learn.weekLabel} ${weekNum}`}
                    </Text>
                    <View style={styles.unlockedPill}>
                      <Feather name="unlock" size={10} color={isDark ? "#0a1422" : "#0e1a2b"} />
                    </View>
                  </View>

                  {/* Arabic name */}
                  <Text style={[styles.weekNameAr, { color: isDark ? "#0a1422" : "#0e1a2b" }]}>
                    {sunnahOfWeek.name_ar}
                  </Text>
                  {/* English name — hide in Arabic mode (Arabic name above is enough) */}
                  {!isRTL && (
                    <Text style={[styles.weekNameEn, {
                      color: (isDark ? "#0a1422" : "#0e1a2b"),
                      opacity: 0.75,
                    }]}>
                      {sunnahOfWeek.name_en}
                    </Text>
                  )}

                  {/* Hadith snippet */}
                  {sunnahOfWeek.hadith_text_en && (
                    <Text style={[styles.weekHadith, {
                      color: (isDark ? "#0a1422" : "#0e1a2b"),
                      opacity: 0.6,
                    }]} numberOfLines={2}>
                      "{sunnahOfWeek.hadith_text_en}"
                    </Text>
                  )}

                  {/* Share this week's sunnah */}
                  <TouchableOpacity
                    onPress={() => openShare(sunnahOfWeek)}
                    activeOpacity={0.8}
                    style={[styles.weekShareBtn, {
                      borderColor: (isDark ? "#0a1422" : "#0e1a2b") + "30",
                    }]}
                  >
                    <Feather name="share-2" size={13} color={isDark ? "#0a1422" : "#0e1a2b"} />
                    <Text style={[
                      styles.weekShareText,
                      { color: isDark ? "#0a1422" : "#0e1a2b" },
                      isRTL && { fontFamily: "Amiri_700Bold", fontSize: 14 },
                    ]}>
                      {t.learn.share}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Collections ──────────────────────────────────── */}
            <View style={{ paddingHorizontal: 22 }}>
              <Text style={[
                isRTL ? styles.sectionLabelAr : styles.sectionLabelEn,
                { color: c.inkMuted, marginBottom: 12,
                  textAlign: isRTL ? "right" : "left" },
              ]}>
                {t.learn.collections}
              </Text>

              {/* Rows of 2 — odd card on last row spans full width.
                  5 collections: rows [0,1], [2,3], [4] */}
              {[[0,1],[2,3],[4]].map((idxs, ri) => (
                <View
                  key={ri}
                  style={[
                    styles.gridRow,
                    { flexDirection: isRTL ? "row-reverse" : "row" },
                    ri > 0 && { marginTop: 12 },
                  ]}
                >
                  {idxs.map(idx => collections[idx]).filter(Boolean).map((col) => (
                    <TouchableOpacity
                      key={col.key}
                      activeOpacity={0.75}
                      onPress={() => router.push({
                        pathname: "/collection/[key]",
                        params: { key: col.key },
                      })}
                      style={[
                        styles.collCard,
                        {
                          backgroundColor: c.surface,
                          borderColor: c.divider,
                          ...SHADOW_SM,
                        },
                      ]}
                    >
                      <View style={[
                        styles.collIconWrap,
                        {
                          backgroundColor: col.accent + "18",
                          // Mirror icon to the reading-start edge in RTL
                          alignSelf: isRTL ? "flex-end" : "flex-start",
                        },
                      ]}>
                        <Feather name={col.icon as any} size={18} color={col.accent} />
                      </View>
                      <Text style={[
                        styles.collTitle,
                        { color: c.ink },
                        isRTL && { fontFamily: "Amiri_700Bold", fontSize: 16,
                                    textAlign: "right" },
                      ]}>
                        {col.title}
                      </Text>
                      <Text style={[
                        styles.collSub,
                        { color: c.inkMuted },
                        isRTL && { fontFamily: "Amiri_400Regular", fontSize: 13,
                                    textAlign: "right" },
                      ]}>
                        {col.sub}
                      </Text>
                      <View style={{
                        alignSelf: isRTL ? "flex-start" : "flex-end",
                        marginTop: 6,
                      }}>
                        <Feather
                          name={isRTL ? "chevron-left" : "chevron-right"}
                          size={14}
                          color={c.inkFaint}
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Share modal (reuses SunnahShareCard) ────────────────────────────── */}
      {shareTarget && (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setShareTarget(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <TouchableOpacity
              style={styles.shareOverlay}
              activeOpacity={1}
              onPress={() => setShareTarget(null)}
            />
            <View style={[
              styles.shareSheet,
              { backgroundColor: c.surface, paddingBottom: insets.bottom + 16 },
            ]}>
              <View style={[styles.shareHeaderRow, {
                flexDirection: isRTL ? "row-reverse" : "row",
              }]}>
                <Text style={[
                  styles.shareTitle,
                  { color: c.ink },
                  isRTL && { fontFamily: "Amiri_700Bold", fontSize: 18 },
                ]}>
                  {t.share.title}
                </Text>
                <TouchableOpacity onPress={() => setShareTarget(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={20} color={c.inkMuted} />
                </TouchableOpacity>
              </View>
              <View style={[styles.sheetHandle, { backgroundColor: c.divider }]} />

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 12, paddingBottom: 8, alignItems: "center" }}
                keyboardShouldPersistTaps="handled"
              >
                <TextInput
                  value={shareMessage}
                  onChangeText={setShareMessage}
                  placeholder={t.share.messagePh}
                  placeholderTextColor={c.inkFaint}
                  maxLength={120}
                  multiline
                  style={[
                    styles.messageInput,
                    { backgroundColor: c.bg, borderColor: c.divider, color: c.ink,
                      textAlign: isRTL ? "right" : "left" },
                  ]}
                />
                {/* Theme picker */}
                <ThemePicker selected={shareTheme} onSelect={setShareTheme} isRTL={isRTL} />

                <View style={styles.cardWrap}>
                  <SunnahShareCard
                    ref={cardRef}
                    sunnah={{
                      name_ar:        shareTarget.name_ar,
                      name_en:        shareTarget.name_en,
                      hadith_text_ar: shareTarget.hadith_text_ar,
                      hadith_text_en: shareTarget.hadith_text_en,
                      hadith_source:  shareTarget.hadith_source,
                    } as ShareableSunnah}
                    message={shareMessage}
                    isRTL={isRTL}
                    theme={shareTheme}
                  />
                </View>
              </ScrollView>

              <View style={[styles.shareActions, { borderTopColor: c.divider }]}>
                <TouchableOpacity
                  onPress={handleShare}
                  disabled={capturing}
                  activeOpacity={0.85}
                  style={[styles.shareBtn, { backgroundColor: c.gold }]}
                >
                  {capturing
                    ? <ActivityIndicator color="#0e1a2b" size="small" />
                    : (
                      <View style={{ flexDirection: isRTL ? "row-reverse" : "row",
                                     alignItems: "center", gap: 8 }}>
                        <Feather name="share-2" size={16} color="#0e1a2b" />
                        <Text style={[
                          styles.shareBtnText,
                          isRTL && { fontFamily: "Amiri_700Bold", fontSize: 17 },
                        ]}>
                          {t.share.shareImage}
                        </Text>
                      </View>
                    )
                  }
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  eyebrowEn: { fontSize: 10, fontWeight: "600", textTransform: "uppercase",
               letterSpacing: 1.4, marginBottom: 6 },
  eyebrowAr: { fontFamily: "Amiri_400Regular", fontSize: 13, writingDirection: "rtl",
               textAlign: "right", marginBottom: 6 },
  titleEn:   { fontFamily: "Georgia", fontSize: 28, letterSpacing: -0.5 },
  titleAr:   { fontFamily: "Amiri_700Bold", fontSize: 30, lineHeight: 46,
               writingDirection: "rtl", textAlign: "right" },

  // Section label
  sectionLabelEn: { fontSize: 10, fontWeight: "600", textTransform: "uppercase",
                    letterSpacing: 1.2 },
  sectionLabelAr: { fontFamily: "Amiri_400Regular", fontSize: 13,
                    writingDirection: "rtl" },

  // Hadith of the Day card
  hadithCard: { borderRadius: 16, borderWidth: 0.5, padding: 18, gap: 12 },
  sourcePill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4,
               borderRadius: 99, borderWidth: 0.5 },
  sourcePillText: { fontSize: 11, fontWeight: "600" },
  hadithAr: { fontFamily: "Amiri_400Regular", fontSize: 19, textAlign: "right",
              writingDirection: "rtl", lineHeight: 34 },
  hadithEn: { fontFamily: "Georgia", fontStyle: "italic", fontSize: 14, lineHeight: 24 },
  prophetText: { fontSize: 11 },
  divider: { height: 0.5 },
  actions: { alignItems: "center", gap: 10 },
  balleghBtn: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 18,
               paddingVertical: 10, borderRadius: 99 },
  balleghText: { fontFamily: "Georgia", fontSize: 14, fontWeight: "400" },
  iconBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 0.5,
             alignItems: "center", justifyContent: "center" },

  // Sunnah of the Week card
  weekCard: { borderRadius: 18, padding: 20, gap: 8 },
  weekEyebrowRow: { alignItems: "center", gap: 8 },
  weekEyebrowEn: { fontSize: 10, fontWeight: "600", textTransform: "uppercase",
                   letterSpacing: 1.2 },
  weekEyebrowAr: { fontFamily: "Amiri_400Regular", fontSize: 13,
                   writingDirection: "rtl" },
  unlockedPill: { width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.12)",
                  alignItems: "center", justifyContent: "center" },
  weekNameAr: { fontFamily: "Amiri_700Bold", fontSize: 28, textAlign: "center",
               writingDirection: "rtl", lineHeight: 42 },
  weekNameEn: { fontFamily: "Georgia", fontSize: 16, textAlign: "center" },
  weekHadith: { fontFamily: "Georgia", fontStyle: "italic", fontSize: 13, lineHeight: 20,
               textAlign: "center" },
  weekShareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center",
                  gap: 7, borderWidth: 0.5, borderRadius: 12, paddingVertical: 10,
                  marginTop: 4 },
  weekShareText: { fontFamily: "Georgia", fontSize: 13 },

  // Collections grid — two explicit rows so cards are flush with cards above
  gridRow:  { gap: 12 },
  collCard: { flex: 1, borderRadius: 14, borderWidth: 0.5, padding: 16, gap: 6 },
  collIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center",
                  justifyContent: "center", marginBottom: 4 },
  collTitle: { fontFamily: "Georgia", fontSize: 15 },
  collSub:   { fontSize: 11, lineHeight: 16 },

  // Share modal
  shareOverlay: { flex: 1 },
  shareSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20,
               paddingTop: 16, maxHeight: "90%" },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  shareHeaderRow: { justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  shareTitle: { fontFamily: "Georgia", fontSize: 17 },
  messageInput: { width: "100%", minHeight: 44, maxHeight: 80, borderRadius: 12,
                  borderWidth: 0.5, paddingHorizontal: 14, paddingVertical: 10,
                  fontSize: 14, lineHeight: 20, marginBottom: 12 },
  cardWrap: { borderRadius: 4, overflow: "hidden", shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18,
              shadowRadius: 8, elevation: 5 },
  shareActions: { paddingTop: 16, borderTopWidth: 0.5, marginTop: 4 },
  shareBtn: { borderRadius: 14, paddingVertical: 15, alignItems: "center",
              justifyContent: "center", minHeight: 52 },
  shareBtnText: { fontFamily: "Georgia", fontSize: 16, color: "#0e1a2b" },
});
