import { describe, expect, it } from "vitest";
import type { SchedulePick, Session } from "../types";
import { resolvePicks } from "./resolvePicks";

function session(over: Partial<Session> & { id: string }): Session {
  return {
    eventId: "e",
    title: "Bachata Fusion",
    instructors: ["Leandro & Nayara"],
    artistIds: ["artist-ln"],
    style: "bachata",
    room: "Harbour",
    day: "2026-07-24",
    start: "13:00",
    end: "14:00",
    ...over,
  };
}

type Snapshot = NonNullable<SchedulePick["snapshot"]>;

function pick(
  over: Omit<Partial<SchedulePick>, "snapshot"> & {
    sessionId: string;
    snapshot?: Partial<Snapshot>;
  },
): SchedulePick {
  const { snapshot, ...rest } = over;
  return {
    userId: null,
    eventId: "e",
    status: "going",
    createdAt: "2026-07-20T00:00:00.000Z",
    snapshot: {
      title: "Bachata Fusion",
      instructors: ["Leandro & Nayara"],
      artistIds: ["artist-ln"],
      day: "2026-07-24",
      start: "13:00",
      end: "14:00",
      room: "Harbour",
      style: "bachata",
      ...snapshot,
    },
    ...rest,
  };
}

describe("resolvePicks", () => {
  it("resolves a pick whose session id still exists, without relinking", () => {
    const s = session({ id: "same" });
    const { resolved, orphaned } = resolvePicks([pick({ sessionId: "same" })], [s]);
    expect(orphaned).toHaveLength(0);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].session.id).toBe("same");
    expect(resolved[0].relinked).toBe(false);
  });

  it("follows a class that only changed room", () => {
    const moved = session({ id: "new", room: "Regency" });
    const { resolved, orphaned } = resolvePicks([pick({ sessionId: "old" })], [moved]);
    expect(orphaned).toHaveLength(0);
    expect(resolved[0].session.id).toBe("new");
    expect(resolved[0].relinked).toBe(true);
  });

  it("follows a class that only changed time", () => {
    const moved = session({ id: "new", start: "16:00", end: "17:00" });
    const { resolved, orphaned } = resolvePicks([pick({ sessionId: "old" })], [moved]);
    expect(orphaned).toHaveLength(0);
    expect(resolved[0].session.id).toBe("new");
  });

  it("follows a class that changed both room and time, on the title", () => {
    const moved = session({ id: "new", room: "Regency", start: "16:00", end: "17:00" });
    const { resolved, orphaned } = resolvePicks([pick({ sessionId: "old" })], [moved]);
    expect(orphaned).toHaveLength(0);
    expect(resolved[0].session.id).toBe("new");
  });

  it("follows a retitled class that kept its time", () => {
    const moved = session({ id: "new", title: "Bachata Fusion (Advanced)", room: "Regency" });
    const { resolved } = resolvePicks([pick({ sessionId: "old" })], [moved]);
    expect(resolved[0].session.id).toBe("new");
  });

  it("keeps a duo class when only one of the two artists remains", () => {
    const reduced = session({
      id: "new",
      room: "Regency",
      instructors: ["Leandro"],
      artistIds: ["artist-ln"],
    });
    const { resolved, orphaned } = resolvePicks([pick({ sessionId: "old" })], [reduced]);
    expect(orphaned).toHaveLength(0);
    expect(resolved[0].session.id).toBe("new");
  });

  it("matches on instructor names for picks saved without artist ids", () => {
    const moved = session({ id: "new", room: "Regency", artistIds: undefined });
    const legacy = pick({ sessionId: "old", snapshot: { artistIds: undefined } });
    const { resolved, orphaned } = resolvePicks([legacy], [moved]);
    expect(orphaned).toHaveLength(0);
    expect(resolved[0].session.id).toBe("new");
  });

  it("matches a couple listed in the opposite order by name", () => {
    const moved = session({
      id: "new",
      room: "Regency",
      instructors: ["Nayara & Leandro"],
      artistIds: undefined,
    });
    const legacy = pick({ sessionId: "old", snapshot: { artistIds: undefined } });
    const { resolved } = resolvePicks([legacy], [moved]);
    expect(resolved[0].session.id).toBe("new");
  });

  it("orphans a pick when the artist is gone from that day entirely", () => {
    const other = session({ id: "other", instructors: ["Someone Else"], artistIds: ["artist-x"] });
    const { resolved, orphaned } = resolvePicks([pick({ sessionId: "old" })], [other]);
    expect(resolved).toHaveLength(0);
    expect(orphaned).toHaveLength(1);
  });

  it("does not follow the same artist to a different day", () => {
    const nextDay = session({ id: "new", day: "2026-07-25", room: "Regency" });
    const { resolved, orphaned } = resolvePicks([pick({ sessionId: "old" })], [nextDay]);
    expect(resolved).toHaveLength(0);
    expect(orphaned).toHaveLength(1);
  });

  it("does not relink onto a session the user already picked separately", () => {
    // Both of this instructor's Friday classes were picked; the 13:00 one was
    // dropped from the schedule. The 16:00 one must stay attached to its own
    // pick rather than being adopted by the dropped one.
    const kept = session({ id: "kept", title: "Head Movement", start: "16:00", end: "17:00" });
    const picks = [
      pick({ sessionId: "gone" }),
      pick({
        sessionId: "kept",
        snapshot: { title: "Head Movement", start: "16:00", end: "17:00" },
      }),
    ];
    const { resolved, orphaned } = resolvePicks(picks, [kept]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].session.id).toBe("kept");
    expect(resolved[0].relinked).toBe(false);
    expect(orphaned).toHaveLength(1);
    expect(orphaned[0].sessionId).toBe("gone");
  });

  it("orphans rather than guessing when only the room matches", () => {
    // Same artist, same room, but a different hour and a different class —
    // that is their other class, not the one that moved.
    const different = session({ id: "new", title: "Something Else", start: "18:00", end: "19:00" });
    const { resolved, orphaned } = resolvePicks([pick({ sessionId: "old" })], [different]);
    expect(resolved).toHaveLength(0);
    expect(orphaned).toHaveLength(1);
  });

  it("prefers the better-matching candidate among an artist's classes", () => {
    const decoy = session({ id: "decoy", title: "Different Class", start: "13:00", end: "14:00", room: "Bayside" });
    const real = session({ id: "real", room: "Regency", start: "15:00", end: "16:00" });
    const { resolved } = resolvePicks([pick({ sessionId: "old" })], [decoy, real]);
    // Title (4) beats start-time (2): the retitled decoy sharing only the old
    // start time is the weaker match.
    expect(resolved[0].session.id).toBe("real");
  });

  it("orphans a pick that has no snapshot at all", () => {
    const legacy: SchedulePick = {
      userId: null,
      eventId: "e",
      status: "going",
      createdAt: "2026-07-20T00:00:00.000Z",
      sessionId: "old",
    };
    const { resolved, orphaned } = resolvePicks([legacy], [session({ id: "new" })]);
    expect(resolved).toHaveLength(0);
    expect(orphaned).toHaveLength(1);
  });

  it("is stable when two orphaned picks compete for one session", () => {
    const only = session({ id: "only", room: "Regency" });
    const a = pick({ sessionId: "a", snapshot: { start: "13:00" } });
    const b = pick({ sessionId: "b", snapshot: { start: "14:00" } });
    const first = resolvePicks([a, b], [only]);
    const second = resolvePicks([b, a], [only]);
    expect(first.resolved).toHaveLength(1);
    expect(second.resolved).toHaveLength(1);
    expect(first.resolved[0].pick.sessionId).toBe(second.resolved[0].pick.sessionId);
  });
});
