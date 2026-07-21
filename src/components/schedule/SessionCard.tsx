"use client";

import { ChevronRightIcon } from "@hugeicons/core-free-icons";
import { shortArtistName } from "@/lib/names";
import { abbreviateLevel } from "@/lib/schedule/level";
import { to12h } from "@/lib/schedule/time";
import { STYLE_COLORS, styleTint } from "@/lib/theme";
import type { Artist, Session } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "./Avatar";

export function SessionCard({
  session,
  artists,
  picked,
  showTimes = false,
  showRoom = true,
  dense = false,
  softPicked = false,
  onToggle,
  onArtistTap,
}: {
  session: Session;
  artists: Artist[];
  picked: boolean;
  showTimes?: boolean;
  showRoom?: boolean;
  /** Compact typography for the narrow desktop grid. */
  dense?: boolean;
  /** My Picks list: every card here is picked, so the intense solid fill
   * (right for flagging a pick *among* the calendar's mostly-unpicked tiles)
   * would just make the whole list loud. Keep the calm tinted background
   * instead and let the style pill alone carry the full-strength color. */
  softPicked?: boolean;
  onToggle: () => void;
  onArtistTap: () => void;
}) {
  // Idle room/time slots ("No Class" in the source schedule) render as a
  // plain, non-interactive placeholder — there's nothing to open a detail
  // sheet for or pick.
  if (session.type === "empty") {
    return (
      <div
        aria-hidden
        // h-full: the wrapping grid cell stretches to match the row's tallest
        // card (CSS grid items stretch by default), but a plain block child
        // doesn't inherit that — without h-full this card would sit at its
        // own min-height, leaving a gap below it inside the taller cell.
        className={cn(
          "flex h-full min-h-[54px] items-center justify-center rounded-2xl border border-dashed border-border/60",
          dense ? "px-2.5 py-1.5" : "px-3 py-2.5",
        )}
      >
        <span className={cn("text-muted-foreground/50", dense ? "text-[11px]" : "text-xs")}>Empty</span>
      </div>
    );
  }

  // Prefer the matched lineup artist's name over the schedule sheet's raw
  // label (e.g. show "Ngoc Huynh & Tien Tran", not "Ngoc Knockout").
  const matched = (session.artistIds ?? [])
    .map((id) => artists.find((a) => a.id === id))
    .filter((a): a is Artist => !!a);
  const name = matched.length
    ? matched.map((a) => shortArtistName(a.name)).join(", ")
    : session.instructors.map(shortArtistName).join(", ") || "TBA";
  const artist = matched[0];
  const color = STYLE_COLORS[session.style];

  // DJ sets title the session after the DJ ("MKiZ", "SINK") — same string as
  // the name row above, so showing both repeats it. Skip the title row then.
  const showTitleRow = session.title.trim().toLowerCase() !== name.trim().toLowerCase();

  const eventType = session.type ?? "workshop";

  // Picked cards fill solid with the style color + light text everywhere
  // *except* the My Picks list (softPicked), where every card is picked and
  // the solid fill would just make the whole list loud rather than flagging
  // anything.
  const filled = picked && !softPicked;

  const avatarPx = dense ? 24 : 28;
  const textReserve = dense ? "pr-8" : "pr-16";

  // Workshops and DJ sets are tinted by dance style. Performances get their
  // own gold tint (the main-stage showcase isn't tied to one style). Competitions
  // and socials/practicas are deliberately neutral gray — that's the whole
  // point of the color, flagging "this isn't a regular class" regardless of
  // which style it happens to be.
  const bgTint =
    eventType === "performance"
      ? "#fef3c7"
      : eventType === "competition" || eventType === "social"
        ? "#e5e7eb"
        : styleTint(session.style, 0.1);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${session.title} with ${name}`}
      aria-pressed={picked}
      // Adding to your schedule is the primary action, so the whole tile
      // toggles the pick; only the corner caret opens the details sheet.
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        // h-full: a session's grid cell is sized to its real duration (rowEnd
        // - rowStart), which can exceed this card's own content height — e.g.
        // a 2-hour DJ set spans the same row range a 1-hour one would need
        // twice over. Without h-full the card just sits at its natural
        // height, leaving dead space below it instead of visually filling
        // the time it actually occupies.
        "group relative h-full min-h-[54px] cursor-pointer rounded-2xl transition-all",
        dense ? "px-2.5 py-1.5" : "px-3 py-2.5",
        picked ? "ring-1 ring-black/10" : "ring-1 ring-transparent hover:ring-border",
      )}
      style={{ background: filled ? color : bgTint }}
    >
      <div className={cn("min-w-0 font-condensed", textReserve)}>
        {/* Artist — one row, never wraps (spreadsheet-style). */}
        <p
          className={cn(
            "truncate font-medium leading-snug",
            dense ? "text-[12px]" : "text-sm",
            filled && "text-white",
          )}
        >
          {name}
        </p>
        {/* Class name — its own row. Skipped when it's just the DJ's name
            again (see showTitleRow). */}
        {showTitleRow && (
          <p
            className={cn(
              "mt-0.5 truncate font-medium leading-snug",
              dense ? "text-[11px]" : "text-[13px]",
              filled ? "text-white/90" : "text-foreground",
            )}
          >
            {session.title}
          </p>
        )}
        {/* Level + time share one muted row. */}
        {(session.level || showTimes) && (
          <p
            className={cn(
              "mt-0.5 truncate leading-snug",
              dense ? "text-[10px]" : "text-xs",
              filled ? "text-white/70" : "text-muted-foreground",
            )}
          >
            {[
              session.level && abbreviateLevel(session.level),
              showTimes && `${to12h(session.start)}–${to12h(session.end)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        {/* Style name — the tint alone isn't enough to name the dance style,
            so spell it out. Against a solid-filled card the pill stays a
            translucent white (matching the room pill) so it doesn't fight
            the fill; against a tinted card it carries the full-strength
            style color as the one intense accent. Skipped in the dense grid,
            which already has the style legend above it as a filter; "other"
            has no useful name to show. */}
        {(!dense || showRoom) && (session.style !== "other" || showRoom) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {session.style !== "other" && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize",
                  filled ? "bg-white/20 text-white" : "text-white",
                )}
                style={filled ? undefined : { background: color }}
              >
                {session.style}
              </span>
            )}
            {showRoom && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                  filled ? "bg-white/20 text-white" : "bg-card/70 text-muted-foreground",
                )}
              >
                {session.room}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Artist photo — fixed top-right, purely decorative. Picking is the
          whole tile's job now; the caret below is the only other control. */}
      <span
        aria-hidden
        className={cn(
          "absolute right-1.5 top-1.5 shrink-0 overflow-hidden rounded-full ring-2 ring-card",
          dense ? "size-6" : "size-7",
        )}
      >
        <Avatar artist={artist} name={name} size={avatarPx} />
      </span>

      {/* Bottom-right, clear of the photo — opens the details sheet
          (Instagram, bio, etc.) without touching the pick. Revealed only on
          hover — not on focus, since clicking the tile to pick it leaves it
          focused and the caret shouldn't linger just because of that. */}
      <button
        type="button"
        aria-label={`View info for ${name}`}
        onClick={(e) => {
          e.stopPropagation();
          onArtistTap();
        }}
        className={cn(
          "absolute bottom-1.5 right-1.5 flex items-center justify-center rounded-full shadow-sm ring-1 ring-border opacity-0 transition-opacity group-hover:opacity-100",
          filled ? "bg-white/90 text-foreground" : "bg-card text-foreground",
          dense ? "size-5" : "size-6",
        )}
      >
        <Icon icon={ChevronRightIcon} size={dense ? 12 : 14} strokeWidth={2.5} />
      </button>
    </div>
  );
}
