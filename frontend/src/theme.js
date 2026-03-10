import { createContext, useContext } from "react";

export const LIGHT_C = {
  primary:  "#1a7c4f",
  primaryL: "#22a866",
  primaryD: "#115c38",
  accent:   "#f59e0b",
  accentL:  "#fbbf24",
  bg:       "#f0f4f8",
  surface:  "#ffffff",
  border:   "#e2e8f0",
  text:     "#1e293b",
  textMid:  "#475569",
  textDim:  "#94a3b8",
  danger:   "#ef4444",
  warning:  "#f59e0b",
  success:  "#10b981",
  info:     "#3b82f6",
};

export const DARK_C = {
  primary:  "#22a866",
  primaryL: "#2dd67a",
  primaryD: "#1a7c4f",
  accent:   "#fbbf24",
  accentL:  "#fcd34d",
  bg:       "#0a0f1a",
  surface:  "#111827",
  border:   "#1e2d3d",
  text:     "#e2e8f0",
  textMid:  "#94a3b8",
  textDim:  "#4b6070",
  danger:   "#f87171",
  warning:  "#fbbf24",
  success:  "#34d399",
  info:     "#60a5fa",
};

export const ThemeCtx = createContext({ isDark: false, toggle: () => {}, C: LIGHT_C });

export function useTheme() {
  return useContext(ThemeCtx);
}

export function useC() {
  const { isDark } = useContext(ThemeCtx);
  return isDark ? DARK_C : LIGHT_C;
}
