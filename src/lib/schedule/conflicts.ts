import type { Session } from "../types";
import { toMinutes } from "./time";

export function overlaps(a: Session, b: Session): boolean {
  if (a.day !== b.day) return false;
  return toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

/** Session ids that overlap with at least one other session in the list. */
export function conflictIds(sessions: Session[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      if (overlaps(sessions[i], sessions[j])) {
        out.add(sessions[i].id);
        out.add(sessions[j].id);
      }
    }
  }
  return out;
}

/** For a given session, the other sessions it overlaps with. */
export function conflictsWith(session: Session, others: Session[]): Session[] {
  return others.filter((o) => o.id !== session.id && overlaps(session, o));
}
