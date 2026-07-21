"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SchedulePick } from "../types";

interface PicksState {
  picks: SchedulePick[];
  togglePick: (eventId: string, sessionId: string) => void;
  isPicked: (sessionId: string) => boolean;
  picksForEvent: (eventId: string) => SchedulePick[];
}

export const usePicksStore = create<PicksState>()(
  persist(
    (set, get) => ({
      picks: [],
      togglePick: (eventId, sessionId) =>
        set((state) => {
          const exists = state.picks.some((p) => p.sessionId === sessionId);
          return {
            picks: exists
              ? state.picks.filter((p) => p.sessionId !== sessionId)
              : [
                  ...state.picks,
                  {
                    userId: null,
                    sessionId,
                    eventId,
                    status: "going" as const,
                    createdAt: new Date().toISOString(),
                  },
                ],
          };
        }),
      isPicked: (sessionId) => get().picks.some((p) => p.sessionId === sessionId),
      picksForEvent: (eventId) => get().picks.filter((p) => p.eventId === eventId),
    }),
    { name: "dancefest-picks" },
  ),
);
