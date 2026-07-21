import { describe, expect, it } from "vitest";
import type { Session } from "../types";
import { conflictIds, overlaps } from "./conflicts";

function s(id: string, day: string, start: string, end: string): Session {
  return {
    id,
    eventId: "e1",
    title: id,
    instructors: [],
    style: "bachata",
    room: "A",
    day,
    start,
    end,
  };
}

describe("overlaps", () => {
  it("detects a plain overlap", () => {
    expect(overlaps(s("a", "2026-07-25", "11:00", "12:00"), s("b", "2026-07-25", "11:30", "12:30"))).toBe(true);
  });

  it("back-to-back sessions do not conflict", () => {
    expect(overlaps(s("a", "2026-07-25", "13:00", "14:00"), s("b", "2026-07-25", "14:00", "15:00"))).toBe(false);
  });

  it("different days never conflict", () => {
    expect(overlaps(s("a", "2026-07-25", "11:00", "12:00"), s("b", "2026-07-26", "11:00", "12:00"))).toBe(false);
  });

  it("containment counts as overlap", () => {
    expect(overlaps(s("a", "2026-07-25", "11:00", "13:00"), s("b", "2026-07-25", "11:30", "12:00"))).toBe(true);
  });
});

describe("conflictIds", () => {
  it("flags both members of each overlapping pair only", () => {
    const ids = conflictIds([
      s("a", "2026-07-25", "11:00", "12:00"),
      s("b", "2026-07-25", "11:30", "12:30"),
      s("c", "2026-07-25", "14:00", "15:00"),
    ]);
    expect(ids).toEqual(new Set(["a", "b"]));
  });
});
