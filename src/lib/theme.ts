import type { DanceStyle, Theme } from "./types";

// Anchor hues are spaced around the wheel so the pale unpicked tints stay
// tellable apart: the old blue-500/violet-500 pair (bachata/kizomba) washed
// out to near-identical pastels, so bachata moved to sky-cyan and kizomba to
// a deeper purple.
export const STYLE_COLORS: Record<DanceStyle, string> = {
  bachata: "#0ea5e9",
  salsa: "#ec4899",
  zouk: "#22c55e",
  kizomba: "#9333ea",
  other: "#64748b",
};

// Picked tiles fill one shade deeper than the anchor so white text stays
// readable (the bright anchors bottomed out at 2.3:1 on zouk green). Tints
// and pills keep the brighter STYLE_COLORS anchors.
export const PICKED_STYLE_COLORS: Record<DanceStyle, string> = {
  bachata: "#0284c7",
  salsa: "#db2777",
  zouk: "#16a34a",
  kizomba: "#9333ea",
  other: "#64748b",
};

// Parties (night parties + daytime socials) are one shared family: a pale
// gradient with glowing style letters when unpicked, this near-black indigo
// when picked. The gradient leans cooler than the kizomba pastel on purpose.
export const PARTY_MIDNIGHT = "#221e33";
export const PARTY_GRADIENT = "linear-gradient(160deg, #eceaf2 0%, #d6d3e2 100%)";

// Performances are the one golden family, and the one picked tile with dark
// text: a truly yellow gold is too light to ever carry white text.
export const GOLD_ANCHOR = "#eab308";
export const PERF_BUTTER = "#fbe58f";
export const PERF_HONEY = "#f1ce5e";
export const PERF_ESPRESSO = "#4a3305";
export const PERF_MUTED = "#6d4c08";

// Competitions (J&J etc.) are the only gray family left — deliberately
// neutral, tinted deeper than the style tiles so the gray reads as gray
// rather than almost-lavender next to the party gradient.
export const COMPETITION_SLATE = "#475569";

export function styleTint(style: DanceStyle, alpha = 0.1): string {
  return hexAlpha(STYLE_COLORS[style], alpha);
}

/** Any hex color at a given alpha, as rgba(). */
export function hexAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Scales a hex color's channels toward black, keeping its hue — a "700/800
 *  shade" of the same color, used for muted text that needs to read as this
 *  color's family rather than as generic gray, while staying legible on a
 *  light tint of that same color. */
export function darken(hex: string, factor = 0.55): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Linear-interpolate between two hex colors at t (0 = hexA, 1 = hexB). */
export function mix(hexA: string, hexB: string, t: number): string {
  const a = parseInt(hexA.replace("#", ""), 16);
  const b = parseInt(hexB.replace("#", ""), 16);
  const ar = (a >> 16) & 255,
    ag = (a >> 8) & 255,
    ab = a & 255;
  const br = (b >> 16) & 255,
    bg = (b >> 8) & 255,
    bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${[r, g, bl].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** A style color readable against the midnight party fill — lifted 30%
 *  toward white so dark hues (kizomba purple) keep contrast on near-black. */
export function liftForDark(hex: string): string {
  return mix(hex, "#ffffff", 0.3);
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
