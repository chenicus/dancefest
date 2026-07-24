import type { Artist, Party, Session } from "../types";
import { toMinutes } from "./time";

/** DJ sets are entered as wall-clock hours ("11 PM" through "6 AM"); any hour
 *  before noon in that context is actually after midnight. Shift those past
 *  24 so sort order and duration math stay continuous across the boundary —
 *  the same convention to12h's post-midnight wrap already expects (see its
 *  "a '26:00' DJ set" example). */
function nightStart(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const hh = h < 12 ? h + 24 : h;
  return `${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addMinutes(t: string, mins: number): string {
  const total = toMinutes(t) + mins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const djArtistId = (dj: string) => `party-dj:${dj}`;

/** One synthesized Artist per unique DJ across every night, so the schedule's
 *  existing Avatar/ArtistSheet machinery shows a DJ's headshot and Instagram
 *  link exactly like it does for a workshop instructor. */
export function partyArtists(parties: Party[]): Artist[] {
  const seen = new Map<string, Artist>();
  for (const party of parties) {
    for (const s of party.sets) {
      if (seen.has(s.dj)) continue;
      seen.set(s.dj, {
        id: djArtistId(s.dj),
        eventId: party.eventId,
        name: s.dj,
        style: s.style,
        photoUrl: s.photoUrl,
        igLinks: s.igHandle
          ? [{ label: "DJ", url: `https://instagram.com/${s.igHandle}`, kind: "individual" }]
          : [],
      });
    }
  }
  return [...seen.values()];
}

/** Turn a night's DJ lineup into Session-shaped tiles so it renders through
 *  the exact SessionCard/grid pipeline workshops use — "party" is already a
 *  full Session.type with its own card treatment (glowing style letters,
 *  midnight fill), and every DJ room is already one of the event's workshop
 *  rooms, so no new columns are needed.
 *  A set's end time isn't in the source data, so it's inferred as the next
 *  set's start in the same room; the last set of the night in a room
 *  defaults to a 1-hour block. */
export function partyToSessions(party: Party): Session[] {
  const withStart = party.sets.map((s) => ({ ...s, startAdj: nightStart(s.start) }));

  const byRoom = new Map<string, typeof withStart>();
  for (const s of withStart) {
    const arr = byRoom.get(s.room) ?? [];
    arr.push(s);
    byRoom.set(s.room, arr);
  }
  for (const arr of byRoom.values()) arr.sort((a, b) => toMinutes(a.startAdj) - toMinutes(b.startAdj));

  return withStart.map((s, i) => {
    const roomSets = byRoom.get(s.room)!;
    const next = roomSets[roomSets.indexOf(s) + 1];
    return {
      id: `party:${party.id}:${i}`,
      eventId: party.eventId,
      title: s.dj,
      instructors: [s.dj],
      style: s.style,
      room: s.room,
      day: party.day,
      start: s.startAdj,
      end: next ? next.startAdj : addMinutes(s.startAdj, 60),
      artistIds: [djArtistId(s.dj)],
      type: "party",
    };
  });
}
