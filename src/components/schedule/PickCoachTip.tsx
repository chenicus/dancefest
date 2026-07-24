"use client";

import { useEffect, useRef } from "react";

/**
 * The one-time "Saved here" tip, shown on the very first pick and never again
 * (see `coachSeen` in usePicksStore). The badge appearing on the nav heart is
 * easy to miss when your eyes are on the card you just tapped; this points at
 * it, once, then gets out of the way forever.
 *
 * It's anchored to the measured nav heart rather than to the nav pill's
 * centre: the pill holds two buttons, so its centre points at the gap between
 * them. `anchor` is the heart button's own centre-x and top edge in viewport
 * coordinates, so the tail lands on the icon whatever the pill's width.
 */
export function PickCoachTip({
  anchor,
  onDone,
}: {
  anchor: { x: number; top: number };
  onDone: () => void;
}) {
  // The countdown must run from mount, not from the latest render: the parent
  // passes `onDone` as an inline arrow, so every re-render (a scroll collapsing
  // the header, a second pick) hands us a new function identity. Depending on
  // it would tear down and restart the timer each time, stretching two seconds
  // into however long the user keeps interacting. Hold it in a ref instead so
  // the effect below can be mount-only while still calling the current one.
  const done = useRef(onDone);
  done.current = onDone;

  // Self-dismissing: a tip with a close button invites a decision, and this
  // one is a label, not a question. Two seconds — long enough to read six
  // characters and follow the tail down to the icon, short enough that it's
  // gone before it starts feeling like something you have to deal with.
  useEffect(() => {
    const t = setTimeout(() => done.current(), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="status"
      className="animate-toast-in pointer-events-none fixed z-50 -translate-x-1/2"
      style={{ left: anchor.x, bottom: `${Math.max(0, window.innerHeight - anchor.top) + 12}px` }}
    >
      <div className="rounded-full bg-foreground/95 px-3.5 py-1.5 text-sm font-medium text-background shadow-lg ring-1 ring-black/5">
        Saved here
      </div>
      {/* The tail: a rotated square of the same fill, half-buried under the
          pill so only its point shows. -mt-1 pulls it up into the pill's
          bottom edge so the two read as one shape rather than a pill with a
          diamond parked beneath it. */}
      <div
        aria-hidden
        className="mx-auto -mt-1 size-2.5 rotate-45 rounded-[2px] bg-foreground/95"
      />
    </div>
  );
}
