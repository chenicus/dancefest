import type { Session } from "../types";
import { toMinutes } from "./time";

export const SLOT_MINUTES = 15;

export interface GridPlacement {
  session: Session;
  /** 1-based CSS grid lines. Row 1 is the room header row. */
  column: number;
  rowStart: number;
  rowEnd: number;
  /** >0 when stacked on top of another session in the same room. */
  stackIndex: number;
  /** Number of room columns this placement covers, from `column`. Only >1
   *  for festival-wide performances, which the source schedule draws as one
   *  bar across every room so it can't be missed. */
  colSpan: number;
}

export interface DayGrid {
  startMinutes: number;
  endMinutes: number;
  slotCount: number;
  placements: GridPlacement[];
}

/** Compute CSS-grid placements for one day. Columns follow `rooms` order +2
 *  (col 1 = time axis, header consumes row 1). */
export function layoutDay(sessions: Session[], rooms: string[]): DayGrid {
  if (sessions.length === 0) {
    return { startMinutes: 0, endMinutes: 0, slotCount: 0, placements: [] };
  }
  const startMinutes = Math.min(...sessions.map((s) => toMinutes(s.start)));
  const endMinutes = Math.max(...sessions.map((s) => toMinutes(s.end)));
  const slotCount = Math.max(1, Math.ceil((endMinutes - startMinutes) / SLOT_MINUTES));

  const placements: GridPlacement[] = [];

  // Performances span every room column, like the source schedule's
  // full-width bar — they're the main-stage draw, not tied to one room, so
  // burying one under a single column makes it easy to miss. Laid out first
  // so they render (and paint) behind any room-specific session sharing
  // their time slot, e.g. a competition that runs concurrently in one room.
  const performances = sessions.filter((s) => s.type === "performance");
  for (const s of performances) {
    placements.push({
      session: s,
      column: 2,
      rowStart: Math.floor((toMinutes(s.start) - startMinutes) / SLOT_MINUTES) + 2,
      rowEnd: Math.ceil((toMinutes(s.end) - startMinutes) / SLOT_MINUTES) + 2,
      stackIndex: 0,
      colSpan: rooms.length,
    });
  }

  const byRoom = new Map<string, Session[]>();
  for (const s of sessions) {
    if (s.type === "performance") continue;
    const list = byRoom.get(s.room) ?? [];
    list.push(s);
    byRoom.set(s.room, list);
  }

  for (const [room, roomSessions] of byRoom) {
    const column = rooms.indexOf(room) + 2;
    const sorted = [...roomSessions].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    const active: Session[] = [];
    for (const s of sorted) {
      const sStart = toMinutes(s.start);
      while (active.length && toMinutes(active[0].end) <= sStart) active.shift();
      placements.push({
        session: s,
        column: column > 1 ? column : rooms.length + 2,
        rowStart: Math.floor((sStart - startMinutes) / SLOT_MINUTES) + 2,
        rowEnd: Math.ceil((toMinutes(s.end) - startMinutes) / SLOT_MINUTES) + 2,
        stackIndex: active.length,
        colSpan: 1,
      });
      active.push(s);
    }
  }

  return { startMinutes, endMinutes, slotCount, placements };
}
