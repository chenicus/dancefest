import type { DanceStyle, Theme } from "./types";

export const STYLE_COLORS: Record<DanceStyle, string> = {
  bachata: "#f97316",
  salsa: "#dc2626",
  zouk: "#16a34a",
  kizomba: "#7c3aed",
  other: "#64748b",
};

export function styleTint(style: DanceStyle, alpha = 0.1): string {
  const hex = STYLE_COLORS[style];
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Relative luminance; used to keep extracted accents readable on white. */
export function luminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n)) return 0;
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function themeToCssVars(theme: Theme): Record<string, string> {
  // Too-light accents (near-white extractions) fall back to black chrome.
  const accent = luminance(theme.accent) > 0.7 ? "#111111" : theme.accent;
  return {
    "--event-accent": accent,
    "--event-bg": theme.background || "#ffffff",
  };
}
