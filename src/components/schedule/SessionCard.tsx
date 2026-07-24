"use client";

import { CancelIcon, ChevronRightIcon } from "@hugeicons/core-free-icons";
import { shortArtistName } from "@/lib/names";
import { abbreviateLevel } from "@/lib/schedule/level";
import { to12h } from "@/lib/schedule/time";
import {
  COMPETITION_SLATE,
  darken,
  GOLD_ANCHOR,
  hexAlpha,
  liftForDark,
  PARTY_GRADIENT,
  PARTY_MIDNIGHT,
  PERF_BUTTER,
  PERF_ESPRESSO,
  PERF_HONEY,
  PERF_MUTED,
  PICKED_STYLE_COLORS,
  STYLE_COLORS,
  styleTint,
} from "@/lib/theme";
import type { Artist, DanceStyle, Session } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "./Avatar";

// A single oversized initial behind each class card, so the dance style
// reads at a glance before any text does. "other" has no meaningful
// initial (it's the catch-all), so it opts out and shows no watermark.
const STYLE_INITIAL: Record<DanceStyle, string | null> = {
  bachata: "B",
  salsa: "S",
  zouk: "Z",
  kizomba: "K",
  other: null,
};

// Mixed-style tiles always render their letters in this order no matter how
// the schedule data lists them — "BS" and "SB" in the source must not become
// two different-looking parties.
const STYLE_ORDER: DanceStyle[] = ["salsa", "bachata", "kizomba", "zouk"];

// Letter size steps down as a combo grows so SBK/SBKZ stay inside the card.
// Index = letter count; [1] matches the shipped single-letter default.
const WM_SIZE = ["0", "5.5rem", "4rem", "3.25rem", "2.75rem"];

// Shipped placement of the style-initial watermark. Every value is exposed as
// a CSS custom property so the /tune/watermark page can drive them live off
// sliders; these are the defaults the real cards fall back to. Tuned to sit in
// the empty band to the LEFT of the top-right profile photo rather than under
// it. Keep this the single source of truth — the tuner reads the same names.
// Shipped placement for the roomy single-column list cards (mobile schedule +
// My Picks), tuned on the /tune/watermark playground.
export const WATERMARK_DEFAULTS = {
  right: "3.75rem", // clears the ~44px avatar column so the letter lands in open space
  bottom: "0.6rem",
  size: "5.5rem",
  rotation: "-23deg",
  opacity: "1",
} as const;

// The desktop grid's dense tiles are far shorter (~92px floor) and their avatar
// is only 24px, so the list size above would overflow the tile. This scaled
// placement keeps the whole letter INSIDE the tile — a little left of the small
// photo, a little lower — matching the list look at the grid's proportions.
export const WATERMARK_DEFAULTS_DENSE = {
  right: "1.9rem",
  bottom: "0.4rem",
  size: "3rem",
  rotation: "-23deg",
  opacity: "1",
} as const;

// Dense-grid letter sizes, same steps scaled to the shorter tiles.
const WM_SIZE_DENSE = ["0", "3rem", "2.2rem", "1.8rem", "1.5rem"];

/** How the watermark letters dress for each tile family/state:
 *  - tint: unpicked workshop — the style color as a faint ghost.
 *  - fill: picked solid fill — translucent white knocked into the surface.
 *  - neutral: competition — a slate ghost, deliberately colorless.
 *  - party: unpicked party — full-strength style colors with a soft halo of
 *    each letter's own color glowing behind it (no other tile glows, so this
 *    alone marks "party" against the flat workshop pastels).
 *  - partyFill: picked party — the same letters lifted toward white so dark
 *    hues (kizomba purple) keep contrast on the midnight fill. */
type WatermarkVariant = "tint" | "fill" | "neutral" | "party" | "partyFill";

function watermarkLetterColor(variant: WatermarkVariant, style: DanceStyle): string {
  switch (variant) {
    case "tint":
      return hexAlpha(STYLE_COLORS[style], 0.16);
    case "fill":
      return "rgba(255,255,255,0.2)";
    case "neutral":
      return hexAlpha(COMPETITION_SLATE, 0.22);
    case "party":
      return hexAlpha(STYLE_COLORS[style], 0.85);
    case "partyFill":
      return hexAlpha(liftForDark(STYLE_COLORS[style]), 0.85);
  }
}

/** The big handwritten style-initial(s) sitting behind a card's text. Rotated
 *  so it reads as a hand-drawn mark rather than a centered logo, and offset
 *  left of the profile photo so the pic doesn't cover it. Mixed-style sets
 *  render one letter per style in canonical S-B-K-Z order, stepping the font
 *  size down (WM_SIZE) and easing the tilt to -12° so the leading letter
 *  never sinks under the tile's corner.
 *  The roomy list cards read single-letter placement from --wm-* CSS vars (so
 *  the /tune/watermark playground can drive them live); the short dense grid
 *  tiles use their own smaller constants so the letter stays inside the tile. */
function StyleWatermark({
  styles,
  variant,
  dense,
}: {
  styles: DanceStyle[];
  variant: WatermarkVariant;
  dense: boolean;
}) {
  const letters = STYLE_ORDER.filter((s) => styles.includes(s) && STYLE_INITIAL[s]);
  if (letters.length === 0) return null;
  const d = dense ? WATERMARK_DEFAULTS_DENSE : WATERMARK_DEFAULTS;
  const multi = letters.length > 1;
  const sizes = dense ? WM_SIZE_DENSE : WM_SIZE;
  const fontSize = multi ? sizes[letters.length] : dense ? d.size : `var(--wm-size, ${d.size})`;
  const rotation = multi ? "rotate(-12deg)" : dense ? `rotate(${d.rotation})` : `rotate(var(--wm-rot, ${d.rotation}))`;
  // One soft blob of each letter's own color, spread along the letter row.
  // Painted on an oversized layer behind the glyphs so the glow spills past
  // the text box the way light would, not clipped to the letter shapes.
  // Both party states glow: a soft halo on the pale unpicked gradient, and a
  // stronger one on the picked midnight fill, where it reads as actual neon.
  const isPartyVariant = variant === "party" || variant === "partyFill";
  const halo = isPartyVariant
    ? letters
        .map((s, i) => {
          const x = ((i + 0.5) / letters.length) * 100;
          const c = variant === "partyFill" ? liftForDark(STYLE_COLORS[s]) : STYLE_COLORS[s];
          return `radial-gradient(${Math.round(90 / letters.length)}% 70% at ${x}% 55%, ${hexAlpha(
            c,
            variant === "partyFill" ? 0.5 : 0.38,
          )}, transparent 70%)`;
        })
        .join(",")
    : null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute select-none whitespace-nowrap font-marker leading-none"
      style={{
        right: dense ? d.right : `var(--wm-right, ${d.right})`,
        bottom: dense ? d.bottom : `var(--wm-bottom, ${d.bottom})`,
        fontSize,
        transform: rotation,
        opacity: dense ? d.opacity : `var(--wm-opacity, ${d.opacity})`,
      }}
    >
      {/* transform above makes this span a stacking context, so the halo's
          negative z-index stays behind the letters but inside this card. */}
      {halo && <span className="absolute" style={{ inset: "-30% -20%", background: halo, zIndex: -1 }} />}
      {letters.map((s, i) => (
        <span key={s} className="relative" style={{ color: watermarkLetterColor(variant, s), marginLeft: i ? "-0.04em" : 0 }}>
          {STYLE_INITIAL[s]}
        </span>
      ))}
    </span>
  );
}

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
  onRemove,
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
  /** Optional in the schedule (whole-tile tap toggles the pick); in remove
   * mode it's undefined and the card click does nothing destructive. */
  onToggle?: () => void;
  onArtistTap: () => void;
  /** My Picks "remove mode". When provided, the whole tile opens details
   * (onArtistTap) instead of toggling, and a persistent × button in the
   * corner calls this to remove the pick — so a stray tap on the card can no
   * longer delete a saved session; deleting takes a deliberate hit on the ×. */
  onRemove?: () => void;
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
          "flex h-full min-h-[54px] items-center justify-center rounded-md border border-dashed border-border/60",
          dense ? "px-2.5 py-1.5" : "p-3",
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
  // Some sessions (e.g. a group performance showcase) have no artist or
  // instructor credited at all — falling back to "TBA" as the name row would
  // read as a placeholder artist that doesn't exist. Use the title itself as
  // the name row instead, which collapses showTitleRow below and leaves the
  // card as header + time, same shape as an uncredited party tile.
  const hasArtist = matched.length > 0 || session.instructors.length > 0;
  const name = matched.length
    ? matched.map((a) => shortArtistName(a.name)).join(", ")
    : session.instructors.length
      ? session.instructors.map(shortArtistName).join(", ")
      : session.title;
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

  // The dense desktop grid packs many narrow columns, so the photo stays
  // small; the single-column mobile list has room to let it read as an
  // actual portrait rather than a tiny avatar.
  const avatarPx = dense ? 24 : 44;
  const textReserve = dense ? "pr-8" : "pr-20";

  // Night parties AND daytime socials/practicas are one shared "party"
  // family: a party is a party, and the row's time slot already says day vs.
  // night. Competitions (J&J etc.) are the only gray tiles left, so gray
  // means exactly one thing. Performances are the one golden family.
  const isParty = eventType === "party" || eventType === "social";
  const isPerf = eventType === "performance";
  const isComp = eventType === "competition";

  // Unpicked backgrounds: workshops/DJ sets tint by dance style; performances
  // get butter; competitions a deliberately-neutral slate; parties a pale
  // gradient (the only non-flat unpicked tile, so it marks "party" at a
  // glance even before the glowing letters do).
  const unpickedBg = isPerf
    ? PERF_BUTTER
    : isComp
      ? hexAlpha(COMPETITION_SLATE, 0.22)
      : isParty
        ? PARTY_GRADIENT
        : styleTint(session.style, 0.15);

  // Picked fills step one shade deeper than the tint anchors
  // (PICKED_STYLE_COLORS) so white text stays readable; parties deepen to
  // midnight, performances to honey (the one picked tile with dark text —
  // a truly yellow gold can't carry white).
  const fillColor = isPerf
    ? PERF_HONEY
    : isComp
      ? COMPETITION_SLATE
      : isParty
        ? PARTY_MIDNIGHT
        : PICKED_STYLE_COLORS[session.style];

  // Each family's saturated anchor — drives the hover ring, the darkened
  // muted-text shade, and the avatar tint, so all three read as "this tile's
  // own color" rather than generic gray.
  const anchor = isPerf ? GOLD_ANCHOR : isComp ? COMPETITION_SLATE : isParty ? PARTY_MIDNIGHT : color;
  const hoverRingColor = hexAlpha(anchor, 0.5);
  const mutedTextColor = darken(anchor);
  // The picked performance tile keeps dark text on its light honey fill;
  // every other picked fill is dark enough for white.
  const filledPerf = filled && isPerf;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={hasArtist ? `${session.title} with ${name}` : session.title}
      // In remove mode the tile opens details (not a toggle), so aria-pressed
      // (a toggle-state role) would be misleading — drop it there.
      aria-pressed={onRemove ? undefined : picked}
      // In the schedule, adding to your day is the primary action, so the
      // whole tile toggles the pick and only the corner caret opens details.
      // In My Picks (remove mode) that's flipped: the tile opens details and
      // the corner × removes, so an accidental tap can't drop a saved pick.
      onClick={onRemove ? onArtistTap : onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          (onRemove ? onArtistTap : onToggle)?.();
        }
      }}
      className={cn(
        // h-full: a session's grid cell is sized to its real duration (rowEnd
        // - rowStart), which can exceed this card's own content height — e.g.
        // a 2-hour DJ set spans the same row range a 1-hour one would need
        // twice over. Without h-full the card just sits at its natural
        // height, leaving dead space below it instead of visually filling
        // the time it actually occupies.
        "group relative h-full min-h-[54px] cursor-pointer overflow-hidden rounded-md transition-all",
        dense ? "px-2.5 py-1.5" : "p-3",
        // ring-inset: the ring must draw inside the tile's own box, not as an
        // outward box-shadow — an outward ring on a tile flush against a
        // scrollable ancestor's edge (e.g. the desktop grid's last row) gets
        // clipped by that ancestor's scroll bounds, since scrollHeight is
        // computed from the border-box and ignores box-shadow spread.
        picked ? "ring-1 ring-inset ring-black/10" : "ring-1 ring-inset ring-transparent hover:ring-[var(--tile-ring)]",
      )}
      style={{
        // `background` (not backgroundColor): the unpicked party family is a
        // CSS gradient, and the shorthand takes plain colors just as happily.
        background: filled ? fillColor : unpickedBg,
        ["--tile-ring" as string]: hoverRingColor,
        ["--tile-muted-text" as string]: mutedTextColor,
      }}
    >
      {/* Party tiles show their letters at full strength (with a halo when
          unpicked); mixed-style sets get one letter per style. Everything
          else keeps the single faint ghost. */}
      <StyleWatermark
        styles={session.styles?.length ? session.styles : [session.style]}
        variant={isParty ? (filled ? "partyFill" : "party") : filled ? "fill" : isComp ? "neutral" : "tint"}
        dense={dense}
      />
      {/* relative z-10: the watermark above is `position: absolute` — CSS
          stacking paints positioned elements after non-positioned in-flow
          content regardless of DOM order, so without this the letters would
          sit on top of this text.
          pointer-events-none: this block has no interactive content of its
          own, but its box still spans almost the full card width (only
          textReserve's padding carves out the corner) — at z-10 it was
          winning the hit-test over the caret button and avatar below it
          (both position:absolute with z-index:auto, so a lower stacking
          level despite being later in the DOM), swallowing their clicks and
          bubbling straight to the card's onToggle instead. */}
      <div className={cn("pointer-events-none relative z-10 min-w-0 font-condensed", textReserve)}>
        {/* Artist — one row, never wraps (spreadsheet-style). leading-none
            so the line-box doesn't itself add space beyond the card's own
            padding — every gap in this block is set by an explicit margin,
            not by font leading, so it stays visibly tighter than the
            padding around the whole block. */}
        <p
          className={cn(
            "truncate font-medium leading-none",
            dense ? "text-xs" : "text-sm",
            filled && !filledPerf && "text-white",
          )}
          style={filledPerf ? { color: PERF_ESPRESSO } : undefined}
        >
          {name}
        </p>
        {/* Class name — its own row. Skipped when it's just the DJ's name
            again (see showTitleRow). leading-none (rather than leading-snug)
            so its line-box doesn't pad out the gap to the details row below
            it — that gap is set explicitly via margin instead.
            Party tiles skip it entirely: the full-strength letter watermark
            already names the set's style(s), so spelling it out again would
            just repeat the letters in words. */}
        {!isParty && showTitleRow && (
          <p
            className={cn(
              "mt-1 truncate font-medium leading-none",
              dense ? "text-[11px]" : "text-sm",
              filled ? !filledPerf && "text-white/90" : "text-foreground",
            )}
            style={filledPerf ? { color: PERF_ESPRESSO } : undefined}
          >
            {session.title}
          </p>
        )}
        {/* Level + time share one muted row, deliberately close to the class
            name above it — they read as one grouped detail, not a third
            independent line. leading-none for the same reason as above. */}
        {(session.level || showTimes) && (
          <p
            className={cn(
              "mt-0.5 truncate leading-none",
              dense ? "text-[11px]" : "text-xs",
              filled ? !filledPerf && "text-white/70" : "text-[var(--tile-muted-text)]",
            )}
            style={filledPerf ? { color: PERF_MUTED } : undefined}
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
            which already has the style legend above it as a filter. Skipped
            for parties too — those show the style in the class-name row
            instead (see showTitleRow above), so a second style tag here
            would just repeat it. "other" has no useful name to show. */}
        {(!dense || showRoom) && (session.style !== "other" || showRoom) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {/* My Picks (softPicked) skips this pill — the style watermark
                letter (B/S/K/Z) already names the style there, so the pill
                would just repeat it. */}
            {session.style !== "other" && !isParty && !softPicked && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize",
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
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                  filled
                    ? filledPerf
                      ? "bg-white/70"
                      : "bg-white/20 text-white"
                    : "bg-card/70 text-[var(--tile-muted-text)]",
                )}
                style={filledPerf ? { color: PERF_MUTED } : undefined}
              >
                {session.room}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Artist photo — fixed top-right, purely decorative. Picking is the
          whole tile's job now; the caret below is the only other control.
          Inset by the same amount as the card's own padding (p-3, dense
          px-2.5/py-1.5) so it reads as evenly bordered on every side, not
          just hugging the left/bottom edges of its content. */}
      <span
        aria-hidden
        className={cn(
          "absolute shrink-0 overflow-hidden rounded-full ring-2 ring-card",
          dense ? "right-2.5 top-1.5 size-6" : "right-3 top-3 size-11",
        )}
      >
        <Avatar artist={artist} name={name} size={avatarPx} tint={anchor} />
      </span>

      {/* Bottom-right corner control, clear of the photo. Two modes:
          - Remove mode (My Picks): a persistent × that removes the pick. It
            stays visible (not hover-only) so it's reachable on touch, but is
            kept small and muted — a quiet dot that only warms to red on
            hover/press — with a tap target expanded well past the visible
            circle so it's easy to hit on purpose yet hard to graze when
            tapping the card to open details.
          - Schedule mode: a hover-revealed caret that opens the details sheet
            (Instagram, bio, etc.) without touching the pick. Hover-only (not
            focus) since clicking the tile to pick it leaves it focused and the
            caret shouldn't linger just because of that. */}
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${name} from your picks`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            "absolute flex items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-red-50 hover:text-red-600 hover:ring-red-200 active:scale-90",
            // Invisible padded hit target (~+16px each side → ~40px) so the
            // deliberate tap is easy while the visible dot stays corner-tucked.
            "before:absolute before:-inset-2 before:content-['']",
            dense ? "bottom-1.5 right-2.5 size-5" : "bottom-3 right-3 size-6",
          )}
        >
          <Icon icon={CancelIcon} size={dense ? 12 : 13} strokeWidth={2.5} />
        </button>
      ) : (
        <button
          type="button"
          aria-label={`View info for ${name}`}
          onClick={(e) => {
            e.stopPropagation();
            onArtistTap();
          }}
          className={cn(
            "absolute flex items-center justify-center rounded-full shadow-sm ring-1 ring-border opacity-0 transition-opacity group-hover:opacity-100",
            filled ? "bg-white/90 text-foreground" : "bg-card text-foreground",
            // Same inset as the photo above (matching the card's own padding),
            // so the caret reads as evenly bordered too, not just tucked into
            // the corner.
            dense ? "bottom-1.5 right-2.5 size-5" : "bottom-3 right-3 size-6",
          )}
        >
          <Icon icon={ChevronRightIcon} size={dense ? 12 : 14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
