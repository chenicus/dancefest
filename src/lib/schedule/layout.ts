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
  const byRoom = new Map<string, Session[]>();
  for (const s of sessions) {
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
      });
      active.push(s);
    }
  }

  return { startMinutes, endMinutes, slotCount, placements };
}
