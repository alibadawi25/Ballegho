/**
 * Galabeya — Ballegho's mascot (a serene worshipper in a galabeya & kufi).
 *
 * A stylised, all-gold figure that fits the "Night & Gold" theme. Rendered as
 * SVG and brought to life with the built-in RN Animated API (no extra babel
 * config required, works on native + web).
 *
 * Moods:
 *   "idle"      — relaxed, slow float & breathe, faint aura  (default / greeting)
 *   "happy"     — arms up, joyful bounce, sparkle burst, brighter aura
 *   "streak"    — proud stance, intense pulsing aura, orbiting sparkles
 *   "sleeping"  — head tilt, slow breathe, drifting "Zzz", dim aura
 *
 * Usage:
 *   <Galabeya mood="happy" size={140} />
 */

import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, View, type ViewStyle } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

export type GalabeyaMood = "idle" | "happy" | "streak" | "sleeping";

interface Props {
  mood?: GalabeyaMood;
  size?: number;
  /** Disable motion (e.g. for snapshots / reduce-motion). Default: true. */
  animate?: boolean;
  style?: ViewStyle;
}

// ── Palette ──────────────────────────────────────────────────────────────────
const GOLD = "#c9971e";
const GOLD_LIGHT = "#f2d064";
const GOLD_MID = "#a87d1f";
const GOLD_DEEP = "#7a5912";

// viewBox is a fixed 120 × 172; the SVG scales to `size` via width/height.
const VB_W = 120;
const VB_H = 172;
const CX = 60;

// ── Per-mood configuration ─────────────────────────────────────────────────────
interface MoodCfg {
  floatAmp: number; // px the body drifts up/down
  scaleAmp: number; // breathe scale delta
  swayDeg: number; // rotation sway in degrees
  motionDur: number; // float/breathe loop duration (ms)
  swayDur: number; // sway loop duration (ms)
  haloBase: number; // base aura opacity
  haloAmp: number; // aura pulse amplitude
  bounce: boolean; // use a hop easing for the float
  rays: boolean; // light rays above the hands
  sparkles: boolean; // twinkling sparkles
  zzz: boolean; // drifting sleep glyphs
  arms: "happy" | "relaxed";
  eyes: "calm" | "happy" | "closed";
  smile: "soft" | "wide" | "rest";
  headTilt: number; // degrees, for sleeping
}

const CONFIG: Record<GalabeyaMood, MoodCfg> = {
  idle: {
    floatAmp: 3, scaleAmp: 0.015, swayDeg: 1.0, motionDur: 2600, swayDur: 4200,
    haloBase: 0.10, haloAmp: 0.05, bounce: false, rays: false, sparkles: false,
    zzz: false, arms: "relaxed", eyes: "calm", smile: "soft", headTilt: 0,
  },
  happy: {
    floatAmp: 7, scaleAmp: 0.035, swayDeg: 2.0, motionDur: 900, swayDur: 1500,
    haloBase: 0.20, haloAmp: 0.10, bounce: true, rays: true, sparkles: true,
    zzz: false, arms: "happy", eyes: "happy", smile: "wide", headTilt: 0,
  },
  streak: {
    floatAmp: 5, scaleAmp: 0.03, swayDeg: 1.6, motionDur: 2200, swayDur: 3200,
    haloBase: 0.24, haloAmp: 0.14, bounce: false, rays: true, sparkles: true,
    zzz: false, arms: "happy", eyes: "happy", smile: "soft", headTilt: 0,
  },
  sleeping: {
    floatAmp: 2, scaleAmp: 0.028, swayDeg: 0.6, motionDur: 3800, swayDur: 6000,
    haloBase: 0.06, haloAmp: 0.03, bounce: false, rays: false, sparkles: false,
    zzz: true, arms: "relaxed", eyes: "closed", smile: "rest", headTilt: 6,
  },
};

// ── Geometry helpers ───────────────────────────────────────────────────────────
function hand(x: number, y: number, open: boolean) {
  // Palm + a couple of finger hints. `open` palms read as supplication.
  return (
    <G>
      <Circle cx={x} cy={y} r={5} fill={GOLD_MID} />
      {open && (
        <G stroke={GOLD_DEEP} strokeWidth={1} strokeLinecap="round" opacity={0.55}>
          <Line x1={x - 2.5} y1={y - 1} x2={x - 3.5} y2={y - 5} />
          <Line x1={x} y1={y - 2} x2={x} y2={y - 6} />
          <Line x1={x + 2.5} y1={y - 1} x2={x + 3.5} y2={y - 5} />
        </G>
      )}
    </G>
  );
}

function eyePath(ex: number, ey: number, kind: MoodCfg["eyes"]) {
  if (kind === "happy") return `M ${ex - 3.5} ${ey + 0.8} Q ${ex} ${ey - 2.5} ${ex + 3.5} ${ey + 0.8}`;
  if (kind === "closed") return `M ${ex - 3.5} ${ey} L ${ex + 3.5} ${ey}`;
  // calm — serene, eyes gently lowered
  return `M ${ex - 3.5} ${ey} Q ${ex} ${ey + 2} ${ex + 3.5} ${ey}`;
}

function smilePath(kind: MoodCfg["smile"]) {
  if (kind === "wide") return "M 53 60 Q 60 67 67 60";
  if (kind === "rest") return "M 56 62 Q 60 63.5 64 62";
  return "M 55 61 Q 60 64 65 61"; // soft
}

export function Galabeya({ mood = "idle", size = 140, animate = true, style }: Props) {
  // Fall back to `idle` for any unknown mood so a bad prop can't crash the tree.
  const cfg = CONFIG[mood] ?? CONFIG.idle;

  // One value per concern. Native driver for transforms, JS driver for SVG props.
  const motion = useRef(new Animated.Value(0)).current; // float + breathe (native)
  const sway = useRef(new Animated.Value(0)).current; // rotation (native)
  const pulse = useRef(new Animated.Value(0)).current; // aura opacity (svg)
  const twinkle = useRef(new Animated.Value(0)).current; // sparkles (svg)
  const zzz = useRef(new Animated.Value(0)).current; // sleep glyphs (svg)

  useEffect(() => {
    const loop = (
      val: Animated.Value,
      duration: number,
      native: boolean,
      easing = Easing.inOut(Easing.sin),
    ) =>
      Animated.loop(
        Animated.timing(val, {
          toValue: 1,
          duration,
          easing,
          useNativeDriver: native,
        }),
      );

    if (!animate) {
      motion.setValue(0.5);
      sway.setValue(0.5);
      pulse.setValue(0.5);
      twinkle.setValue(0.5);
      zzz.setValue(0);
      return;
    }

    const anims: Animated.CompositeAnimation[] = [
      loop(motion, cfg.motionDur, true, cfg.bounce ? Easing.inOut(Easing.quad) : Easing.inOut(Easing.sin)),
      loop(sway, cfg.swayDur, true),
      loop(pulse, 2000, false),
    ];
    if (cfg.sparkles) anims.push(loop(twinkle, 1400, false, Easing.inOut(Easing.quad)));
    if (cfg.zzz) anims.push(loop(zzz, 2600, false, Easing.out(Easing.quad)));

    anims.forEach((a) => a.start());
    return () => {
      motion.stopAnimation();
      sway.stopAnimation();
      pulse.stopAnimation();
      twinkle.stopAnimation();
      zzz.stopAnimation();
    };
  }, [mood, animate, cfg, motion, sway, pulse, twinkle, zzz]);

  // ── Derived animated styles / props ──────────────────────────────────────────
  const translateY = motion.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -cfg.floatAmp, 0],
  });
  const scale = motion.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1 + cfg.scaleAmp, 1],
  });
  const rotate = sway.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [`-${cfg.swayDeg}deg`, `${cfg.swayDeg}deg`, `-${cfg.swayDeg}deg`],
  });

  const haloOpacity = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [cfg.haloBase, cfg.haloBase + cfg.haloAmp, cfg.haloBase],
  });
  const haloScale = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.97, 1.04, 0.97],
  });

  const sparkleOpacity = twinkle.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.25, 1, 0.25],
  });
  const sparkleScale = twinkle.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 1.15, 0.7],
  });
  const sparkleRotate = twinkle.interpolate({
    inputRange: [0, 1],
    outputRange: [0, mood === "streak" ? 40 : 18],
  });

  const zzzY = zzz.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  const zzzOpacity = zzz.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  const W = size;
  const H = (size * VB_H) / VB_W;

  // Eyes shift slightly under the head tilt so the face stays centred.
  const headGroup = useMemo(
    () => ({ originX: CX, originY: 48, rotation: cfg.headTilt }),
    [cfg.headTilt],
  );

  return (
    <View style={[{ width: W, height: H }, style]}>
      <Animated.View
        style={{
          width: W,
          height: H,
          transform: [{ translateY }, { scale }, { rotate }],
        }}
      >
        <Svg width={W} height={H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          <Defs>
            <RadialGradient id="g-aura" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={GOLD_LIGHT} stopOpacity={1} />
              <Stop offset="55%" stopColor={GOLD} stopOpacity={0.55} />
              <Stop offset="100%" stopColor={GOLD} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="g-robe" cx="50%" cy="22%" r="85%">
              <Stop offset="0%" stopColor={GOLD_LIGHT} stopOpacity={0.9} />
              <Stop offset="60%" stopColor={GOLD} stopOpacity={1} />
              <Stop offset="100%" stopColor={GOLD_MID} stopOpacity={1} />
            </RadialGradient>
            <RadialGradient id="g-head" cx="42%" cy="35%" r="75%">
              <Stop offset="0%" stopColor={GOLD_LIGHT} stopOpacity={1} />
              <Stop offset="100%" stopColor={GOLD} stopOpacity={1} />
            </RadialGradient>
          </Defs>

          {/* ── Aura ──────────────────────────────────────────── */}
          <AnimatedG
            opacity={haloOpacity}
            scale={haloScale as unknown as number}
            originX={CX}
            originY={92}
          >
            <Ellipse cx={CX} cy={92} rx={56} ry={60} fill="url(#g-aura)" />
          </AnimatedG>

          {/* ── Light rays (dua / happy / streak) ─────────────── */}
          {cfg.rays && (
            <G stroke={GOLD_LIGHT} strokeWidth={1.4} strokeLinecap="round" opacity={0.5}>
              <Line x1={22} y1={34} x2={18} y2={22} />
              <Line x1={30} y1={30} x2={28} y2={18} />
              <Line x1={98} y1={34} x2={102} y2={22} />
              <Line x1={90} y1={30} x2={92} y2={18} />
            </G>
          )}

          {/* Arms render AFTER the robe (below) so raised arms layer
              cleanly over the shoulders. */}

          {/* ── Robe (galabeya) ───────────────────────────────── */}
          <Path
            d="M44 78 Q38 96 32 150 Q46 157 60 158 Q74 157 88 150 Q82 96 76 78 Q69 73 60 72 Q51 73 44 78 Z"
            fill="url(#g-robe)"
          />
          {/* Collar */}
          <Path d="M53 76 L60 86 L67 76" fill="none" stroke={GOLD_DEEP} strokeWidth={1.4} opacity={0.6} />
          {/* Fold lines */}
          <Path d="M52 92 Q51 122 50 150" stroke={GOLD_DEEP} strokeWidth={1} opacity={0.28} fill="none" />
          <Path d="M68 92 Q69 122 70 150" stroke={GOLD_DEEP} strokeWidth={1} opacity={0.28} fill="none" />
          {/* Hem highlight */}
          <Path d="M32 150 Q46 157 60 158 Q74 157 88 150" stroke={GOLD_LIGHT} strokeWidth={1.2} opacity={0.4} fill="none" />

          {/* ── Arms (in front of robe) ───────────────────────── */}
          {cfg.arms === "relaxed" && (
            <G>
              <Path d="M44 80 Q39 100 38 120 Q42 122 46 120 Q48 100 49 82 Z" fill={GOLD_MID} />
              <Path d="M76 80 Q81 100 82 120 Q78 122 74 120 Q72 100 71 82 Z" fill={GOLD_MID} />
              {hand(40, 122, false)}
              {hand(80, 122, false)}
            </G>
          )}
          {cfg.arms === "happy" && (
            <G>
              <Path d="M44 80 Q22 66 16 36 Q22 32 28 36 Q35 58 49 80 Z" fill={GOLD_MID} />
              <Path d="M76 80 Q98 66 104 36 Q98 32 92 36 Q85 58 71 80 Z" fill={GOLD_MID} />
              {hand(18, 33, true)}
              {hand(102, 33, true)}
            </G>
          )}
          {/* ── Head + face ───────────────────────────────────── */}
          <AnimatedG originX={headGroup.originX} originY={headGroup.originY} rotation={headGroup.rotation}>
            {/* Beard (under jaw) */}
            <Path
              d="M47 54 Q49 70 60 72 Q71 70 73 54 Q67 64 60 64 Q53 64 47 54 Z"
              fill={GOLD_DEEP}
              opacity={0.5}
            />
            {/* Head */}
            <Circle cx={CX} cy={48} r={17} fill="url(#g-head)" />
            {/* Kufi / taqiyah cap — small, sits on the crown */}
            <Path d="M46 44 Q46 31 60 30 Q74 31 74 44 Z" fill={GOLD_DEEP} />
            <Path d="M46 44 Q60 40 74 44" stroke={GOLD_LIGHT} strokeWidth={1.2} opacity={0.4} fill="none" />
            {/* Eyes */}
            <Path d={eyePath(54, 50, cfg.eyes)} stroke={GOLD_DEEP} strokeWidth={1.5} strokeLinecap="round" fill="none" />
            <Path d={eyePath(66, 50, cfg.eyes)} stroke={GOLD_DEEP} strokeWidth={1.5} strokeLinecap="round" fill="none" />
            {/* Smile */}
            <Path d={smilePath(cfg.smile)} stroke={GOLD_DEEP} strokeWidth={1.5} strokeLinecap="round" fill="none" />
          </AnimatedG>

          {/* ── Sparkles (happy / streak) ─────────────────────── */}
          {cfg.sparkles && (
            <AnimatedG opacity={sparkleOpacity} scale={sparkleScale as unknown as number} originX={CX} originY={70}>
              <G fill={GOLD_LIGHT}>
                <Path d={`M ${CX + 38} 34 l 3 -3 l 3 3 l -3 3 Z`} />
                <Path d={`M ${CX - 40} 40 l 2.5 -2.5 l 2.5 2.5 l -2.5 2.5 Z`} />
                <Path d={`M ${CX + 44} 70 l 2 -2 l 2 2 l -2 2 Z`} />
                <Circle cx={CX - 34} cy={28} r={1.8} />
                <Circle cx={CX + 30} cy={96} r={1.6} />
                <Circle cx={CX - 30} cy={92} r={1.4} />
              </G>
            </AnimatedG>
          )}
        </Svg>
      </Animated.View>

      {/* ── Sleep glyphs (Zzz) — overlaid, drifts independently ── */}
      {cfg.zzz && (
        <Svg
          width={W}
          height={H}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          style={{ position: "absolute", left: 0, top: 0 }}
        >
          <AnimatedG opacity={zzzOpacity} y={zzzY as unknown as number}>
            <SvgText x={82} y={38} fontSize={9} fontWeight="700" fill={GOLD}>z</SvgText>
            <SvgText x={88} y={28} fontSize={12} fontWeight="700" fill={GOLD}>z</SvgText>
            <SvgText x={96} y={16} fontSize={16} fontWeight="700" fill={GOLD_LIGHT}>Z</SvgText>
          </AnimatedG>
        </Svg>
      )}
    </View>
  );
}
