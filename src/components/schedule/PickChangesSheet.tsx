"use client";

import { CancelIcon } from "@hugeicons/core-free-icons";
import { dayLabel } from "@/lib/schedule/time";
import { to12h } from "@/lib/schedule/time";
import type { SchedulePick } from "@/lib/types";
import { Icon } from "@/components/ui/icon";

/** Shown when a sync has changed or dropped a session the user had picked —
 *  session ids are a content hash (see scripts/sync-from-sheet.py), so a
 *  moved/renamed/dropped class stops matching its old pick. Rather than let
 *  that pick just silently vanish from My Picks, this surfaces what it used
 *  to be (from the pick's own snapshot) and lets the user clear it. */
export function PickChangesSheet({
  changes,
  onDismiss,
  onClearAll,
  onClose,
}: {
  /** Orphaned picks — each guaranteed to carry a `snapshot`. */
  changes: SchedulePick[];
  onDismiss: (sessionId: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" role="dialog" aria-modal="true">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="relative max-h-full w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-opacity hover:opacity-80"
        >
          <Icon icon={CancelIcon} size={16} strokeWidth={2.5} />
        </button>

        <h2 className="wordmark pr-10 text-lg leading-tight">Picks that changed</h2>
        <div className="mt-1 flex items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            The schedule changed since you picked these, so they&rsquo;re no longer on it as picked.
          </p>
          {changes.length > 1 && (
            <button
              type="button"
              onClick={onClearAll}
              className="shrink-0 whitespace-nowrap pt-0.5 text-xs font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {changes.map((p) => {
            const s = p.snapshot;
            if (!s) return null;
            return (
              <div key={p.sessionId} className="flex items-start justify-between gap-3 rounded-2xl border border-border p-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight line-through decoration-muted-foreground/50">
                    {s.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {s.instructors.join(", ") || "TBA"}
                  </p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {[dayLabel(s.day), `${to12h(s.start)}–${to12h(s.end)}`, s.room].join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDismiss(p.sessionId)}
                  className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground transition-opacity hover:opacity-80"
                >
                  Clear
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
