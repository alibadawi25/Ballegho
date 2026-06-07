/**
 * AdaptiveCoachCard — renders the personalization coach's recommendation on the
 * Today screen. One of three variants (or nothing):
 *
 *   unlock  — pick one new sunnah from a short list
 *   reduce  — choose which struggling sunnahs to pause (anchor is never offered)
 *   recover — one tap to restart gently on the anchor
 *
 * Tone is always encouraging — scaling down is framed as protecting the streak,
 * never as "doing less". Copy lives in i18n (t.coach).
 */

import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { CoachRecommendation, CoachCandidate } from "@/hooks/useAdaptiveCoach";

interface CoachColors {
  surface: string; ink: string; inkMuted: string; inkFaint: string;
  gold: string; divider: string;
}

export interface CoachStrings {
  unlockEyebrow: string;  unlockTitle: string;  unlockBody: string;
  reduceEyebrow: string;  reduceTitle: string;  reduceBody: string;  reduceCta: string;
  recoverEyebrow: string; recoverTitle: string; recoverBody: string; recoverCta: string;
}

const INK = "#0e1a2b";

export default function AdaptiveCoachCard({
  rec, c, t, isRTL, busy, onPick, onReduce, onRecover, onDismiss,
}: {
  rec: CoachRecommendation | null;
  c: CoachColors;
  t: CoachStrings;
  isRTL: boolean;
  busy: boolean;
  onPick: (sunnahId: string) => void;
  onReduce: (sunnahIds: string[]) => void;
  onRecover: () => void;
  onDismiss: () => void;
}) {
  if (!rec || rec.kind === "none") return null;

  const eyebrow =
    rec.kind === "unlock" ? t.unlockEyebrow : rec.kind === "reduce" ? t.reduceEyebrow : t.recoverEyebrow;
  const title =
    rec.kind === "unlock" ? t.unlockTitle : rec.kind === "reduce" ? t.reduceTitle : t.recoverTitle;
  const body =
    rec.kind === "unlock" ? t.unlockBody : rec.kind === "reduce" ? t.reduceBody : t.recoverBody;
  const icon = rec.kind === "unlock" ? "gift" : rec.kind === "reduce" ? "feather" : "sunrise";

  const name = (it: CoachCandidate) => (isRTL ? it.name_ar : it.name_en);

  return (
    <View style={{
      marginHorizontal: 22, marginBottom: 16,
      borderRadius: 16, borderWidth: 0.5,
      borderColor: c.gold + "60", backgroundColor: c.gold + "12",
      padding: 16, gap: 10,
    }}>
      {/* Eyebrow + dismiss */}
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
          <Feather name={icon as any} size={15} color={c.gold} />
          <Text style={{
            fontSize: 10, fontWeight: "600", color: c.gold,
            ...(isRTL ? {} : { letterSpacing: 1.2, textTransform: "uppercase" as const }),
          }}>
            {eyebrow}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={16} color={c.inkFaint} />
        </TouchableOpacity>
      </View>

      {/* Title */}
      <Text style={{
        color: c.ink,
        ...(isRTL
          ? { fontFamily: "Amiri_700Bold", fontSize: 19, writingDirection: "rtl", textAlign: "right" }
          : { fontFamily: "Georgia", fontSize: 17 }),
      }}>
        {title}
      </Text>

      {/* Body */}
      <Text style={{
        fontSize: 12, color: c.inkMuted, lineHeight: 18,
        textAlign: isRTL ? "right" : "left",
        ...(isRTL ? { fontFamily: "Amiri_400Regular", fontSize: 14, lineHeight: 24, writingDirection: "rtl" } : {}),
      }}>
        {body}
      </Text>

      {busy ? (
        <ActivityIndicator color={c.gold} style={{ marginTop: 4 }} />
      ) : rec.kind === "unlock" ? (
        <UnlockList candidates={rec.candidates ?? []} c={c} isRTL={isRTL} name={name} onPick={onPick} />
      ) : rec.kind === "reduce" ? (
        <ReduceList candidates={rec.candidates ?? []} c={c} isRTL={isRTL} name={name} cta={t.reduceCta} onReduce={onReduce} />
      ) : (
        <PrimaryButton label={t.recoverCta} c={c} isRTL={isRTL} onPress={onRecover} />
      )}
    </View>
  );
}

// ── Unlock: tap one to add ────────────────────────────────────────────────────
function UnlockList({ candidates, c, isRTL, name, onPick }: {
  candidates: CoachCandidate[]; c: CoachColors; isRTL: boolean;
  name: (it: CoachCandidate) => string; onPick: (id: string) => void;
}) {
  return (
    <View style={{ gap: 8, marginTop: 2 }}>
      {candidates.map((it) => (
        <TouchableOpacity
          key={it.id}
          onPress={() => onPick(it.id)}
          activeOpacity={0.85}
          style={{
            flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10,
            backgroundColor: c.surface, borderColor: c.divider, borderWidth: 0.5,
            borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
          }}
        >
          <Text style={{
            flex: 1, color: c.ink, textAlign: isRTL ? "right" : "left",
            ...(isRTL ? { fontFamily: "Amiri_700Bold", fontSize: 17, writingDirection: "rtl" } : { fontFamily: "Georgia", fontSize: 15 }),
          }}>
            {name(it)}
          </Text>
          <Feather name="plus-circle" size={20} color={c.gold} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Reduce: toggle which to pause, then confirm ──────────────────────────────
function ReduceList({ candidates, c, isRTL, name, cta, onReduce }: {
  candidates: CoachCandidate[]; c: CoachColors; isRTL: boolean;
  name: (it: CoachCandidate) => string; cta: string; onReduce: (ids: string[]) => void;
}) {
  // Default: all suggested sunnahs selected for pausing.
  const [selected, setSelected] = useState<Set<string>>(new Set(candidates.map((x) => x.id)));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <View style={{ gap: 8, marginTop: 2 }}>
      {candidates.map((it) => {
        const on = selected.has(it.id);
        return (
          <TouchableOpacity
            key={it.id}
            onPress={() => toggle(it.id)}
            activeOpacity={0.8}
            style={{
              flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10,
              backgroundColor: c.surface, borderWidth: 0.5,
              borderColor: on ? c.gold : c.divider,
              borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
            }}
          >
            <View style={{
              width: 20, height: 20, borderRadius: 6,
              alignItems: "center", justifyContent: "center",
              backgroundColor: on ? c.gold : "transparent",
              borderWidth: 1.5, borderColor: on ? c.gold : c.inkFaint,
            }}>
              {on && <Feather name="check" size={12} color={INK} />}
            </View>
            <Text style={{
              flex: 1, color: c.ink, textAlign: isRTL ? "right" : "left",
              ...(isRTL ? { fontFamily: "Amiri_400Regular", fontSize: 16, writingDirection: "rtl" } : { fontSize: 14 }),
            }}>
              {name(it)}
            </Text>
          </TouchableOpacity>
        );
      })}
      <PrimaryButton
        label={cta}
        c={c}
        isRTL={isRTL}
        disabled={selected.size === 0}
        onPress={() => onReduce([...selected])}
      />
    </View>
  );
}

// ── Shared primary button ─────────────────────────────────────────────────────
function PrimaryButton({ label, c, isRTL, onPress, disabled }: {
  label: string; c: CoachColors; isRTL: boolean; onPress: () => void; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={{
        marginTop: 4, backgroundColor: c.gold, borderRadius: 12,
        paddingVertical: 13, alignItems: "center", opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ fontSize: isRTL ? 16 : 14, color: INK, ...(isRTL ? { fontFamily: "Amiri_700Bold" } : { fontWeight: "600" }) }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
