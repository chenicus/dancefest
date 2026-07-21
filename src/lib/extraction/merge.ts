import type { ExtractionResult, FestivalEvent, Session } from "../types";

type DraftSession = ExtractionResult["sessions"][number];

function sessionKey(s: { day: string; start: string; room: string }): string {
  return `${s.day}|${s.start}|${s.room.trim().toLowerCase()}`;
}

function unionOrdered(a: string[], b: string[]): string[] {
  const out = [...a];
  for (const item of b) if (!out.includes(item)) out.push(item);
  return out;
}

/** Merge a newer extraction into an existing one. Newer sessions win on
 *  (day, start, room) collisions; days/rooms are order-preserving unions. */
export function mergeExtractions(
  existing: ExtractionResult,
  incoming: ExtractionResult,
): ExtractionResult {
  const byKey = new Map<string, DraftSession>();
  for (const s of existing.sessions) byKey.set(sessionKey(s), s);
  for (const s of incoming.sessions) byKey.set(sessionKey(s), s);

  const artistsByName = new Map(existing.artists.map((a) => [a.name.toLowerCase(), a]));
  for (const a of incoming.artists) {
    const prev = artistsByName.get(a.name.toLowerCase());
    artistsByName.set(a.name.toLowerCase(), { ...prev, ...a });
  }

  return {
    name: existing.name === "Untitled event" ? incoming.name : existing.name,
    dates: { ...incoming.dates, ...existing.dates },
    rooms: unionOrdered(existing.rooms, incoming.rooms),
    days: unionOrdered(existing.days, incoming.days).sort(),
    sessions: [...byKey.values()],
    artists: [...artistsByName.values()],
    theme: existing.theme.accent !== "#111111" ? existing.theme : incoming.theme,
    sourceUrl: existing.sourceUrl ?? incoming.sourceUrl,
    partial: incoming.partial && existing.partial ? true : incoming.partial && !incoming.sessions.length,
    missingHints: incoming.sessions.length ? [] : unionOrdered(existing.missingHints, incoming.missingHints),
    confidenceNotes: unionOrdered(existing.confidenceNotes, incoming.confidenceNotes),
  };
}

/** Re-apply draft sessions onto a saved event, keeping ids stable for
 *  sessions that still match on (day, start, room) so picks survive. */
export function applyDraftToEvent(
  event: FestivalEvent,
  draft: ExtractionResult,
  newId: () => string,
): Session[] {
  const existingByKey = new Map(event.sessions.map((s) => [sessionKey(s), s]));
  return draft.sessions.map((d) => {
    const prev = existingByKey.get(sessionKey(d));
    return {
      ...d,
      id: prev?.id ?? newId(),
      eventId: event.id,
      artistIds: prev?.artistIds,
    };
  });
}
