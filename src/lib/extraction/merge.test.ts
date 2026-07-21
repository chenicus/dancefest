import { describe, expect, it } from "vitest";
import type { ExtractionResult } from "../types";
import { applyDraftToEvent, mergeExtractions } from "./merge";

function draft(over: Partial<ExtractionResult>): ExtractionResult {
  return {
    name: "Fest",
    dates: {},
    rooms: [],
    days: [],
    sessions: [],
    artists: [],
    theme: { accent: "#ff0000", background: "#ffffff", eventName: "Fest" },
    partial: false,
    missingHints: [],
    confidenceNotes: [],
    ...over,
  };
}

function session(day: string, start: string, room: string, title: string) {
  return { title, instructors: [], style: "bachata" as const, room, day, start, end: "23:59" };
}

describe("mergeExtractions", () => {
  it("unions days and rooms preserving order, sorting days", () => {
    const merged = mergeExtractions(
      draft({ days: ["2026-07-26"], rooms: ["A", "B"] }),
      draft({ days: ["2026-07-25"], rooms: ["B", "C"] }),
    );
    expect(merged.days).toEqual(["2026-07-25", "2026-07-26"]);
    expect(merged.rooms).toEqual(["A", "B", "C"]);
  });

  it("dedupes sessions by (day,start,room) with newest winning", () => {
    const merged = mergeExtractions(
      draft({ sessions: [session("2026-07-25", "11:00", "A", "Old title")] }),
      draft({ sessions: [session("2026-07-25", "11:00", "a ", "New title"), session("2026-07-25", "12:00", "A", "Other")] }),
    );
    expect(merged.sessions).toHaveLength(2);
    expect(merged.sessions.find((s) => s.start === "11:00")?.title).toBe("New title");
  });

  it("clears missingHints once sessions arrive", () => {
    const merged = mergeExtractions(
      draft({ partial: true, missingHints: ["Add screenshots"] }),
      draft({ sessions: [session("2026-07-25", "11:00", "A", "T")] }),
    );
    expect(merged.missingHints).toEqual([]);
  });

  it("merges artist records by name", () => {
    const merged = mergeExtractions(
      draft({ artists: [{ name: "Simon & Lolahontas", photoUrl: "p.jpg" }] }),
      draft({ artists: [{ name: "simon & lolahontas", bioUrl: "b" }, { name: "Leo" }] }),
    );
    expect(merged.artists).toHaveLength(2);
    const simon = merged.artists.find((a) => a.name.toLowerCase().startsWith("simon"))!;
    expect(simon.photoUrl).toBe("p.jpg");
    expect(simon.bioUrl).toBe("b");
  });
});

describe("applyDraftToEvent", () => {
  it("keeps ids stable for matching sessions so picks survive", () => {
    const event = {
      id: "e1",
      name: "Fest",
      slug: "fest",
      dates: {},
      rooms: ["A"],
      days: ["2026-07-25"],
      artists: [],
      sessions: [{ ...session("2026-07-25", "11:00", "A", "T"), id: "keep-me", eventId: "e1" }],
      theme: { accent: "#ff0000", background: "#ffffff", eventName: "Fest" },
      createdAt: "",
    };
    let n = 0;
    const sessions = applyDraftToEvent(
      event,
      draft({ sessions: [session("2026-07-25", "11:00", "A", "Renamed"), session("2026-07-25", "12:00", "A", "New")] }),
      () => `new-${n++}`,
    );
    expect(sessions.find((s) => s.start === "11:00")?.id).toBe("keep-me");
    expect(sessions.find((s) => s.start === "12:00")?.id).toBe("new-0");
  });
});
