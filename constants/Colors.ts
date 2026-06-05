export const Colors = {
  ink: "#0e1a2b",
  gold: "#b8892a",
  paper: "#f5efe2",
  emerald: "#2d6b4f",
  rose: "#a84a3d",
} as const;

export type ColorName = keyof typeof Colors;
