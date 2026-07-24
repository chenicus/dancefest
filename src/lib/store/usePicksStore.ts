"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SchedulePick, Session } from "../types";

interface PicksState {
  picks: SchedulePick[];
  /** Toggling on snapshots the session's own details (see SchedulePick.snapshot)
   *  so a later sync that changes/drops this session can still show what was
   *  picked instead of the pick just disappearing. */
  togglePick: (eventId: string, session: Session) => void;
  removePick: (sessionId: string) => void;
  isPicked: (sessionId: string) => boolean;
  picksForEvent: (eventId: string) => SchedulePick[];
}

export const usePicksStore = create<PicksState>()(
  persist(
    (set, get) => ({
      picks: [],
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
                    snapshot: {
                      title: session.title,
                      instructors: session.instructors,
                      day: session.day,
                      start: session.start,
                      end: session.end,
                      room: session.room,
                      style: session.style,
                      level: session.level,
                    },
                  },
                ],
          };
        }),
      removePick: (sessionId) =>
        set((state) => ({ picks: state.picks.filter((p) => p.sessionId !== sessionId) })),
      isPicked: (sessionId) => get().picks.some((p) => p.sessionId === sessionId),
      picksForEvent: (eventId) => get().picks.filter((p) => p.eventId === eventId),
    }),
    { name: "dancefest-picks" },
  ),
);
