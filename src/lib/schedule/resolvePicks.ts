import type { SchedulePick, Session } from "../types";

type Snapshot = NonNullable<SchedulePick["snapshot"]>;

/** A pick matched to a session that's still on the schedule. */
export interface PickResolution {
  pick: SchedulePick;
  session: Session;
  /** True when the pick's stored sessionId no longer existed and this session
   *  was re-found by artist instead — the caller should persist the new id so
   *  the pick doesn't have to be re-matched (against ever-staler snapshot
   *  details) on every future sync. */
  relinked: boolean;
}

export interface ResolvedPicks {
  resolved: PickResolution[];
  /** Picks with no session left to point at — the class is genuinely gone. */
  orphaned: SchedulePick[];
}

/** Score awarded when a candidate still matches the snapshot on this field.
 *  Title is weighted highest: it's what the user actually chose, and it's the
 *  field least likely to coincide across two different classes by the same
 *  instructor. Room is worth the least — instructors often teach several
 *  classes in the same room, so a room match alone says almost nothing. */
const TITLE_SCORE = 4;
const TIME_SCORE = 2;
const ROOM_SCORE = 1;

/** A candidate must match on title or start time, not just room — same artist,
 *  same day, same room but a different hour *and* a different title is far
 *  more likely to be a second class of theirs than the one that moved. */
const MIN_SCORE = TIME_SCORE;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The individual people named in an instructor list: a duo is stored as one
 *  string ("Leandro & Nayara"), so split it to compare person-by-person and
 *  survive a couple being listed in the other order after a sync. */
function people(instructors: string[]): string[] {
  return instructors
    .flatMap((name) => name.split(/\s*&\s*/))
    .map(normalize)
    .filter(Boolean);
}

/** Is at least one artist in common? Artist ids win when both sides have them
 *  (stable across name spelling changes); instructor names are the fallback
 *  for picks saved before ids were snapshotted. */
function sharesArtist(session: Session, snap: Snapshot): boolean {
  const snapIds = snap.artistIds ?? [];
  const sessionIds = session.artistIds ?? [];
  if (snapIds.length > 0 && sessionIds.length > 0) {
    return snapIds.some((id) => sessionIds.includes(id));
  }
  const snapPeople = people(snap.instructors);
  const sessionPeople = people(session.instructors);
  return snapPeople.some((p) => sessionPeople.includes(p));
}

function score(session: Session, snap: Snapshot): number {
  let total = 0;
  if (normalize(session.title) === normalize(snap.title)) total += TITLE_SCORE;
  if (session.start === snap.start) total += TIME_SCORE;
  if (normalize(session.room) === normalize(snap.room)) total += ROOM_SCORE;
  return total;
}

/** Match saved picks against the current schedule.
 *
 *  A pick whose sessionId still exists resolves to it directly. One whose
 *  sessionId is gone — because the class moved room or time, and session ids
 *  are content hashes — is re-found by looking for a session that same day
 *  sharing at least one artist, scored on how much else still lines up. Only
 *  a genuinely missing class ends up orphaned.
 *
 *  Two guards keep re-matching honest, since an instructor usually teaches
 *  several classes across a day: a session already claimed by another pick is
 *  never stolen, and a candidate has to clear MIN_SCORE rather than winning on
 *  artist alone. Day is deliberately part of the key — a class moving to a
 *  different day is a big enough change that the user should be told, not
 *  quietly followed. */
export function resolvePicks(picks: SchedulePick[], sessions: Session[]): ResolvedPicks {
  const byId = new Map(sessions.map((s) => [s.id, s]));
  const claimed = new Set<string>();
  const resolved: PickResolution[] = [];
  const needsRelink: SchedulePick[] = [];

  // Exact matches first, so they claim their own session before anything
  // else can be re-matched onto it.
  for (const pick of picks) {
    const exact = byId.get(pick.sessionId);
    if (exact) {
      claimed.add(exact.id);
      resolved.push({ pick, session: exact, relinked: false });
    } else {
      needsRelink.push(pick);
    }
  }

  // Sorted so that when two orphaned picks could claim the same session, which
  // one wins is stable rather than dependent on localStorage insertion order.
  const ordered = [...needsRelink].sort((a, b) => {
    const at = a.snapshot?.start ?? "";
    const bt = b.snapshot?.start ?? "";
    return at.localeCompare(bt) || a.sessionId.localeCompare(b.sessionId);
  });

  const orphaned: SchedulePick[] = [];
  for (const pick of ordered) {
    const snap = pick.snapshot;
    if (!snap) {
      orphaned.push(pick);
      continue;
    }
    let best: Session | null = null;
    let bestScore = 0;
    for (const session of sessions) {
      if (claimed.has(session.id)) continue;
      if (session.day !== snap.day) continue;
      if (!sharesArtist(session, snap)) continue;
      const candidateScore = score(session, snap);
      if (candidateScore > bestScore) {
        bestScore = candidateScore;
        best = session;
      }
    }
    if (best && bestScore >= MIN_SCORE) {
      claimed.add(best.id);
      resolved.push({ pick, session: best, relinked: true });
    } else {
      orphaned.push(pick);
    }
  }

  return { resolved, orphaned };
}
