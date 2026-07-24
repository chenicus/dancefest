import { describe, expect, it } from "vitest";
import { COLLAPSE_TUNING, nextCollapse } from "./headerCollapse";

const { topZone, bottomZone, delta } = COLLAPSE_TUNING;
/** Tall enough that the two zones can't touch. */
const MAX = 6280;
/** What collapsing the header takes off the page height. */
const COLLAPSE_DELTA = 74;
/** Comfortably clear of both zones. */
const MIDDLE = 3000;

describe("nextCollapse", () => {
  it("expands at the top whichever way the last movement went", () => {
    expect(nextCollapse({ y: 0, max: MAX, lastY: 400 }).collapsed).toBe(false);
    expect(nextCollapse({ y: topZone, max: MAX, lastY: 0 }).collapsed).toBe(false);
  });

  it("expands while rubber-banding past the top, where y goes negative", () => {
    expect(nextCollapse({ y: -80, max: MAX, lastY: 0 }).collapsed).toBe(false);
  });

  it("reads direction in the middle of the page", () => {
    expect(nextCollapse({ y: MIDDLE, max: MAX, lastY: MIDDLE - 50 }).collapsed).toBe(true);
    expect(nextCollapse({ y: MIDDLE, max: MAX, lastY: MIDDLE + 50 }).collapsed).toBe(false);
  });

  it("ignores sub-threshold movement without resetting the baseline", () => {
    const lastY = MIDDLE - delta + 1;
    const r = nextCollapse({ y: MIDDLE, max: MAX, lastY });
    expect(r.collapsed).toBeNull();
    // Baseline held, so successive nudges still accumulate into a decision
    // rather than being nibbled away one sub-pixel frame at a time.
    expect(r.lastY).toBe(lastY);
  });

  it("collapses in the bottom zone regardless of direction", () => {
    const y = MAX - bottomZone + 1;
    expect(nextCollapse({ y, max: MAX, lastY: y + 60 }).collapsed).toBe(true);
    expect(nextCollapse({ y, max: MAX, lastY: y - 60 }).collapsed).toBe(true);
  });

  it("keeps the full header on a page too short to hold both zones", () => {
    // Zones overlap here; the top one has to win, or a short page would collapse
    // the moment it was nudged and never come back.
    expect(nextCollapse({ y: 10, max: 60, lastY: 0 }).collapsed).toBe(false);
  });

  // The two regressions. Both are feedback loops: the header is in flow, so
  // resizing it moves the ceiling, and near the ceiling that motion is
  // indistinguishable from scrolling up.

  it("does not strobe when the shrinking page drags the viewport up", () => {
    let collapsed = false;
    let lastY = MAX - 30;
    let y = MAX - 10;
    const states: boolean[] = [];

    for (let i = 0; i < 20; i++) {
      // Someone still dragging downward at the end of the list — the state
      // that used to alternate every frame. Without this the loop has nothing
      // pushing back down and settles after a single spurious expand, which
      // understates the bug.
      y += 20;
      const max = collapsed ? MAX - COLLAPSE_DELTA : MAX;
      // The browser clamps an out-of-range offset back into the document.
      if (y > max) y = max;
      const r = nextCollapse({ y, max, lastY });
      lastY = r.lastY;
      if (r.collapsed !== null) collapsed = r.collapsed;
      states.push(collapsed);
    }

    expect(states).toEqual(Array(20).fill(true));
  });

  it("does not strobe while an iOS overscroll springs back", () => {
    const max = MAX - COLLAPSE_DELTA;
    let lastY = max;
    const states: boolean[] = [];

    // A hard flick overshoots the ceiling, then travels backwards to it — a
    // long run of negative deltas with no finger behind them.
    for (const y of [max + 140, max + 96, max + 55, max + 24, max + 6, max]) {
      const r = nextCollapse({ y, max, lastY });
      lastY = r.lastY;
      states.push(r.collapsed as boolean);
    }

    expect(states).toEqual(Array(6).fill(true));
  });

  it("still expands once a real scroll-up leaves the bottom zone", () => {
    const max = MAX - COLLAPSE_DELTA;
    const y = max - bottomZone - 1;
    expect(nextCollapse({ y, max, lastY: max }).collapsed).toBe(false);
  });
});
