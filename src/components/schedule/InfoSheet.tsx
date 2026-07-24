"use client";

import { useState } from "react";
import {
  CancelIcon,
  LinkSquare02Icon,
  Location01Icon,
} from "@hugeicons/core-free-icons";
import { dayLabel } from "@/lib/schedule/time";
import type { FestivalEvent } from "@/lib/types";
import { Icon } from "@/components/ui/icon";

// Venue + registration desk hours live here rather than in the event JSON: the
// extractor only pulls the program (rooms/sessions/parties), so this practical
// "how to get in the door" info was supplied by the organizers directly. It's a
// single-festival build (see page.tsx), so baking it in is fine.
const VENUE = {
  name: "Hyatt Regency SF Airport",
  address: "1333 Old Bayshore Hwy, Burlingame, CA",
  // Full "name, address" string used to build each platform's maps link.
  mapsQuery: "Hyatt Regency SF Airport, 1333 Old Bayshore Hwy, Burlingame, CA",
  deskNote:
    "The desk is in front of the main ballroom, in the hotel's center atrium. After 2:30 AM passes aren't sold, but security still checks wristbands — need in? Ask them to contact us.",
  // Fri/Sat/Sun share the same window, so they collapse into one row — keeps
  // the sheet short enough to read without scrolling.
  hours: [
    { day: "Thursday", time: "9:00 PM – 1:00 AM" },
    { day: "Friday – Sunday", time: "10:30 AM – 2:30 AM" },
  ],
} as const;

// Open the venue in whatever maps app the device defaults to, rather than
// forcing one provider: Apple Maps on iOS/macOS (the maps:// scheme, which iOS
// routes to the user's default), the system maps chooser on Android (geo:),
// and Google Maps in a new tab as the desktop/web fallback.
function openInMaps(query: string) {
  const q = encodeURIComponent(query);
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/iPhone|iPad|iPod|Macintosh/.test(ua)) {
    window.location.href = `maps://?q=${q}`;
  } else if (/Android/.test(ua)) {
    window.location.href = `geo:0,0?q=${q}`;
  } else {
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank", "noopener,noreferrer");
  }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground/70">
      {children}
    </p>
  );
}

/** One party's poster thumbnail, falling back to a tinted block if the image
 *  fails (same plain-<img> + onError pattern as the artist avatars). */
function PartyThumb({ src, label }: { src?: string; label: string }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        onError={() => setBroken(true)}
        className="size-14 shrink-0 rounded-xl object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-secondary text-xs font-bold uppercase text-muted-foreground"
    >
      {label}
    </span>
  );
}

export function InfoSheet({ event, onClose }: { event: FestivalEvent; onClose: () => void }) {
  const parties = [...(event.parties ?? [])].sort((a, b) => a.day.localeCompare(b.day));

  return (
    // Full-screen takeover (not a bottom sheet): opaque, edge-to-edge, no
    // backdrop or drag handle. A plain fade in — it reads as a page, not a
    // sheet you slid up. The × is the only way out.
    <div
      className="animate-in fade-in fixed inset-0 z-50 flex flex-col bg-background duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Festival info"
    >
      <div className="flex items-center justify-between border-b border-border px-5 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <h2 className="wordmark text-lg">Festival info</h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-opacity hover:opacity-80"
        >
          <Icon icon={CancelIcon} size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Sized to fit without scrolling on a typical phone; overflow-y-auto is
          only a fallback for very short viewports. */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Venue + directions */}
        <section>
          <SectionLabel>Venue</SectionLabel>
          {/* The whole card is the tap target — opens the device's own maps
              app, with the web-maps href as the no-JS fallback. */}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(VENUE.mapsQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${VENUE.name} in Maps`}
            onClick={(e) => {
              e.preventDefault();
              openInMaps(VENUE.mapsQuery);
            }}
            className="block rounded-2xl border border-border p-3.5"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                <Icon icon={Location01Icon} size={19} />
              </span>
              <div className="min-w-0">
                <p className="wordmark truncate text-base leading-tight">{VENUE.name}</p>
                <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{VENUE.address}</p>
              </div>
            </div>
          </a>
        </section>

        {/* Nightly party themes — placed above registration so the fun stuff
            leads and the practical desk hours follow. */}
        {parties.length > 0 && (
          <section>
            <SectionLabel>Nightly parties</SectionLabel>
            {/* One card, rows split by dividers — saves the vertical gaps and
                repeated borders three separate cards would cost. */}
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
              {parties.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-2.5">
                  <PartyThumb src={p.image} label={dayLabel(p.day).slice(0, 3)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                      {dayLabel(p.day)}
                    </p>
                    <p className="wordmark truncate text-base leading-tight">{p.name}</p>
                    {p.dressCode && (
                      <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">{p.dressCode}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Registration desk hours */}
        <section>
          <SectionLabel>Registration &amp; tickets</SectionLabel>
          <div className="rounded-2xl border border-border p-3.5">
            <div className="space-y-1">
              {VENUE.hours.map((h) => (
                <div key={h.day} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{h.day}</span>
                  <span className="font-semibold tabular-nums">{h.time}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 border-t border-border pt-2.5 text-xs leading-relaxed text-muted-foreground">
              {VENUE.deskNote}
            </p>
          </div>
        </section>

        {/* Full program link */}
        {event.sourceUrl && (
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-2xl border border-border px-4 py-3 transition-colors hover:bg-secondary/60"
          >
            <span className="flex items-center gap-2.5 text-sm font-semibold">
              <Icon icon={LinkSquare02Icon} size={18} className="text-muted-foreground" />
              Full program &amp; tickets
            </span>
            <span className="truncate pl-3 text-sm text-muted-foreground">
              {event.sourceUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}
            </span>
          </a>
        )}
      </div>
    </div>
  );
}
