import type { Session } from "../types";
import { toMinutes, fromMinutes } from "./time";

/** Below this length a gap reads as a rounding artifact, not a real break. */
const MIN_GAP_MINUTES = 15;

function mergeIntervals(intervals: [number, number][]): [number, number][] {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

/** Synthesize "Empty" filler sessions for the stretches where a room's
 *  workshop-day schedule shows nothing — mirrors the source schedule's own
 *  "No Class" / "Break Time" cells instead of leaving blank grid space.
 *  Scoped to the shared workshop-day window (min start–max end across all
 *  non-party sessions that day) and only for rooms that host at least one
 *  such session — night-only rooms (e.g. a DJ-only ballroom) are left alone. */
export function fillEmptySlots(sessions: Session[], rooms: string[], day: string): Session[] {
  const daySessions = sessions.filter((s) => s.day === day);
  const dayHours = daySessions.filter((s) => s.type !== "party");
  if (!dayHours.length) return [];

  const rangeStart = Math.min(...dayHours.map((s) => toMinutes(s.start)));
  const rangeEnd = Math.max(...dayHours.map((s) => toMinutes(s.end)));

  // Performances render as one bar spanning every room (see layoutDay), but
  // the source data only tags one room against the session. Without this,
  // every *other* room reads as truly empty during that stretch and gets its
  // own "Empty" filler drawn right on top of the performance bar.
  const performanceBusy = mergeIntervals(
    dayHours.filter((s) => s.type === "performance").map((s): [number, number] => [toMinutes(s.start), toMinutes(s.end)]),
  );

  const filler: Session[] = [];
  for (const room of rooms) {
    const roomHours = dayHours.filter((s) => s.room === room);
    if (!roomHours.length) continue;

    const busy = mergeIntervals([
      ...roomHours.map((s): [number, number] => [toMinutes(s.start), toMinutes(s.end)]),
      ...performanceBusy,
    ]);
    let cursor = rangeStart;
    for (const [busyStart, busyEnd] of busy) {
      if (busyStart - cursor >= MIN_GAP_MINUTES) {
        filler.push(makeEmpty(room, day, cursor, busyStart));
      }
      cursor = Math.max(cursor, busyEnd);
    }
    if (rangeEnd - cursor >= MIN_GAP_MINUTES) {
      filler.push(makeEmpty(room, day, cursor, rangeEnd));
    }
  }
  return filler;
}

function makeEmpty(room: string, day: string, startMin: number, endMin: number): Session {
  return {
    id: `empty-${room}-${day}-${startMin}`,
    eventId: "",
    title: "Empty",
    instructors: [],
    style: "other",
    room,
    day,
    start: fromMinutes(startMin),
    end: fromMinutes(endMin),
    type: "empty",
  };
}
