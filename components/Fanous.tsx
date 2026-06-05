/**
 * Fanous — Ballegho's mascot lantern (فانوس)
 *
 * Moods:
 *   "idle"      — soft warm glow, neutral flame
 *   "happy"     — bright glow, tall dancing flame, sparkles
 *   "sleeping"  — dim, flame nearly out, Zzz
 *   "empty"     — no flame, unlit lantern
 *   "streak"    — blazing gold glow, large flame
 *
 * Usage:
 *   <Fanous mood="happy" size={120} />
 */

import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

export type FanousMood = "idle" | "happy" | "sleeping" | "empty" | "streak";

interface Props {
  mood?: FanousMood;
  size?: number;
  isDark?: boolean;
}

export function Fanous({ mood = "idle", size = 120, isDark = true }: Props) {
  const s = size / 120; // scale factor

  // Palette
  const gold       = "#c9971e";
  const goldLight  = "#f2d064";
  const goldDeep   = "#8a6417";
  const frame      = isDark ? "#1a2e48" : "#2a3f58";
  const glass      = isDark ? "#0f1d2e" : "#1a2e40";

  // Mood-based flame & glow settings
  const cfg: Record<FanousMood, {
    glowR: number; glowOpacity: number;
    flameH: number; flameColor: string; flameOpacity: number;
    outerGlow: string; outerGlowOpacity: number;
  }> = {
    idle:     { glowR: 18, glowOpacity: 0.35, flameH: 14, flameColor: "#f5a623", flameOpacity: 0.9,  outerGlow: gold,      outerGlowOpacity: 0.12 },
    happy:    { glowR: 22, glowOpacity: 0.55, flameH: 19, flameColor: "#ffcc44", flameOpacity: 1.0,  outerGlow: goldLight, outerGlowOpacity: 0.22 },
    sleeping: { glowR: 10, glowOpacity: 0.18, flameH: 7,  flameColor: "#c47f10", flameOpacity: 0.5,  outerGlow: gold,      outerGlowOpacity: 0.05 },
    empty:    { glowR: 0,  glowOpacity: 0,    flameH: 0,  flameColor: "none",    flameOpacity: 0,    outerGlow: "none",    outerGlowOpacity: 0    },
    streak:   { glowR: 26, glowOpacity: 0.7,  flameH: 24, flameColor: "#ffe066", flameOpacity: 1.0,  outerGlow: goldLight, outerGlowOpacity: 0.30 },
  };
  const c = cfg[mood];

  const W = size;
  const H = size * 1.35;
  const cx = W / 2;
  const cy = H * 0.52;

  // Lantern body dimensions (scaled)
  const bw = 44 * s;   // body half-width
  const bh = 54 * s;   // body half-height
  const cr = 6 * s;    // corner radius

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        {/* Outer ambient glow */}
        <RadialGradient id="outerGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%"   stopColor={c.outerGlow} stopOpacity={c.outerGlowOpacity} />
          <Stop offset="100%" stopColor={c.outerGlow} stopOpacity={0} />
        </RadialGradient>

        {/* Inner flame glow */}
        <RadialGradient id="flameGlow" cx="50%" cy="70%" r="50%">
          <Stop offset="0%"   stopColor={c.flameColor} stopOpacity={c.glowOpacity} />
          <Stop offset="100%" stopColor={c.flameColor} stopOpacity={0} />
        </RadialGradient>

        {/* Glass panel gradient */}
        <RadialGradient id="glassFill" cx="50%" cy="40%" r="60%">
          <Stop offset="0%"   stopColor={c.flameColor} stopOpacity={mood === "empty" ? 0 : 0.13} />
          <Stop offset="100%" stopColor={glass}        stopOpacity={1} />
        </RadialGradient>
      </Defs>

      {/* ── Outer ambient glow ─────────────────────── */}
      <Ellipse
        cx={cx} cy={cy}
        rx={54 * s} ry={54 * s}
        fill="url(#outerGlow)"
      />

      {/* ── Hanging chain / hook ────────────────────── */}
      {/* Chain links */}
      {[0, 1, 2].map((i) => (
        <Ellipse
          key={i}
          cx={cx}
          cy={(cy - bh - 14 * s) + i * 7 * s}
          rx={3 * s}
          ry={2.5 * s}
          fill="none"
          stroke={goldDeep}
          strokeWidth={1.2 * s}
        />
      ))}
      {/* Top ring */}
      <Ellipse
        cx={cx} cy={cy - bh - 26 * s}
        rx={5 * s} ry={3.5 * s}
        fill="none"
        stroke={gold}
        strokeWidth={1.8 * s}
      />

      {/* ── Top cap ─────────────────────────────────── */}
      <Path
        d={`
          M ${cx - 18 * s} ${cy - bh}
          Q ${cx - 14 * s} ${cy - bh - 10 * s} ${cx} ${cy - bh - 12 * s}
          Q ${cx + 14 * s} ${cy - bh - 10 * s} ${cx + 18 * s} ${cy - bh}
          Z
        `}
        fill={gold}
        opacity={0.95}
      />
      {/* Top cap ridge lines */}
      {[-10, -5, 0, 5, 10].map((x) => (
        <Line
          key={x}
          x1={cx + x * s} y1={cy - bh - 1 * s}
          x2={cx + x * s} y2={cy - bh - 10 * s}
          stroke={goldDeep}
          strokeWidth={0.6 * s}
          opacity={0.6}
        />
      ))}

      {/* ── Body frame ──────────────────────────────── */}
      {/* Frame outline */}
      <Rect
        x={cx - bw} y={cy - bh}
        width={bw * 2} height={bh * 2}
        rx={cr} ry={cr}
        fill={frame}
        stroke={gold}
        strokeWidth={2 * s}
      />

      {/* Glass fill (inner glow when lit) */}
      <Rect
        x={cx - bw + 4 * s} y={cy - bh + 4 * s}
        width={(bw - 4 * s) * 2} height={(bh - 4 * s) * 2}
        rx={cr - 2 * s} ry={cr - 2 * s}
        fill="url(#glassFill)"
      />

      {/* Vertical frame bars */}
      {[-bw, -bw / 2, 0, bw / 2, bw].map((x, i) => (
        <Line
          key={i}
          x1={cx + x} y1={cy - bh}
          x2={cx + x} y2={cy + bh}
          stroke={gold}
          strokeWidth={i === 0 || i === 4 ? 2 * s : 0.8 * s}
          opacity={i === 0 || i === 4 ? 1 : 0.45}
        />
      ))}

      {/* Horizontal frame bars */}
      {[-bh * 0.5, 0, bh * 0.5].map((y, i) => (
        <Line
          key={i}
          x1={cx - bw} y1={cy + y}
          x2={cx + bw} y2={cy + y}
          stroke={gold}
          strokeWidth={0.8 * s}
          opacity={0.45}
        />
      ))}

      {/* Islamic arch cutout in each panel — top arch */}
      {[-bw * 0.75, -bw * 0.25, bw * 0.25, bw * 0.75].map((x, i) => (
        <Path
          key={i}
          d={`
            M ${cx + x - 8 * s} ${cy - bh * 0.35}
            Q ${cx + x} ${cy - bh * 0.6} ${cx + x + 8 * s} ${cy - bh * 0.35}
          `}
          fill="none"
          stroke={goldDeep}
          strokeWidth={0.8 * s}
          opacity={0.5}
        />
      ))}

      {/* ── Flame ───────────────────────────────────── */}
      {mood !== "empty" && c.flameH > 0 && (
        <G opacity={c.flameOpacity}>
          {/* Inner flame glow */}
          <Ellipse
            cx={cx} cy={cy + 6 * s}
            rx={c.glowR * s} ry={c.glowR * s}
            fill="url(#flameGlow)"
          />
          {/* Flame shape */}
          <Path
            d={`
              M ${cx} ${cy + 10 * s}
              C ${cx - 7 * s} ${cy + 2 * s} ${cx - 5 * s} ${cy - c.flameH * s * 0.4}
                ${cx} ${cy - c.flameH * s}
              C ${cx + 5 * s} ${cy - c.flameH * s * 0.4} ${cx + 7 * s} ${cy + 2 * s}
                ${cx} ${cy + 10 * s}
              Z
            `}
            fill={c.flameColor}
            opacity={0.95}
          />
          {/* Inner flame highlight */}
          <Path
            d={`
              M ${cx} ${cy + 6 * s}
              C ${cx - 3 * s} ${cy + 1 * s} ${cx - 2 * s} ${cy - c.flameH * s * 0.3}
                ${cx} ${cy - c.flameH * s * 0.55}
              C ${cx + 2 * s} ${cy - c.flameH * s * 0.3} ${cx + 3 * s} ${cy + 1 * s}
                ${cx} ${cy + 6 * s}
              Z
            `}
            fill={goldLight}
            opacity={0.7}
          />
        </G>
      )}

      {/* ── Bottom cap ──────────────────────────────── */}
      <Path
        d={`
          M ${cx - 18 * s} ${cy + bh}
          Q ${cx - 14 * s} ${cy + bh + 10 * s} ${cx} ${cy + bh + 12 * s}
          Q ${cx + 14 * s} ${cy + bh + 10 * s} ${cx + 18 * s} ${cy + bh}
          Z
        `}
        fill={gold}
        opacity={0.9}
      />
      {/* Bottom tassel dot */}
      <Circle
        cx={cx} cy={cy + bh + 17 * s}
        r={3.5 * s}
        fill={goldDeep}
      />

      {/* ── Mood overlays ────────────────────────────── */}

      {/* HAPPY — sparkles */}
      {mood === "happy" && (
        <G fill={goldLight} opacity={0.9}>
          {/* top-right sparkle */}
          <Path d={`M ${cx + 36 * s} ${cy - 28 * s} l ${3*s} ${-3*s} l ${3*s} ${3*s} l ${-3*s} ${3*s} Z`} />
          {/* top-left sparkle */}
          <Path d={`M ${cx - 36 * s} ${cy - 22 * s} l ${2.5*s} ${-2.5*s} l ${2.5*s} ${2.5*s} l ${-2.5*s} ${2.5*s} Z`} />
          {/* right sparkle */}
          <Path d={`M ${cx + 42 * s} ${cy + 8 * s} l ${2*s} ${-2*s} l ${2*s} ${2*s} l ${-2*s} ${2*s} Z`} />
          {/* small dots */}
          <Circle cx={cx + 28 * s} cy={cy - 38 * s} r={1.8 * s} />
          <Circle cx={cx - 30 * s} cy={cy + 20 * s} r={1.4 * s} />
        </G>
      )}

      {/* STREAK — extra outer ring */}
      {mood === "streak" && (
        <Ellipse
          cx={cx} cy={cy}
          rx={52 * s} ry={52 * s}
          fill="none"
          stroke={goldLight}
          strokeWidth={1 * s}
          opacity={0.25}
          strokeDasharray={`${4 * s} ${6 * s}`}
        />
      )}

      {/* SLEEPING — Zzz */}
      {mood === "sleeping" && (
        <G fill={goldDeep} opacity={0.6}>
          <SvgText
            x={cx + 34 * s} y={cy - 22 * s}
            fontSize={10 * s} fontWeight="700"
          >z</SvgText>
          <SvgText
            x={cx + 40 * s} y={cy - 32 * s}
            fontSize={13 * s} fontWeight="700"
          >z</SvgText>
          <SvgText
            x={cx + 47 * s} y={cy - 44 * s}
            fontSize={16 * s} fontWeight="700"
          >Z</SvgText>
        </G>
      )}

      {/* EMPTY — subtle X on frame */}
      {mood === "empty" && (
        <G stroke={goldDeep} strokeWidth={1.5 * s} opacity={0.4}>
          <Line x1={cx - 8 * s} y1={cy - 8 * s} x2={cx + 8 * s} y2={cy + 8 * s} />
          <Line x1={cx + 8 * s} y1={cy - 8 * s} x2={cx - 8 * s} y2={cy + 8 * s} />
        </G>
      )}

    </Svg>
  );
}
