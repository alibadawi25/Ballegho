/**
 * SunnahShareCard — the image that gets captured and shared.
 *
 * Four built-in themes (Night, Parchment, Emerald, Midnight). Caller passes a
 * `theme` string; the card re-renders immediately so the user sees the preview
 * update before capturing.
 *
 * White-line fix: the outer `wrapper` View carries the same backgroundColor as
 * the card and uses `overflow:"hidden"`. This prevents the capture library from
 * seeing a transparent gap at the bottom edge caused by sub-pixel rounding.
 *
 * Usage:
 *   <SunnahShareCard ref={cardRef} sunnah={…} theme="night" isRTL message="…" />
 *   const uri = await captureRef(cardRef, { format:"jpg", quality:0.95 });
 */

import { forwardRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Line, Polygon, Path } from "react-native-svg";

// ─── Shareable types ──────────────────────────────────────────────────────────

export interface ShareableSunnah {
  name_ar:        string;
  name_en:        string;
  hadith_text_ar: string | null;
  hadith_text_en: string | null;
  hadith_source:  string | null;
}

export type ShareTheme = "night" | "parchment" | "emerald" | "midnight";

interface Props {
  sunnah:   ShareableSunnah;
  message?: string;
  isRTL?:   boolean;
  theme?:   ShareTheme;
}

// ─── Theme palette ────────────────────────────────────────────────────────────

interface ThemeColors {
  bg:      string;
  surface: string;
  ink:     string;
  muted:   string;
  faint:   string;
  gold:    string;
  divider: string;
  pattern: string; // SVG pattern accent
}

const THEMES: Record<ShareTheme, ThemeColors> = {
  night: {
    bg:      "#0e1a2b",
    surface: "#122236",
    ink:     "#f4ecd8",
    muted:   "#8a8876",
    faint:   "#4a5362",
    gold:    "#d4af37",
    divider: "rgba(244,236,216,0.08)",
    pattern: "#d4af37",
  },
  parchment: {
    bg:      "#f5efe2",
    surface: "#ede4d0",
    ink:     "#0e1a2b",
    muted:   "#7a8193",
    faint:   "#b9bcc4",
    gold:    "#b8892a",
    divider: "rgba(14,26,43,0.08)",
    pattern: "#b8892a",
  },
  emerald: {
    bg:      "#0f2a1e",
    surface: "#163824",
    ink:     "#e8f4ed",
    muted:   "#7aaa8e",
    faint:   "#3d6b52",
    gold:    "#d4af37",
    divider: "rgba(232,244,237,0.08)",
    pattern: "#2d7a50",
  },
  midnight: {
    bg:      "#060f1b",
    surface: "#0a1422",
    ink:     "#f4ecd8",
    muted:   "#8a8876",
    faint:   "#4a5362",
    gold:    "#f2d064",
    divider: "rgba(244,236,216,0.06)",
    pattern: "#f2d064",
  },
};

// ─── Decorative background pattern ───────────────────────────────────────────

function GeomPattern({ color }: { color: string }) {
  // Concentric hexagon + circle, very faint — sits behind everything.
  return (
    <Svg
      width={280} height={280}
      viewBox="0 0 280 280"
      style={{ position: "absolute", top: -40, right: -40, opacity: 0.06 }}
    >
      {/* Outer hexagon */}
      <Path
        d="M140,20 L220,65 L220,155 L140,200 L60,155 L60,65 Z"
        stroke={color} strokeWidth={1.5} fill="none"
      />
      {/* Inner hexagon */}
      <Path
        d="M140,50 L196,82 L196,148 L140,180 L84,148 L84,82 Z"
        stroke={color} strokeWidth={1} fill="none"
      />
      {/* Outer circle */}
      <Circle cx={140} cy={110} r={72} stroke={color} strokeWidth={1} fill="none" />
      {/* Inner circle */}
      <Circle cx={140} cy={110} r={44} stroke={color} strokeWidth={0.8} fill="none" />
      {/* Centre diamond */}
      <Polygon points="140,88 155,110 140,132 125,110" stroke={color} strokeWidth={1} fill="none" />
    </Svg>
  );
}

// Bottom-left corner decoration
function CornerPattern({ color }: { color: string }) {
  return (
    <Svg
      width={80} height={80}
      viewBox="0 0 80 80"
      style={{ position: "absolute", bottom: 0, left: 0, opacity: 0.08 }}
    >
      <Circle cx={0} cy={80} r={60} stroke={color} strokeWidth={1} fill="none" />
      <Circle cx={0} cy={80} r={38} stroke={color} strokeWidth={0.8} fill="none" />
      <Circle cx={0} cy={80} r={18} stroke={color} strokeWidth={0.6} fill="none" />
    </Svg>
  );
}

// ─── Ornament divider ────────────────────────────────────────────────────────

function Ornament({ color }: { color: string }) {
  return (
    <Svg width={140} height={16} viewBox="0 0 140 16">
      <Line x1="0"   y1="8" x2="54"  y2="8" stroke={color} strokeWidth={0.8} opacity={0.5} />
      <Circle cx={63}  cy={8} r={3} fill={color} opacity={0.6} />
      <Polygon points="70,2 77,8 70,14 63,8" fill={color} opacity={0.9} />
      <Circle cx={77}  cy={8} r={3} fill={color} opacity={0.6} />
      <Line x1="86"  y1="8" x2="140" y2="8" stroke={color} strokeWidth={0.8} opacity={0.5} />
    </Svg>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────

const SunnahShareCard = forwardRef<View, Props>(
  ({ sunnah, message, isRTL = false, theme = "night" }, ref) => {
    const T = THEMES[theme];
    const hasHadith  = sunnah.hadith_text_ar || sunnah.hadith_text_en;
    const hasMessage = !!message?.trim();

    return (
      // Wrapper carries the same bg so there is never a transparent gap at
      // the capture boundary — this fixes the white-line-at-bottom issue.
      <View style={[styles.wrapper, { backgroundColor: T.bg }]} collapsable={false}>
        <View ref={ref} style={[styles.card, { backgroundColor: T.bg }]} collapsable={false}>

          {/* Decorative background — rendered before any content */}
          <GeomPattern  color={T.pattern} />
          <CornerPattern color={T.pattern} />

          {/* ── Branding ─────────────────────────────────── */}
          <View style={styles.header}>
            <Text style={[styles.logoAr, { color: T.gold }]}>بلّغوا</Text>
            <View style={[styles.headerDot, { backgroundColor: T.faint }]} />
            <Text style={[styles.logoEn, { color: T.muted }]}>Ballegho</Text>
          </View>

          {/* ── Name ─────────────────────────────────────── */}
          <View style={[styles.nameBlock, { borderBottomColor: T.divider }]}>
            <Text style={[styles.nameAr, { color: T.gold }]}>
              {sunnah.name_ar}
            </Text>
            <Text style={[styles.nameEn, { color: T.ink }]}>
              {sunnah.name_en}
            </Text>
          </View>

          {/* ── Ornament ─────────────────────────────────── */}
          <View style={styles.ornamentWrap}>
            <Ornament color={T.gold} />
          </View>

          {/* ── Hadith ───────────────────────────────────── */}
          {hasHadith && (
            <View style={styles.hadithBlock}>
              {sunnah.hadith_text_ar && (
                <Text style={[styles.hadithAr, { color: T.ink }]}>
                  «{sunnah.hadith_text_ar}»
                </Text>
              )}
              {sunnah.hadith_text_en && (
                <Text style={[styles.hadithEn, { color: T.muted }]}>
                  "{sunnah.hadith_text_en}"
                </Text>
              )}
              {sunnah.hadith_source && (
                <Text style={[styles.source, { color: T.faint }]}>
                  — {sunnah.hadith_source}
                </Text>
              )}
            </View>
          )}

          {/* ── Personal message ─────────────────────────── */}
          {hasMessage && (
            <View style={[
              styles.messageBlock,
              { borderLeftColor: T.gold, backgroundColor: T.gold + "12" },
              isRTL && { borderLeftWidth: 0, borderRightWidth: 3, borderRightColor: T.gold, flexDirection: "row-reverse" },
            ]}>
              <Text style={[
                styles.messageText,
                { color: T.muted },
                isRTL && { textAlign: "right", writingDirection: "rtl" },
              ]}>
                {message}
              </Text>
            </View>
          )}

          {/* ── Footer ───────────────────────────────────── */}
          <View style={[styles.footer, { borderTopColor: T.divider }]}>
            <Text style={[styles.footerText, { color: T.faint }]}>
              ballegho.app
            </Text>
          </View>

        </View>
      </View>
    );
  }
);

SunnahShareCard.displayName = "SunnahShareCard";
export default SunnahShareCard;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Outer wrapper — same bg colour, overflow hidden. Kills the white-line gap.
  wrapper: {
    borderRadius: 16,
    overflow: "hidden",
  },
  card: {
    width: 320,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 22,
    overflow: "hidden",
    position: "relative",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  logoAr:    { fontFamily: "Amiri_700Bold", fontSize: 15, writingDirection: "rtl" },
  headerDot: { width: 3, height: 3, borderRadius: 2 },
  logoEn:    { fontFamily: "Georgia", fontSize: 12 },

  // Name block
  nameBlock: {
    alignItems: "center",
    gap: 6,
    paddingBottom: 20,
    marginBottom: 4,
  },
  nameAr: {
    fontFamily: "Amiri_700Bold",
    fontSize: 30,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 46,
  },
  nameEn: {
    fontFamily: "Georgia",
    fontSize: 14,
    textAlign: "center",
    opacity: 0.8,
    letterSpacing: 0.2,
  },

  // Ornament
  ornamentWrap: { alignItems: "center", marginBottom: 18 },

  // Hadith
  hadithBlock: { gap: 10, marginBottom: 16 },
  hadithAr: {
    fontFamily: "Amiri_400Regular",
    fontSize: 16,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 28,
  },
  hadithEn: {
    fontFamily: "Georgia",
    fontStyle: "italic",
    fontSize: 12,
    lineHeight: 19,
  },
  source: { fontSize: 10, letterSpacing: 0.2 },

  // Message
  messageBlock: {
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginBottom: 14,
  },
  messageText: {
    fontFamily: "Georgia",
    fontStyle: "italic",
    fontSize: 12,
    lineHeight: 18,
  },

  // Footer
  footer: {
    borderTopWidth: 0.5,
    paddingTop: 12,
    alignItems: "center",
  },
  footerText: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
