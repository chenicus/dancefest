"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SchedulePick, Session } from "../types";

function snapshotOf(session: Session): SchedulePick["snapshot"] {
  return {
    title: session.title,
    instructors: session.instructors,
    artistIds: session.artistIds,
    day: session.day,
    start: session.start,
    end: session.end,
    room: session.room,
    style: session.style,
    level: session.level,
  };
}

interface PicksState {
  picks: SchedulePick[];
  /** Session ids of changed picks the user has dismissed straight from the
   *  banner (not cleared — the pick itself and its snapshot stay put, only
   *  the "N picks changed" banner stops calling them out). A pick dropping
   *  off this list (e.g. after being cleared) is harmless; it's just a mute. */
  dismissedChangeIds: string[];
  /** Toggling on snapshots the session's own details (see SchedulePick.snapshot)
   *  so a later sync that changes/drops this session can still show what was
   *  picked instead of the pick just disappearing. */
  togglePick: (eventId: string, session: Session) => void;
  removePick: (sessionId: string) => void;
  /** Point a pick at the session it was re-matched to after a room/time change
   *  (see resolvePicks), refreshing its snapshot to the class's current details
   *  so later matching works from current data rather than ever-staler values. */
  relinkPick: (oldSessionId: string, session: Session) => void;
  dismissChanges: (sessionIds: string[]) => void;
  isPicked: (sessionId: string) => boolean;
  picksForEvent: (eventId: string) => SchedulePick[];
}

export const usePicksStore = create<PicksState>()(
  persist(
    (set, get) => ({
      picks: [],
      dismissedChangeIds: [],
      togglePick: (eventId, session) =>
        set((state) => {
          const exists = state.picks.some((p) => p.sessionId === session.id);
          return {
            picks: exists
              ? state.picks.filter((p) => p.sessionId !== session.id)
              : [
                  ...state.picks,
                  {
                    userId: null,
                    sessionId: session.id,
                    eventId,
                    status: "going" as const,
                    createdAt: new Date().toISOString(),
                    snapshot: snapshotOf(session),
                  },
                ],
          };
        }),
      removePick: (sessionId) =>
        set((state) => ({
          picks: state.picks.filter((p) => p.sessionId !== sessionId),
          dismissedChangeIds: state.dismissedChangeIds.filter((id) => id !== sessionId),
        })),
      relinkPick: (oldSessionId, session) =>
        set((state) => {
          // Guard against adopting a session another pick already holds — the
          // resolver enforces this too, but the store is the last word on what
          // actually persists, and a duplicate here would be unremovable.
          if (state.picks.some((p) => p.sessionId === session.id)) return state;
          return {
            picks: state.picks.map((p) =>
              p.sessionId === oldSessionId
                ? { ...p, sessionId: session.id, snapshot: snapshotOf(session) }
                : p,
            ),
            dismissedChangeIds: state.dismissedChangeIds.filter((id) => id !== oldSessionId),
          };
        }),
      dismissChanges: (sessionIds) =>
        set((state) => ({
          dismissedChangeIds: [...new Set([...state.dismissedChangeIds, ...sessionIds])],
        })),
      isPicked: (sessionId) => get().picks.some((p) => p.sessionId === sessionId),
      picksForEvent: (eventId) => get().picks.filter((p) => p.eventId === eventId),
    }),
    { name: "dancefest-picks" },
  ),
);
