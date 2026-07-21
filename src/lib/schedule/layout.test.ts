import { describe, expect, it } from "vitest";
import type { Session } from "../types";
import { layoutDay } from "./layout";

function s(id: string, room: string, start: string, end: string): Session {
  return {
    id,
    eventId: "e1",
    title: id,
    instructors: [],
    style: "salsa",
    room,
    day: "2026-07-25",
    start,
    end,
  };
}

describe("layoutDay", () => {
  it("places sessions on the 15-minute grid with header offsets", () => {
    const grid = layoutDay([s("a", "A", "11:00", "12:00"), s("b", "B", "11:30", "12:30")], ["A", "B"]);
    expect(grid.startMinutes).toBe(11 * 60);
    expect(grid.slotCount).toBe(6);
    const a = grid.placements.find((p) => p.session.id === "a")!;
    expect(a.column).toBe(2);
    expect(a.rowStart).toBe(2);
    expect(a.rowEnd).toBe(6);
    const b = grid.placements.find((p) => p.session.id === "b")!;
    expect(b.column).toBe(3);
    expect(b.rowStart).toBe(4);
  });

  it("stacks same-room overlaps", () => {
    const grid = layoutDay([s("a", "A", "11:00", "12:00"), s("b", "A", "11:30", "12:00")], ["A"]);
    const b = grid.placements.find((p) => p.session.id === "b")!;
    expect(b.stackIndex).toBe(1);
  });

  it("handles empty input", () => {
    expect(layoutDay([], ["A"]).placements).toEqual([]);
  });
});
