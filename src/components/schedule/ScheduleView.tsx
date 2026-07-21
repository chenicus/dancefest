"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft01Icon,
  Calendar03Icon,
  FavouriteIcon,
  MusicNote01Icon,
} from "@hugeicons/core-free-icons";
import { fillEmptySlots } from "@/lib/schedule/emptySlots";
import { layoutDay } from "@/lib/schedule/layout";
import { dayDateLabel, dayLabel, hourLabel, to12h, toMinutes } from "@/lib/schedule/time";
import { usePicksStore } from "@/lib/store/usePicksStore";
import { STYLE_COLORS, styleTint } from "@/lib/theme";
import type { DanceStyle, FestivalEvent, Party, Session } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import { buttonVariants } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import { ArtistSheet } from "./ArtistSheet";
import { SessionCard } from "./SessionCard";

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

  const pickedIds = useMemo(
    () => new Set(mounted ? picks.filter((p) => p.eventId === event.id).map((p) => p.sessionId) : []),
    [mounted, picks, event.id],
  );
  const pickedSessions = useMemo(
    () => event.sessions.filter((s) => pickedIds.has(s.id)),
    [event.sessions, pickedIds],
  );

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(search.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const daySessions = useMemo(() => {
    const filtered = event.sessions.filter(
      (s) => s.day === day && (styleFilter.size === 0 || styleFilter.has(s.style)),
    );
    // "Empty" filler reflects genuinely idle room/time combos (computed off
    // the full, unfiltered day) — it stays put regardless of the style
    // filter, since a room isn't "empty" just because its class got filtered.
    const empties = fillEmptySlots(event.sessions, event.rooms, day);
    return [...filtered, ...empties]
      // Within each time slot, cluster by style so same-genre classes sit
      // together (e.g. two salsa classes adjacent, not interleaved).
      .sort(
        (a, b) =>
          toMinutes(a.start) - toMinutes(b.start) ||
          STYLE_ORDER[a.style] - STYLE_ORDER[b.style] ||
          a.room.localeCompare(b.room),
      );
  }, [event.sessions, event.rooms, day, styleFilter]);

  const stylesPresent = useMemo(
    () => ALL_STYLES.filter((st) => event.sessions.some((s) => s.style === st)),
    [event.sessions],
  );

  function openSheet(session: Session) {
    setSheetSession(session);
  }

  return (
    <div
      className="flex min-h-dvh flex-col md:h-dvh md:overflow-hidden"
      style={{ background: "var(--event-bg)" }}
    >
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 pt-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/"
              aria-label="All events"
              className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "-ml-1.5 shrink-0")}
            >
              <Icon icon={ArrowLeft01Icon} size={20} />
            </Link>
            <h1 className="wordmark truncate text-lg">{event.name}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <span
              aria-hidden
              className="size-2.5 rounded-full ring-2 ring-background"
              style={{ background: "var(--event-accent)" }}
            />
          </div>
        </div>

        <div className="mx-auto w-full max-w-5xl px-4 pb-3 pt-3">
          <Segmented
            fullWidth
            rounded="md"
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
                      d === day ? "text-muted-foreground" : "text-muted-foreground/70",
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
          <div className="mx-auto w-full max-w-5xl overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center gap-1.5">
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
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
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
                    <span
                      aria-hidden
                      className="size-2 rounded-full ring-1 ring-inset ring-black/10"
                      style={{ background: color }}
                    />
                    {st}
                  </button>
                );
              })}
              {styleFilter.size > 0 && (
                <button
                  onClick={() => setStyleFilter(new Set())}
                  className="ml-0.5 shrink-0 rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-2 md:min-h-0">
        {view === "all" && (
          <>
            <MobileDayList
              // The single-column feed has no room columns to leave blank,
              // so "Empty" filler (meant for the grid's idle cells) would
              // just be noise here — every idle room/slot would get its own
              // row. Skip it and let the next real session's heading speak
              // for the gap, same as before.
              sessions={daySessions.filter((s) => s.type !== "empty")}
              event={event}
              pickedIds={pickedIds}
              onToggle={(s) => togglePick(event.id, s.id)}
              onArtistTap={openSheet}
            />
            <DesktopGrid
              sessions={daySessions}
              event={event}
              pickedIds={pickedIds}
              onToggle={(s) => togglePick(event.id, s.id)}
              onArtistTap={openSheet}
            />
          </>
        )}
        {view === "my" && (
          <MySchedule
            event={event}
            day={day}
            pickedSessions={pickedSessions.filter((s) => s.day === day)}
            hasAnyPicks={pickedIds.size > 0}
            onToggle={(s) => togglePick(event.id, s.id)}
            onArtistTap={openSheet}
          />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <div className="flex items-center gap-2 rounded-full border border-black/[0.06] bg-background/70 p-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.06)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10">
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

      {sheetSession && (
        <ArtistSheet
          session={sheetSession}
          artists={
            sheetSession.artistIds?.length
              ? sheetSession.artistIds.map((id) => ({
                  artist: event.artists.find((a) => a.id === id),
                  name: event.artists.find((a) => a.id === id)?.name ?? sheetSession.instructors[0] ?? "TBA",
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

function MobileDayList({ sessions, event, pickedIds, onToggle, onArtistTap }: ListProps) {
  let lastStart = "";
  if (!sessions.length) {
    return <p className="py-16 text-center text-sm text-muted-foreground md:hidden">No sessions this day.</p>;
  }
  return (
    <div className="md:hidden">
      {sessions.map((s) => {
        const heading = s.start !== lastStart ? s.start : null;
        lastStart = s.start;
        return (
          <div key={s.id}>
            {heading && (
              <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {to12h(heading)}
              </p>
            )}
            <div className="mb-2">
              <SessionCard
                session={s}
                artists={event.artists}
                picked={pickedIds.has(s.id)}
                onToggle={() => onToggle(s)}
                onArtistTap={() => onArtistTap(s)}
              />
            </div>
          </div>
        );
      })}
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
  if (!sessions.length) {
    return <p className="hidden py-16 text-center text-sm text-muted-foreground md:block">No sessions this day.</p>;
  }
  const hourRows: number[] = [];
  for (let m = Math.ceil(grid.startMinutes / 60) * 60; m < grid.endMinutes; m += 60) {
    hourRows.push(m);
  }
  return (
    <div
      className="hidden overflow-auto md:block md:h-full"
      // The grid needs its own scroll container (horizontal for rooms,
      // vertical for hours) so its room-header row can stick to *its* top
      // via plain `sticky top-0`. Page-level sticky can't reach in here:
      // this div's overflow-x already makes it a scroll container, which
      // cuts descendant sticky positioning off from the page scroll — so
      // instead of fighting that, it gets the exact remaining viewport
      // height from its flex ancestors (see the md:h-dvh root) and scrolls
      // on its own, right below the page header.
    >
      <div
        className="grid gap-x-2"
        style={{
          minWidth: `${52 + rooms.length * 176}px`,
          gridTemplateColumns: `52px repeat(${rooms.length}, minmax(168px, 1fr))`,
          gridTemplateRows: `auto repeat(${grid.slotCount}, 19px)`,
        }}
      >
        {/* Corner cell: pinned on BOTH axes (top-0 left-0) so it stays put
            through horizontal and vertical scroll alike — anything sticky on
            only one axis would slide out from under it and expose whatever
            is scrolling underneath at that corner. */}
        <div
          className="sticky top-0 left-0 z-30 border-b border-border bg-background shadow-[0_1px_0_0_var(--background)]"
          style={{ gridColumn: 1, gridRow: 1 }}
        />
        {rooms.map((r, i) => (
          <div
            key={r}
            // z-30, above the time column's z-20: this row scrolls over the
            // time labels below it, and needs to fully occlude them rather
            // than let a label's row peek out from underneath as it passes.
            // The shadow paints an extra 1px strip of solid background right
            // below the cell's own box — subpixel rounding on sticky+grid
            // can otherwise leave a hairline gap where the scrolling row
            // underneath peeks through.
            className="sticky top-0 z-30 border-b border-border bg-background py-2 text-center text-xs font-medium text-muted-foreground shadow-[0_1px_0_0_var(--background)]"
            style={{ gridColumn: i + 2, gridRow: 1 }}
          >
            {r}
          </div>
        ))}
        {hourRows.map((m) => (
          <div
            key={m}
            // sticky left-0 only (no top): pinned horizontally so it survives
            // room-column scrolling, but still scrolls normally with its row
            // vertically — the room header row above handles pinning that axis.
            className="sticky left-0 z-20 bg-background pr-2 text-right text-[11px] text-muted-foreground"
            style={{ gridColumn: 1, gridRow: Math.floor((m - grid.startMinutes) / 15) + 2 }}
          >
            {hourLabel(m)}
          </div>
        ))}
        {grid.placements.map(({ session: s, column, rowStart, rowEnd, stackIndex }) => (
          <div
            key={s.id}
            style={{
              gridColumn: column,
              gridRow: `${rowStart} / ${rowEnd}`,
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
  );
}

function MySchedule({
  event,
  day,
  pickedSessions,
  hasAnyPicks,
  onToggle,
  onArtistTap,
}: {
  event: FestivalEvent;
  day: string;
  pickedSessions: Session[];
  hasAnyPicks: boolean;
  onToggle: (s: Session) => void;
  onArtistTap: (s: Session) => void;
}) {
  // Removing a pick unmounts its card immediately (it drops out of
  // pickedSessions), which would otherwise just pop out of the list. Track
  // ids mid-removal so we can slide + fade them out first, then let the
  // actual store update (onToggle) land once the animation has finished.
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const REMOVE_DURATION = 220;

  function handleRemove(s: Session) {
    setRemovingIds((prev) => new Set(prev).add(s.id));
    setTimeout(() => onToggle(s), REMOVE_DURATION);
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
  return (
    <div className="overflow-x-hidden">
      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {dayLabel(day)} · {dayDateLabel(day)}
      </p>
      {[...pickedSessions]
        .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
        .map((s) => {
          const removing = removingIds.has(s.id);
          return (
            <div
              key={s.id}
              style={{ transitionDuration: `${REMOVE_DURATION}ms` }}
              className={cn(
                "mb-2 transition-all ease-in",
                removing ? "translate-x-full opacity-0" : "translate-x-0 opacity-100",
              )}
            >
              <SessionCard
                session={s}
                artists={event.artists}
                picked
                showTimes
                softPicked
                onToggle={() => handleRemove(s)}
                onArtistTap={() => onArtistTap(s)}
              />
            </div>
          );
        })}
    </div>
  );
}

