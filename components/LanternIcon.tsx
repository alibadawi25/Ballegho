/**
 * LanternIcon — Ballegho's Nūr token: a compact filled lantern (Fanous)
 * silhouette with a lit window. Used wherever Nūr appears (header chip, reward
 * popup, tip, theme prices) so the symbol is consistent. Filled shapes read
 * cleanly down to ~10px (thin strokes don't).
 */

import Svg, { Path, Rect } from "react-native-svg";

export default function LanternIcon({
  size = 13,
  color = "#b8892a",
  glow = "#f2d064",
}: {
  size?: number;
  color?: string;
  glow?: string;
}) {
  return (
    <Svg width={size} height={(size * 16) / 12} viewBox="0 0 12 16">
      {/* handle */}
      <Path d="M4.3 2.4 Q6 0.6 7.7 2.4" stroke={color} strokeWidth={1} fill="none" strokeLinecap="round" />
      {/* top cap */}
      <Path d="M3.2 4 L8.8 4 L7.8 2.2 L4.2 2.2 Z" fill={color} />
      {/* body silhouette */}
      <Path d="M4 4 L8 4 Q9.2 4 9.2 5.6 L9.2 11.4 Q9.2 12.6 8 12.6 L4 12.6 Q2.8 12.6 2.8 11.4 L2.8 5.6 Q2.8 4 4 4 Z" fill={color} />
      {/* lit window */}
      <Rect x={4.7} y={5.8} width={2.6} height={5} rx={1.3} fill={glow} />
      {/* base */}
      <Path d="M3.4 12.6 L8.6 12.6 L8 14 L4 14 Z" fill={color} />
    </Svg>
  );
}
