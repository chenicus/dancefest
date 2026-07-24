"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Calendar03Icon,
  FavouriteIcon,
  MusicNote01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { fillEmptySlots } from "@/lib/schedule/emptySlots";
import { layoutDay } from "@/lib/schedule/layout";
import { partyArtists, partyToSessions } from "@/lib/schedule/party";
import { dayDateLabel, dayLabel, hourLabel, to12h, toMinutes } from "@/lib/schedule/time";
import { usePicksStore } from "@/lib/store/usePicksStore";
import { STYLE_COLORS, styleTint } from "@/lib/theme";
import type { DanceStyle, FestivalEvent, Session } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import { ArtistSheet } from "./ArtistSheet";
import { SessionCard } from "./SessionCard";

// A 1-hour session's typical rendered height (title + time + tags, plus the
// wrapper's mb-2) — SessionCard's own min-h-[54px] floor is too small to use
// here, since real content already exceeds it; this is the baseline duration
// scaling multiplies from in MySchedule.
const MIN_CARD_HEIGHT = 92;

const ALL_STYLES: DanceStyle[] = ["bachata", "salsa", "kizomba", "zouk"];
const STYLE_ORDER: Record<DanceStyle, number> = { bachata: 0, salsa: 1, kizomba: 2, zouk: 3, other: 4 };

export function ScheduleView({ event }: { event: FestivalEvent }) {
  const router = useRouter();
  const search = useSearchParams();
  const [mounted, setMounted] = useState(false);
  // Multi-select style legend/filter. Empty set = show every style.
  const [styleFilter, setStyleFilter] = useState<Set<DanceStyle>>(new Set());
  const [sheetSession, setSheetSession] = useState<Session | null>(null);
  const { togglePick, picks } = usePicksStore();

  useEffect(() => setMounted(true), []);

  const rawView = search.get("view");
  const view = rawView === "my" ? "my" : "all";
  const day = search.get("day") ?? event.days[0] ?? "";

  // Night DJ lineups live in event.parties as their own PartySet shape (no
  // per-slot end time, no Artist record) — reshape them into Session/Artist
  // tiles so they flow through the exact same picking/grid/sheet pipeline as
  // a workshop. Every DJ room is already one of the event's workshop rooms,
  // so no new grid columns are needed.
  const djArtists = useMemo(() => partyArtists(event.parties ?? []), [event.parties]);
  const partySessions = useMemo(
    () => (event.parties ?? []).flatMap(partyToSessions),
    [event.parties],
  );
  // Drop any pre-existing "party" sessions baked into event.sessions: the
  // canonical night lineup now comes from event.parties (synthesized above,
  // with DJ headshots + Instagram wired in). Without this filter every DJ set
  // renders twice — once from the legacy baked-in copy, once synthesized —
  // stacking two overlapping cards in the same grid cell.
  const allSessions = useMemo(
    () => [...event.sessions.filter((s) => s.type !== "party"), ...partySessions],
    [event.sessions, partySessions],
  );
  const allArtists = useMemo(() => [...event.artists, ...djArtists], [event.artists, djArtists]);
  // Subviews (MobileDayList/DesktopGrid/MySchedule) read sessions/artists/
  // rooms off the `event` they're passed — hand them this merged event so
  // they need no changes of their own to pick up DJ sets.
  const scheduleEvent = useMemo(
    () => ({ ...event, sessions: allSessions, artists: allArtists }),
    [event, allSessions, allArtists],
  );

  const pickedIds = useMemo(
    () => new Set(mounted ? picks.filter((p) => p.eventId === event.id).map((p) => p.sessionId) : []),
    [mounted, picks, event.id],
  );
  const pickedSessions = useMemo(
    () => allSessions.filter((s) => pickedIds.has(s.id)),
    [allSessions, pickedIds],
  );

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(search.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const daySessions = useMemo(() => {
    const filtered = allSessions.filter(
      (s) => s.day === day && (styleFilter.size === 0 || styleFilter.has(s.style)),
    );
    // "Empty" filler reflects genuinely idle room/time combos (computed off
    // the full, unfiltered day) — it stays put regardless of the style
    // filter, since a room isn't "empty" just because its class got filtered.
    // fillEmptySlots already excludes "party" sessions from this range/room
    // computation, so a DJ-only room doesn't get daytime "Empty" filler.
    const empties = fillEmptySlots(allSessions, event.rooms, day);
    return [...filtered, ...empties]
      // Within each time slot, cluster by style so same-genre classes sit
      // together (e.g. two salsa classes adjacent, not interleaved).
      .sort(
        (a, b) =>
          toMinutes(a.start) - toMinutes(b.start) ||
          STYLE_ORDER[a.style] - STYLE_ORDER[b.style] ||
          a.room.localeCompare(b.room),
      );
  }, [allSessions, event.rooms, day, styleFilter]);

  const stylesPresent = useMemo(
    () => ALL_STYLES.filter((st) => allSessions.some((s) => s.style === st)),
    [allSessions],
  );

  function openSheet(session: Session) {
    setSheetSession(session);
  }

  // Removing a pick is now a deliberate tap on the card's × (not a stray tap
  // on the whole tile), but we still make it fully recoverable: after a remove
  // commits, surface an Undo snackbar for a few seconds. togglePick is
  // symmetric, so undo is just toggling the same session back on — and the My
  // Picks list re-sorts it into its correct time slot automatically.
  const [undoSession, setUndoSession] = useState<Session | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function commitRemove(session: Session) {
    togglePick(event.id, session.id);
    setUndoSession(session);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoSession(null), 5000);
  }

  function undoRemove() {
    if (!undoSession) return;
    togglePick(event.id, undoSession.id);
    setUndoSession(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }

  // Clear any pending dismiss timer if the view unmounts mid-countdown.
  useEffect(() => () => void (undoTimer.current && clearTimeout(undoTimer.current)), []);

  // Measured so the per-time-slot sticky labels below know exactly how far
  // to sit from the top — the header's real height varies (the style-filter
  // row only exists in the "all" view), so a hardcoded offset would leave a
  // gap or an overlap depending on which tab you're on. useLayoutEffect (not
  // useEffect) so the correct value is in place before first paint instead
  // of flashing top:0 for a frame.
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderHeight(el.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="flex min-h-dvh flex-col md:h-dvh md:overflow-hidden"
      style={{ background: "var(--event-bg)" }}
    >
      <header ref={headerRef} className="sticky top-0 z-40 border-b border-black/10 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[800px] items-center justify-center gap-3 px-4 pt-3.5">
          <h1 className="wordmark truncate text-lg">{event.name}</h1>
        </div>

        <div className="mx-auto w-full max-w-[800px] px-4 pb-3 pt-3">
          <Segmented
            fullWidth
            rounded="md"
            tone="neutral"
            value={day}
            onChange={(d) => setParam("day", d)}
            options={event.days.map((d) => ({
              value: d,
              "aria-label": `${dayLabel(d)}, ${dayDateLabel(d)}`,
              label: (
                <span className="flex flex-col items-center gap-0.5 py-0.5">
                  <span>{dayLabel(d)}</span>
                  <span
                    className={cn(
                      "text-[11px] font-normal",
                      d === day ? "text-neutral-500" : "text-neutral-400",
                    )}
                  >
                    {dayDateLabel(d)}
                  </span>
                </span>
              ),
            }))}
          />
        </div>

        {view === "all" && stylesPresent.length > 1 && (
          <div className="mx-auto w-full max-w-[800px] overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center justify-center gap-1.5">
              {stylesPresent.map((st) => {
                // Legend + multi-select filter in one: the swatch decodes the card
                // tint, and tapping toggles that style into the view. Empty set
                // shows everything, so with nothing selected every chip reads
                // "on" (the full legend); selecting some dims the rest.
                const anySelected = styleFilter.size > 0;
                const selected = styleFilter.has(st);
                const on = !anySelected || selected;
                const color = STYLE_COLORS[st];
                return (
                  <button
                    key={st}
                    aria-pressed={selected}
                    onClick={() =>
                      setStyleFilter((prev) => {
                        const next = new Set(prev);
                        next.has(st) ? next.delete(st) : next.add(st);
                        return next;
                      })
                    }
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                      on
                        ? "text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                    style={
                      on
                        ? { background: styleTint(st, 0.16), borderColor: styleTint(st, 0.4) }
                        : undefined
                    }
                  >
                    <Icon
                      icon={Tick01Icon}
                      aria-hidden
                      size={18}
                      strokeWidth={2.5}
                      className={cn(
                        "shrink-0 transition-all",
                        on ? "opacity-100" : "scale-90 text-muted-foreground/70 opacity-70",
                      )}
                      style={on ? { color } : undefined}
                    />
                    {st}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full flex-1 bg-neutral-100 px-4 pt-4 md:min-h-0 md:overflow-y-auto">
        {view === "all" && (
          <>
            <MobileDayList
              // The single-column feed has no room columns to leave blank,
              // so "Empty" filler (meant for the grid's idle cells) would
              // just be noise here — every idle room/slot would get its own
              // row. Skip it and let the next real session's heading speak
              // for the gap, same as before.
              sessions={daySessions.filter((s) => s.type !== "empty")}
              event={scheduleEvent}
              pickedIds={pickedIds}
              onToggle={(s) => togglePick(event.id, s.id)}
              onArtistTap={openSheet}
              stickyTop={headerHeight}
            />
            <DesktopGrid
              sessions={daySessions}
              event={scheduleEvent}
              pickedIds={pickedIds}
              onToggle={(s) => togglePick(event.id, s.id)}
              onArtistTap={openSheet}
            />
          </>
        )}
        {view === "my" && (
          <MySchedule
            event={scheduleEvent}
            day={day}
            pickedSessions={pickedSessions.filter((s) => s.day === day)}
            hasAnyPicks={pickedIds.size > 0}
            onRemove={commitRemove}
            onArtistTap={openSheet}
            stickyTop={headerHeight}
          />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <div className="flex items-center gap-2 rounded-full border border-black/[0.06] bg-background/70 p-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.06)] backdrop-blur-xl backdrop-saturate-150">
          <button
            onClick={() => setParam("view", null)}
            aria-label="Schedule"
            aria-current={view === "all" ? "page" : undefined}
            className="group relative flex size-11 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5"
          >
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 rounded-full bg-foreground/[0.06] transition-opacity",
                view === "all" ? "opacity-100" : "opacity-0",
              )}
            />
            <Icon
              icon={Calendar03Icon}
              size={22}
              className={cn(
                "relative transition-colors",
                view === "all" ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
              )}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground/90 px-3 py-1.5 text-xs font-medium text-background opacity-0 transition-opacity group-hover:opacity-100">
              Schedule
            </span>
          </button>
          <button
            onClick={() => setParam("view", "my")}
            aria-label="My picks"
            aria-current={view === "my" ? "page" : undefined}
            className="group relative flex size-11 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5"
          >
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 rounded-full bg-foreground/[0.06] transition-opacity",
                view === "my" ? "opacity-100" : "opacity-0",
              )}
            />
            <Icon
              icon={FavouriteIcon}
              size={22}
              className={cn(
                "relative transition-colors",
                view === "my" ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
              )}
            />
            {mounted && pickedIds.size > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-none text-primary-foreground ring-2 ring-background">
                {pickedIds.size}
              </span>
            )}
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground/90 px-3 py-1.5 text-xs font-medium text-background opacity-0 transition-opacity group-hover:opacity-100">
              My picks
            </span>
          </button>
        </div>
      </nav>

      {/* Undo snackbar — sits just above the bottom nav so it never covers it.
          The outer layer is click-through (pointer-events-none) so it doesn't
          swallow taps on the list beneath; only the pill itself is
          interactive. */}
      {undoSession && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6rem)] z-50 flex justify-center px-4">
          <div
            role="status"
            className="animate-toast-in pointer-events-auto flex items-center gap-3 rounded-full bg-foreground/95 py-2 pl-4 pr-2 text-sm text-background shadow-lg ring-1 ring-black/5 backdrop-blur-xl"
          >
            <span>Removed from picks</span>
            <button
              type="button"
              onClick={undoRemove}
              className="rounded-full bg-background/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-background/25"
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {sheetSession && (
        <ArtistSheet
          session={sheetSession}
          artists={
            sheetSession.artistIds?.length
              ? sheetSession.artistIds.map((id) => ({
                  artist: allArtists.find((a) => a.id === id),
                  name: allArtists.find((a) => a.id === id)?.name ?? sheetSession.instructors[0] ?? "TBA",
                }))
              : sheetSession.instructors.length
                ? sheetSession.instructors.map((name) => ({ name }))
                : [{ name: "TBA" }]
          }
          onClose={() => setSheetSession(null)}
        />
      )}
    </div>
  );
}

interface ListProps {
  sessions: Session[];
  event: FestivalEvent;
  pickedIds: Set<string>;
  onToggle: (s: Session) => void;
  onArtistTap: (s: Session) => void;
}

// Consecutive same-start sessions become one group sharing a single time
// label — a room's worth of 2pm classes reads as one "2 PM" slot, not six.
function groupByStart<T extends { start: string }>(items: T[]) {
  const groups: { start: string; items: T[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.start === item.start) last.items.push(item);
    else groups.push({ start: item.start, items: [item] });
  }
  return groups;
}

function MobileDayList({
  sessions,
  event,
  pickedIds,
  onToggle,
  onArtistTap,
  stickyTop,
}: ListProps & { stickyTop: number }) {
  if (!sessions.length) {
    return <p className="py-16 text-center text-sm text-muted-foreground md:hidden">No sessions this day.</p>;
  }
  return (
    // Same time-gutter layout as My Picks: the time sits in its own indented
    // column instead of a full-width heading row, so both lists read as one
    // consistent calendar shape. Each time slot is its own flex row (rather
    // than one flat grid) so the label can be `sticky` scoped to just that
    // slot's own height — it pins in place while its sessions scroll past,
    // then releases the instant the slot's last card clears the sticky line,
    // handing off to the next slot's label.
    // No overflow-x-hidden here: any ancestor with overflow other than
    // visible becomes the sticky label's containing block, and since that
    // box never scrolls on its own, the label would just sit inert instead
    // of sticking to the real (page/main) scrollport.
    <div className="relative mx-auto max-w-[400px] md:hidden" style={{ ["--sticky-top" as string]: `${stickyTop}px` }}>
      {groupByStart(sessions).map((group, gi) => (
        <div key={group.start} className="flex gap-x-3">
          <div className="sticky top-[var(--sticky-top)] z-10 w-11 shrink-0 self-start pt-3 text-right text-xs font-medium text-muted-foreground md:top-0">
            {to12h(group.start)}
          </div>
          <div className="min-w-0 flex-1">
            {/* Hour-boundary rule, Google Calendar–style: spans only the
                card column, so the time gutter stays its own clean strip. */}
            {gi > 0 && <div aria-hidden className="border-t border-dashed border-border/60" />}
            {group.items.map((s) => (
              <div
                key={s.id}
                style={{
                  // Cards are content-sized by default, so a 2-hour party/
                  // performance slot would render the same height as a
                  // 1-hour workshop. Scale a minimum height off the
                  // session's real duration (using MIN_CARD_HEIGHT for a
                  // typical 1-hour session as the baseline, same as My
                  // Picks below) so longer sessions read as visibly taller.
                  minHeight: `${Math.max(MIN_CARD_HEIGHT, ((toMinutes(s.end) - toMinutes(s.start)) / 60) * MIN_CARD_HEIGHT)}px`,
                }}
                className="mb-2 min-w-0"
              >
                <SessionCard
                  session={s}
                  artists={event.artists}
                  picked={pickedIds.has(s.id)}
                  showTimes
                  onToggle={() => onToggle(s)}
                  onArtistTap={() => onArtistTap(s)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DesktopGrid({
  sessions,
  event,
  pickedIds,
  onToggle,
  onArtistTap,
}: ListProps) {
  // Columns = event rooms that have at least one session somewhere (stable
  // across days), so genuinely-empty rooms never render a blank column.
  const populated = new Set(event.sessions.map((s) => s.room));
  const rooms = (event.rooms.length ? event.rooms : [...new Set(sessions.map((s) => s.room))]).filter((r) =>
    populated.has(r),
  );
  const grid = layoutDay(sessions, rooms);
  const bodyRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  // The header/corner divider only reads as "real" once there's actually
  // content scrolled underneath it — at rest (scrollTop 0) it's just a bare
  // line floating above the first row for no reason.
  const [scrolled, setScrolled] = useState(false);

  // The body pane is the only one the user actually scrolls (both axes);
  // the header and time panes just mirror its position. This — rather than
  // position:sticky inside one 2-axis scroll container — sidesteps a real
  // Chrome rendering bug where a sticky cell's hit-testing/layout is correct
  // but it fails to repaint over card content scrolling underneath it, so a
  // sliver of the previous room/hour bleeds through next to the frozen
  // column/row. Three independent single-axis scroll containers can't hit
  // that bug: nothing here needs to be sticky at all.
  function syncFromBody() {
    const body = bodyRef.current;
    if (!body) return;
    if (headerRef.current) headerRef.current.scrollLeft = body.scrollLeft;
    if (timeRef.current) timeRef.current.scrollTop = body.scrollTop;
    setScrolled(body.scrollTop > 0);
  }

  if (!sessions.length) {
    return <p className="hidden py-16 text-center text-sm text-muted-foreground md:block">No sessions this day.</p>;
  }
  const hourRows: number[] = [];
  for (let m = Math.ceil(grid.startMinutes / 60) * 60; m < grid.endMinutes; m += 60) {
    hourRows.push(m);
  }

  const columnsTemplate = `repeat(${rooms.length}, minmax(168px, 1fr))`;
  const minWidth = `${rooms.length * 176}px`;

  return (
    <div
      className="hidden md:grid md:h-full"
      style={{ gridTemplateColumns: "52px 1fr", gridTemplateRows: "auto 1fr" }}
    >
      {/* Corner: fixed, never scrolls — the one truly static piece. */}
      <div
        className={cn("bg-neutral-100 transition-colors", scrolled && "border-b border-border")}
        style={{ gridColumn: 1, gridRow: 1 }}
      />

      {/* Room headers: horizontal scroll only, mirrored from the body. */}
      <div ref={headerRef} className="overflow-hidden" style={{ gridColumn: 2, gridRow: 1 }}>
        <div className="grid gap-x-2" style={{ minWidth, gridTemplateColumns: columnsTemplate }}>
          {rooms.map((r, i) => (
            <div
              key={r}
              className={cn(
                "bg-neutral-100 py-2 text-center text-xs font-medium text-muted-foreground transition-colors",
                scrolled && "border-b border-border",
              )}
              style={{ gridColumn: i + 1 }}
            >
              {r}
            </div>
          ))}
        </div>
      </div>

      {/* Time labels: vertical scroll only, mirrored from the body. */}
      <div ref={timeRef} className="overflow-hidden" style={{ gridColumn: 1, gridRow: 2 }}>
        <div className="grid" style={{ gridTemplateRows: `repeat(${grid.slotCount}, 19px)` }}>
          {hourRows.map((m) => (
            <div
              key={m}
              className="bg-neutral-100 pr-2 text-right text-[11px] text-muted-foreground"
              style={{ gridRow: Math.floor((m - grid.startMinutes) / 15) + 1 }}
            >
              {hourLabel(m)}
            </div>
          ))}
        </div>
      </div>

      {/* Body: the only pane with real (both-axis) scroll. */}
      <div ref={bodyRef} onScroll={syncFromBody} className="overflow-auto" style={{ gridColumn: 2, gridRow: 2 }}>
        <div
          className="grid gap-x-2"
          style={{
            minWidth,
            gridTemplateColumns: columnsTemplate,
            gridTemplateRows: `repeat(${grid.slotCount}, 19px)`,
          }}
        >
          {grid.placements.map(({ session: s, column, rowStart, rowEnd, stackIndex, colSpan }) => (
            <div
              key={s.id}
              style={{
                // layoutDay numbers columns/rows assuming a leading time
                // column and header row (col 1 = time axis, row 1 = header);
                // this pane has neither, so shift both back by one.
                gridColumn: colSpan > 1 ? `${column - 1} / span ${colSpan}` : column - 1,
                gridRow: `${rowStart - 1} / ${rowEnd - 1}`,
                marginTop: stackIndex * 6,
                marginLeft: stackIndex * 6,
              }}
              className="py-1"
            >
              <SessionCard
                session={s}
                artists={event.artists}
                picked={pickedIds.has(s.id)}
                showTimes
                showRoom={false}
                dense
                onToggle={() => onToggle(s)}
                onArtistTap={() => onArtistTap(s)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MySchedule({
  event,
  day,
  pickedSessions,
  hasAnyPicks,
  onRemove,
  onArtistTap,
  stickyTop,
}: {
  event: FestivalEvent;
  day: string;
  pickedSessions: Session[];
  hasAnyPicks: boolean;
  onRemove: (s: Session) => void;
  onArtistTap: (s: Session) => void;
  stickyTop: number;
}) {
  // Removing a pick unmounts its card immediately (it drops out of
  // pickedSessions), which would otherwise just pop out of the list. Track
  // ids mid-removal so we can slide + fade them out first, then let the
  // actual store update (onRemove) land once the animation has finished.
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const REMOVE_DURATION = 220;

  function handleRemove(s: Session) {
    setRemovingIds((prev) => new Set(prev).add(s.id));
    setTimeout(() => {
      onRemove(s);
      // Clear the id once it's committed and gone from the list. If the user
      // hits Undo, the session returns to pickedSessions with a clean slate
      // (not stuck in the slid-out state) and simply appears back in place.
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(s.id);
        return next;
      });
    }, REMOVE_DURATION);
  }

  if (!pickedSessions.length) {
    return (
      <div className="py-20 text-center">
        <p className="font-medium">{hasAnyPicks ? `No picks for ${dayLabel(day)}` : "Nothing picked yet"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasAnyPicks
            ? "Switch days above to see your other picks."
            : "Tap sessions in the schedule to build your day."}
        </p>
      </div>
    );
  }
  const groups = groupByStart([...pickedSessions].sort((a, b) => toMinutes(a.start) - toMinutes(b.start)));
  return (
    // Each time slot is its own flex row so its label can be `sticky`
    // scoped to just that slot's own height (see MobileDayList above for
    // the full explanation) — pins while its picks scroll past, then hands
    // off to the next slot. md:top-0: on desktop <main> scrolls independently
    // below a static header (they no longer overlap), so the label only
    // needs to clear the header's height on mobile, where the whole page
    // scrolls as one and the sticky header stays on screen throughout.
    // overflow-x-hidden lives on the card column below (not here) — any
    // ancestor of the sticky label with overflow other than visible becomes
    // its containing block, and since that box never scrolls on its own the
    // label would just sit inert instead of sticking to the real scrollport.
    <div className="relative mx-auto mt-6 max-w-[400px]" style={{ ["--sticky-top" as string]: `${stickyTop}px` }}>
      {groups.map((group, gi) => (
        <div key={group.start} className="flex gap-x-3">
          <div className="sticky top-[var(--sticky-top)] z-10 w-11 shrink-0 self-start pt-3 text-right text-xs font-medium text-muted-foreground md:top-0">
            {to12h(group.start)}
          </div>
          {/* overflow-x-hidden here (not on an ancestor of the sticky label
              above) clips the remove animation's translate-x-full slide-out
              without breaking that label's stickiness. */}
          <div className="min-w-0 flex-1 overflow-x-hidden">
            {/* Hour-boundary rule, Google Calendar–style: spans only the
                card column, so the time gutter stays its own clean strip. */}
            {gi > 0 && <div aria-hidden className="border-t border-dashed border-border/60" />}
            {group.items.map((s) => {
              const removing = removingIds.has(s.id);
              return (
                <div
                  key={s.id}
                  style={{
                    transitionDuration: `${REMOVE_DURATION}ms`,
                    // Cards are content-sized by default, so a 2-hour party
                    // slot renders the same height as a 1-hour class. Scale a
                    // minimum height off the session's real duration (using
                    // MIN_CARD_HEIGHT for a typical 1-hour session as the
                    // baseline) so longer sessions read as visibly taller.
                    minHeight: `${Math.max(MIN_CARD_HEIGHT, ((toMinutes(s.end) - toMinutes(s.start)) / 60) * MIN_CARD_HEIGHT)}px`,
                  }}
                  className={cn(
                    "mb-2 min-w-0 transition-all ease-in",
                    removing ? "translate-x-full opacity-0" : "translate-x-0 opacity-100",
                  )}
                >
                  <SessionCard
                    session={s}
                    artists={event.artists}
                    picked
                    showTimes
                    softPicked
                    onRemove={() => handleRemove(s)}
                    onArtistTap={() => onArtistTap(s)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

