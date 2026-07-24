/**
 * The decision behind the schedule's collapsing header, kept pure so it can be
 * tested against the scroll positions that actually break it.
 *
 * The header sits in normal flow, which is what makes this subtle: resizing it
 * changes the page height, and the page height sets the scroll ceiling. Near
 * that ceiling the browser drags the viewport to keep it in range, and iOS
 * rubber-banding adds its own backwards travel as an overscroll springs back.
 * Both look exactly like scrolling up, and both happen *because* the header
 * moved — so a naive direction reading feeds itself and strobes.
 */

/** One frame's worth of scroll state. */
export interface CollapseFrame {
  /** `window.scrollY`. Sits outside `[0, max]` while iOS rubber-bands. */
  y: number;
  /** Largest in-range offset — `scrollHeight - innerHeight`. */
  max: number;
  /** Position the last committed decision was measured from. */
  lastY: number;
}

export interface CollapseTuning {
  /** Within this of the top, always expanded. */
  topZone: number;
  /** Within this of the ceiling, always collapsed. */
  bottomZone: number;
  /** Movement smaller than this isn't read as intent. */
  delta: number;
}

export const COLLAPSE_TUNING: CollapseTuning = {
  topZone: 48,
  // Clears the ~74px collapse delta with room to spare, so a ceiling shift can
  // never reach past the zone that exists to contain it.
  bottomZone: 140,
  delta: 4,
};

/**
 * The header state for this frame — `null` to leave it as it is — plus the
 * baseline the next frame should measure against.
 */
export function nextCollapse(
  { y, max, lastY }: CollapseFrame,
  { topZone, bottomZone, delta }: CollapseTuning = COLLAPSE_TUNING,
): { collapsed: boolean | null; lastY: number } {
  if (y <= topZone) return { collapsed: false, lastY: y };
  // Collapsed is the only stable answer at the bottom: it shortens the page,
  // so you stay pinned to the ceiling and stay in the zone. Forcing expanded
  // would push the ceiling out from under you and bounce you back out of the
  // zone — the same oscillation wearing a different hat.
  //
  // Ordering matters: on a page too short to hold both zones they overlap, and
  // "short page" should settle on a stable full header.
  if (y >= max - bottomZone) return { collapsed: true, lastY: y };
  const dy = y - lastY;
  // Sub-threshold movement leaves the baseline alone rather than resetting it,
  // so slow deliberate scrolling still accumulates past the threshold instead
  // of being nibbled away one sub-pixel frame at a time.
  if (Math.abs(dy) < delta) return { collapsed: null, lastY };
  return { collapsed: dy > 0, lastY: y };
}
