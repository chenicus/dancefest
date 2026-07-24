"use client";

import { CancelIcon, InstagramIcon } from "@hugeicons/core-free-icons";
import { to12h } from "@/lib/schedule/time";
import { STYLE_COLORS } from "@/lib/theme";
import type { Artist, Session } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";

export function ArtistSheet({
  session,
  artists,
  onClose,
}: {
  /** The tapped session — shown in full so a truncated card title is readable. */
  session: Session;
  /** Artists for the tapped session; name-only entries allowed. */
  artists: { artist?: Artist; name: string }[];
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
        {artists.map(({ artist, name }, artistIndex) => {
          const igLinks = artist?.igLinks ?? [];
          return (
            <div key={name} className={cn("mb-5 last:mb-1", artistIndex === 0 && "pt-2")}>
              <div className="flex flex-col items-center text-center">
                <Avatar artist={artist} name={name} size={112} />
                <p className="mt-3 text-lg font-semibold leading-tight">{name}</p>
                {/* Fall back to the session's style so every artist gets this line,
                    even ones without their own artist record (no bio page yet). */}
                {(artist?.style ?? session.style) !== "other" && (
                  <p
                    className="mt-0.5 text-xs font-medium capitalize"
                    style={{ color: STYLE_COLORS[artist?.style ?? session.style] }}
                  >
                    {artist?.style ?? session.style}
                  </p>
                )}
              </div>
              {/* Full workshop details — the card truncates these, so show them whole.
                  Shared across every artist in the session, so only shown once, right
                  after the first artist's identity and before anyone's links. */}
              {artistIndex === 0 && (
                <div className="mb-4 mt-3 border-b border-border pb-4 text-center">
                  <p className="text-sm font-semibold leading-tight">{session.title}</p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {[session.level, `${to12h(session.start)}–${to12h(session.end)}`, session.room]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              )}
              <div className={cn(artistIndex > 0 && "mt-3")}>
                {igLinks.map((l, i) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "mb-2 flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-secondary/60",
                      i === 0 && l.kind === "joint" ? "border-foreground/25" : "border-border",
                    )}
                  >
                    <Icon icon={InstagramIcon} size={20} />
                    <span className="min-w-0 flex-1 truncate text-sm">@{l.url.split("/").pop()}</span>
                    <span className="text-xs text-muted-foreground">
                      {l.kind === "joint" ? "Joint account" : l.label}
                    </span>
                  </a>
                ))}
                {/* No handle we can stand behind — the festival's spreadsheet is
                    the only place some of these names appear (see
                    scripts/backfill-artist-media.py). Rather than guess an
                    account and risk pointing at a stranger, hand the name to
                    Instagram's own search, which is what someone would type
                    next anyway. */}
                {igLinks.length === 0 && (
                  <a
                    href={`https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-2 flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-muted-foreground transition-colors hover:bg-secondary/60"
                  >
                    <Icon icon={InstagramIcon} size={20} />
                    <span className="min-w-0 flex-1 truncate text-sm">Search Instagram for {name}</span>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
