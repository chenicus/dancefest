"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Calendar03Icon,
  CancelIcon,
  FavouriteIcon,
  InformationCircleIcon,
  MusicNote01Icon,
} from "@hugeicons/core-free-icons";
import { fillEmptySlots } from "@/lib/schedule/emptySlots";
import { nextCollapse } from "@/lib/schedule/headerCollapse";
import { layoutDay } from "@/lib/schedule/layout";
import { partyArtists, partyToSessions } from "@/lib/schedule/party";
import { resolvePicks } from "@/lib/schedule/resolvePicks";
import { dayDateLabel, dayLabel, dayNumLabel, hourLabel, to12h, toMinutes } from "@/lib/schedule/time";
import { usePicksStore } from "@/lib/store/usePicksStore";
import type { DanceStyle, FestivalEvent, Session } from "@/lib/types";
import { darken, STYLE_COLORS, styleTint } from "@/lib/theme";
import { CheckIcon, Icon } from "@/components/ui/icon";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import { ArtistSheet } from "./ArtistSheet";
import { InfoSheet } from "./InfoSheet";
import { PickChangesSheet } from "./PickChangesSheet";
import { PickCoachTip } from "./PickCoachTip";
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
  // Multi-select style legend/filter. Tracks styles the user has tapped OFF
  // (not the ones shown) — everything starts selected, so an empty set here
  // means "show every style" with no second state to fall back to. Toggling
  // a style just adds/removes it from this set directly; the visual "on"
  // state below is its exact inverse, so what you see is always what tapping
  // it will do, with no separate "nothing chosen yet" mode to fight through.
  const [excludedStyles, setExcludedStyles] = useState<Set<DanceStyle>>(new Set());
  const [sheetSession, setSheetSession] = useState<Session | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const {
    togglePick,
    picks,
    removePick,
    relinkPick,
    dismissedChangeIds,
    dismissChanges,
    coachSeen,
    markCoachSeen,
  } = usePicksStore();

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

  // Session ids are content hashes, so a class that changes room or time gets
  // a new one and its pick's stored id goes stale. resolvePicks re-finds those
  // classes by artist rather than dropping them; only a class that's genuinely
  // gone comes back orphaned (and gets surfaced via PickChangesSheet).
  const { resolved, orphaned: orphanedPicks } = useMemo(
    () =>
      mounted
        ? resolvePicks(
            picks.filter((p) => p.eventId === event.id),
            allSessions,
          )
        : { resolved: [], orphaned: [] },
    [mounted, picks, event.id, allSessions],
  );

  const pickedSessions = useMemo(() => resolved.map((r) => r.session), [resolved]);
  const pickedIds = useMemo(() => new Set(pickedSessions.map((s) => s.id)), [pickedSessions]);
  // Only picks still pointing at a real session count toward the nav badge, so
  // a dropped class never leaves the badge overstating the schedule.
  const validPickedCount = resolved.length;

  // Persist re-matches so the next sync starts from the class's current
  // details instead of re-deriving from an increasingly stale snapshot. The
  // relinked pick then matches by id, so this settles after one pass.
  useEffect(() => {
    for (const r of resolved) {
      if (r.relinked) relinkPick(r.pick.sessionId, r.session);
    }
  }, [resolved, relinkPick]);
  // Dismissing the banner mutes it for these specific changed picks (not a
  // delete — see PicksState.dismissedChangeIds) until a *new* change appears.
  // Picks with no snapshot (saved before snapshots existed) are skipped: the
  // sheet has nothing to show for them, so counting them would put a number in
  // the banner that opens onto an empty list.
  const visibleOrphanedPicks = useMemo(
    () => orphanedPicks.filter((p) => p.snapshot && !dismissedChangeIds.includes(p.sessionId)),
    [orphanedPicks, dismissedChangeIds],
  );

  // The one-time "Saved here" tip is anchored to the measured nav heart, so
  // the nav needs a ref for the tip to point at.
  const navHeartRef = useRef<HTMLButtonElement>(null);
  const [coachAnchor, setCoachAnchor] = useState<{ x: number; top: number } | null>(null);

  // Bumping this remounts the pick-count badge, which restarts its CSS pop
  // animation — a plain class toggle wouldn't replay on consecutive changes,
  // since the class never leaves the element between them.
  const [pickBump, setPickBump] = useState(0);
  const prevPickCount = useRef<number | null>(null);
  useEffect(() => {
    if (!mounted) return;
    const count = validPickedCount;
    // The first post-hydration run only seeds the baseline: picks restored
    // from localStorage aren't new, so without this the badge would pop on
    // every single page load.
    if (prevPickCount.current !== null && count !== prevPickCount.current) {
      setPickBump((b) => b + 1);
    }
    prevPickCount.current = count;
  }, [mounted, validPickedCount]);

  // Acting on the tip retires it: once you're in My picks, a bubble still
  // pointing at the heart is telling you to do what you just did.
  useEffect(() => {
    if (view === "my") setCoachAnchor(null);
  }, [view]);

  function handleToggle(session: Session) {
    const adding = !pickedIds.has(session.id);
    togglePick(event.id, session);
    if (!adding) return;

    // Their very first pick anywhere — not just their first this session, so
    // someone returning with a saved schedule is never re-taught.
    if (coachSeen || picks.length > 0) return;
    markCoachSeen();

    // The tip's tail points at the heart icon itself, centred — measured
    // rather than assumed, since the nav pill holds two buttons and its own
    // centre lands in the gap between them.
    const r = navHeartRef.current?.getBoundingClientRect();
    if (r) setCoachAnchor({ x: r.left + r.width / 2, top: r.top });
  }

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(search.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const daySessions = useMemo(() => {
    const filtered = allSessions.filter(
      // Styles with no filter chip at all (the catch-all "other") have no way
      // to be excluded, so they always pass through.
      (s) => s.day === day && !excludedStyles.has(s.style),
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
  }, [allSessions, event.rooms, day, excludedStyles]);

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
    togglePick(event.id, session);
    setUndoSession(session);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoSession(null), 3000);
  }

  function undoRemove() {
    if (!undoSession) return;
    togglePick(event.id, undoSession);
    setUndoSession(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }

  // Clear any pending dismiss timer if the view unmounts mid-countdown.
  useEffect(() => () => void (undoTimer.current && clearTimeout(undoTimer.current)), []);

  // Measured so the per-time-slot sticky labels below know exactly how far
  // to sit from the top — the header's real height varies (the style-filter
  // row only exists in the "all" view, and the whole thing condenses on
  // scroll), so a hardcoded offset would leave a gap or an overlap depending
  // on which tab you're on. useLayoutEffect (not useEffect) so the correct
  // value is in place before first paint instead of flashing top:0.
  //
  // The measurement is pushed straight onto :root as a CSS variable rather
  // than held in React state: the condense animation resizes the header on
  // every frame it runs, and routing that through setState would re-render
  // the entire session list ~12 times per collapse. A custom property
  // inherits down to the sticky labels for free, so the labels track the
  // header exactly with zero React work.
  const headerRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () =>
      document.documentElement.style.setProperty(
        "--sticky-top",
        `${el.getBoundingClientRect().height}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Condensed header: scrolling down drops the wordmark row and folds the day
  // tabs onto one line, reclaiming ~104px — over a full session card on a
  // phone. Any upward scroll brings the full header straight back.
  //
  // Direction-driven, so the header is never more than a flick away — except
  // in the zones at either end of the page, where the header's own resizing
  // moves the scroll ceiling and direction stops meaning anything. See
  // nextCollapse for why that feeds back on itself and how the zones break it.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    let queued = false;
    let lastY = window.scrollY;
    const read = () => {
      queued = false;
      // Desktop never collapses: <main> scrolls inside a fixed-height shell
      // there, so window.scrollY is pinned at 0 and there's nothing to react
      // to — and vertical space isn't scarce on a laptop anyway.
      if (window.matchMedia("(min-width: 768px)").matches) return setCollapsed(false);
      const next = nextCollapse({
        y: window.scrollY,
        max: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
        lastY,
      });
      lastY = next.lastY;
      if (next.collapsed !== null) setCollapsed(next.collapsed);
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);


  return (
    <div
      className="flex min-h-dvh flex-col md:h-dvh md:overflow-hidden"
      style={{ background: "var(--event-bg)" }}
    >
      <header ref={headerRef} className="sticky top-0 z-40 border-b border-black/10 bg-background">
        {/* Collapsing rows animate max-height, not grid-template-rows 1fr→0fr.
            The grid trick is tidier on paper but `fr` distributes *free* space,
            and an auto-height grid has none — the row can resolve to 0px and
            stay there, so the header collapses fine and never comes back.
            (Observed in Chrome; Safari's grid-row interpolation is shakier
            still, and iOS Safari is the primary target here.)

            The ceilings below sit just above each row's real content height —
            loose enough that a padding tweak can't clip the row, tight enough
            that little of the 200ms is spent animating empty space. */}
        <div
          className={cn(
            "overflow-hidden transition-[max-height,opacity] duration-200 ease-out",
            collapsed ? "max-h-0 opacity-0" : "max-h-[56px] opacity-100",
          )}
        >
          <div>
            <div className="mx-auto flex w-full max-w-[400px] items-center justify-between gap-3 px-4 pt-3.5 md:max-w-[800px]">
              <h1 className="wordmark truncate text-lg">{event.name}</h1>
              <button
                type="button"
                onClick={() => setInfoOpen(true)}
                aria-label="Festival info"
                tabIndex={collapsed ? -1 : undefined}
                className="-mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Icon icon={InformationCircleIcon} size={22} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>

        {/* Condensed, this row is the whole header: just the day tabs. Info
            goes with the wordmark rather than relocating here — a flick up
            brings the full header back, so it's never more than a gesture
            away, and a lone icon beside the tabs would only reintroduce
            clutter the collapse exists to remove. */}
        <div
          className={cn(
            "mx-auto w-full max-w-[400px] px-4 transition-[padding] duration-200 ease-out md:max-w-[800px]",
            collapsed ? "pb-2 pt-2" : "pb-3 pt-3",
          )}
        >
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
                  {/* Condensed, the date rejoins the weekday on one line —
                      losing it entirely would strand anyone who navigates by
                      date rather than by day name. The middot keeps "Fri" and
                      "24" reading as two facts rather than one odd token. */}
                  <span>{collapsed ? `${dayLabel(d)} · ${dayNumLabel(d)}` : dayLabel(d)}</span>
                  <span
                    className={cn(
                      "block overflow-hidden text-xs font-normal transition-[max-height,opacity] duration-200 ease-out",
                      collapsed ? "max-h-0 opacity-0" : "max-h-6 opacity-100",
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

        {/* The style chips stay put through the collapse. They're the only
            on-screen record of what's been filtered out, and a hidden chip row
            plus a missing style reads as "no salsa today" rather than "you
            filtered it out". */}
        {view === "all" && stylesPresent.length > 1 && (
          <div className="mx-auto w-full max-w-[800px] overflow-x-auto overflow-y-hidden px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center justify-center gap-1.5">
              {stylesPresent.map((st) => {
                // Plain toggle, no separate "nothing chosen" mode: every style
                // starts on, and tapping its chip removes it from view — the
                // chip's own checked state (not a style color) is the only
                // thing marking that.
                const on = !excludedStyles.has(st);
                const color = STYLE_COLORS[st];
                return (
                  <button
                    key={st}
                    aria-pressed={on}
                    onClick={() =>
                      setExcludedStyles((prev) => {
                        const next = new Set(prev);
                        next.has(st) ? next.delete(st) : next.add(st);
                        return next;
                      })
                    }
                    className={cn(
                      // Park Daddy's filter-chip pattern: the check isn't faded,
                      // it's unmounted — the pill itself snaps narrower when a
                      // style drops out instead of leaving a dimmed icon-shaped
                      // gap. A quick tap-down scale is the only motion, so the
                      // toggle reads as a physical press rather than a fade.
                      // Off state keeps the exact same border/fill/text as on —
                      // the checkmark's presence is the only signal. The chip
                      // wears its own style color (tint fill, tinted border,
                      // darkened label) so the row doubles as the legend for
                      // the card tints, same as the cards themselves.
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-all active:scale-[0.93]",
                    )}
                    style={{
                      background: styleTint(st, 0.16),
                      borderColor: styleTint(st, 0.4),
                      color: darken(color),
                    }}
                  >
                    {on && <CheckIcon size={16} className="-ml-0.5" />}
                    {st}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* The nav pill is fixed, so it floats over the end of the feed — without
          this the last card is permanently half-covered. Clearing the pill
          (~5rem incl. its own bottom offset) plus a card's worth of slack also
          gives the collapsing header somewhere to give back the height it
          takes, so reaching the bottom doesn't fight the scroll ceiling. */}
      <main className="mx-auto w-full flex-1 bg-neutral-100 px-4 pb-[calc(env(safe-area-inset-bottom)+9rem)] pt-4 md:min-h-0 md:overflow-y-auto">
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
              onToggle={handleToggle}
              onArtistTap={openSheet}
            />
            <DesktopGrid
              sessions={daySessions}
              event={scheduleEvent}
              pickedIds={pickedIds}
              onToggle={handleToggle}
              onArtistTap={openSheet}
            />
          </>
        )}
        {view === "my" && (
          <>
            {visibleOrphanedPicks.length > 0 && (
              <div className="mx-auto mb-3 flex w-full max-w-[400px] items-center gap-1 rounded-2xl border border-amber-300/60 bg-amber-50 py-1 pl-3.5 pr-1.5 text-sm text-amber-900">
                <button
                  type="button"
                  onClick={() => setChangesOpen(true)}
                  className="flex-1 py-1.5 text-left font-semibold underline underline-offset-2"
                >
                  {visibleOrphanedPicks.length} pick{visibleOrphanedPicks.length > 1 ? "s" : ""} no longer scheduled
                </button>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => dismissChanges(visibleOrphanedPicks.map((p) => p.sessionId))}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-amber-900/60 transition-colors hover:bg-amber-100 hover:text-amber-900"
                >
                  <Icon icon={CancelIcon} size={14} strokeWidth={2.5} />
                </button>
              </div>
            )}
            <MySchedule
              event={scheduleEvent}
              day={day}
              pickedSessions={pickedSessions.filter((s) => s.day === day)}
              hasAnyPicks={validPickedCount > 0}
              onRemove={commitRemove}
              onArtistTap={openSheet}
            />
          </>
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
            ref={navHeartRef}
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
            {mounted && validPickedCount > 0 && (
              <span
                // Remount on every added pick so the pop replays (see pickBump).
                key={pickBump}
                className={cn(
                  "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold leading-none text-primary-foreground ring-2 ring-background",
                  // Only dress the badge with the animation once a pick has
                  // actually changed this session. The classes can't be
                  // unconditional: the badge also mounts on page load when
                  // picks are restored from localStorage, and a CSS animation
                  // fires on mount whether or not anything changed — so it
                  // would pop every time the app opened.
                  pickBump > 0 && "animate-badge-pop",
                )}
              >
                <span className={cn(pickBump > 0 && "animate-badge-digit")}>
                  {validPickedCount}
                </span>
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
      {/* Rendered here (a sibling of the nav, outside the scrolling main) so
          it isn't clipped by the feed's overflow on desktop. */}
      {coachAnchor && <PickCoachTip anchor={coachAnchor} onDone={() => setCoachAnchor(null)} />}

      {undoSession && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6rem)] z-50 flex justify-center px-4">
          <div
            role="status"
            className="animate-toast-in pointer-events-auto flex items-center gap-3 rounded-full bg-foreground/95 py-2 pl-4 pr-2 text-sm text-background shadow-lg ring-1 ring-black/5 backdrop-blur-xl"
          >
            <span>Removed</span>
            <button
              type="button"
              onClick={undoRemove}
              className="rounded-full bg-background/15 px-3 py-1 text-xs font-semibold tracking-wide transition-colors hover:bg-background/25"
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

      {infoOpen && <InfoSheet event={event} onClose={() => setInfoOpen(false)} />}

      {changesOpen && (
        <PickChangesSheet
          changes={visibleOrphanedPicks}
          onDismiss={removePick}
          onClearAll={() => visibleOrphanedPicks.forEach((p) => removePick(p.sessionId))}
          onClose={() => setChangesOpen(false)}
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
}: ListProps) {
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
    <div className="relative mx-auto max-w-[400px] md:hidden">
      {groupByStart(sessions).map((group, gi) => (
        <div key={group.start} className="flex gap-x-1">
          <div className="sticky top-[var(--sticky-top,0px)] z-10 w-12 shrink-0 self-start pt-3 text-left text-xs font-medium text-muted-foreground md:top-0">
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
                // grid (not a plain block box): SessionCard fills this box
                // with `h-full`, same as it does inside DesktopGrid's actual
                // CSS grid cells — but a percentage height only resolves
                // against a parent with a *definite* height, and `minHeight`
                // alone leaves a block box's used height "auto" as far as
                // that child percentage is concerned. On sparse cards
                // (parties/DJ sets) the tint collapsed to content height and
                // the reserved space below rendered as a blank gap. Grid
                // track sizing resolves a definite pixel size up front, so a
                // single-cell grid here gives `h-full` something real to
                // fill — and unlike swapping to a fixed `height`, content
                // taller than the minimum still grows the row instead of
                // getting clipped.
                className="mb-2 grid min-w-0"
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
              className="bg-neutral-100 pr-2 text-right text-xs text-muted-foreground"
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
}: {
  event: FestivalEvent;
  day: string;
  pickedSessions: Session[];
  hasAnyPicks: boolean;
  onRemove: (s: Session) => void;
  onArtistTap: (s: Session) => void;
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
    <div className="relative mx-auto max-w-[400px]">
      {groups.map((group, gi) => (
        <div key={group.start} className="flex gap-x-1">
          <div className="sticky top-[var(--sticky-top,0px)] z-10 w-12 shrink-0 self-start pt-3 text-left text-xs font-medium text-muted-foreground md:top-0">
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
                  // grid, not a plain block box — see MobileDayList above for
                  // why: SessionCard fills this box with `h-full`, which
                  // only resolves against a parent with a *definite* height,
                  // and a single-cell grid is what gives it one here.
                  className={cn(
                    "mb-2 grid min-w-0 transition-all ease-in",
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

