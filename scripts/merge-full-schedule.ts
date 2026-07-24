import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import type { Artist, FestivalEvent, Session } from "../src/lib/types";

const EVENT_ID = "hellodancefest-2026";

/** Special festival-wide sessions read directly off the Friday/Saturday/Sunday
 *  workshop tabs — the merged full-width/multi-row cells the workshop-only
 *  extraction skipped (performances, J&J competitions, and the two nights'
 *  "daytime dancing" / practica blocks). */
const SPECIAL_SESSIONS: Omit<Session, "id" | "eventId">[] = [
  // Friday
  {
    title: "Performance Showcase",
    instructors: [],
    style: "other",
    room: "Main Ballroom",
    day: "2026-07-24",
    start: "21:00",
    end: "23:00",
    type: "performance",
  },
  // Saturday
  {
    title: "Battle Royale",
    instructors: [],
    style: "bachata",
    level: "Open Level",
    room: "Peninsula A-B",
    day: "2026-07-25",
    start: "18:30",
    end: "19:30",
    type: "competition",
  },
  {
    title: "Daytime Dancing",
    instructors: ["DJ OLU", "DJ SINK"],
    style: "kizomba",
    level: "Kizomba & Urban Kiz",
    room: "Harbour",
    day: "2026-07-25",
    start: "17:00",
    end: "20:00",
    type: "social",
  },
  {
    title: "Practica & Dancing",
    instructors: ["DJ TBA"],
    style: "zouk",
    room: "Regency",
    day: "2026-07-25",
    start: "19:00",
    end: "20:00",
    type: "social",
  },
  {
    title: "JnJ Competition",
    instructors: [],
    style: "zouk",
    level: "Novice–Intermediate–Advance",
    room: "Regency",
    day: "2026-07-25",
    start: "20:00",
    end: "21:00",
    type: "competition",
  },
  {
    title: "Performance Showcase",
    instructors: [],
    style: "other",
    room: "Main Ballroom",
    day: "2026-07-25",
    start: "21:00",
    end: "23:00",
    type: "performance",
  },
  // Sunday
  {
    title: "Daytime Dancing",
    instructors: ["DJ WHOMAN", "DJ KRIS KROS"],
    style: "bachata",
    styles: ["salsa", "bachata"],
    level: "Bachata & Salsa",
    room: "Peninsula A-B",
    day: "2026-07-26",
    start: "17:00",
    end: "20:00",
    type: "social",
  },
  {
    title: "Practica & Day Dancing",
    instructors: ["DJ TBA"],
    style: "zouk",
    room: "Regency",
    day: "2026-07-26",
    start: "19:00",
    end: "20:00",
    type: "social",
  },
  {
    title: "JnJ Competition",
    instructors: [],
    style: "zouk",
    level: "Novice–Intermediate–Advance",
    room: "Regency",
    day: "2026-07-26",
    start: "20:00",
    end: "21:00",
    type: "competition",
  },
  {
    title: "Performance Showcase",
    instructors: [],
    style: "other",
    room: "Main Ballroom",
    day: "2026-07-26",
    start: "21:00",
    end: "23:00",
    type: "performance",
  },
];

const DEFAULT_SET_MINUTES = 60;

/** Sort/position key for a night: hours before ~noon are treated as the next
 *  calendar day's early morning, continuing past 24:00 (e.g. "01:00" → 25:00)
 *  so overnight sets stay chronologically after the evening's 23:00 sets in
 *  the same per-day grid. */
function nightMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h < 12 ? h + 24 : h) * 60 + m;
}

function extendedTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

async function main() {
  const file = path.join(process.cwd(), ".data", `${EVENT_ID}.json`);
  const event: FestivalEvent = JSON.parse(await fs.readFile(file, "utf8"));

  if (!event.rooms.includes("Main Ballroom")) event.rooms.push("Main Ballroom");

  const specialSessions: Session[] = SPECIAL_SESSIONS.map((s) => ({
    ...s,
    id: nanoid(8),
    eventId: EVENT_ID,
  }));

  // DJs become artists too, so their card taps open the same ArtistSheet
  // (with IG link / photo) that workshop instructors use.
  const djArtists = new Map<string, Artist>();
  function djArtist(dj: string, style: Session["style"], igHandle?: string, photoUrl?: string): string {
    const key = dj.toLowerCase();
    const existing = djArtists.get(key);
    if (existing) {
      if (igHandle && !existing.igLinks?.length) {
        existing.igLinks = [{ label: dj, url: `https://instagram.com/${igHandle}`, kind: "individual" }];
      }
      if (photoUrl && !existing.photoUrl) existing.photoUrl = photoUrl;
      return existing.id;
    }
    const artist: Artist = {
      id: nanoid(8),
      eventId: EVENT_ID,
      name: dj,
      style,
      photoUrl,
      igLinks: igHandle
        ? [{ label: dj, url: `https://instagram.com/${igHandle}`, kind: "individual" }]
        : undefined,
    };
    djArtists.set(key, artist);
    return artist.id;
  }

  const partySessions: Session[] = [];
  for (const party of event.parties ?? []) {
    const byRoom = new Map<string, typeof party.sets>();
    for (const s of party.sets) {
      const list = byRoom.get(s.room) ?? [];
      list.push(s);
      byRoom.set(s.room, list);
    }
    for (const [room, sets] of byRoom) {
      const sorted = [...sets].sort((a, b) => nightMinutes(a.start) - nightMinutes(b.start));
      sorted.forEach((s, i) => {
        const startMins = nightMinutes(s.start);
        const endMins = i < sorted.length - 1 ? nightMinutes(sorted[i + 1].start) : startMins + DEFAULT_SET_MINUTES;
        partySessions.push({
          id: nanoid(8),
          eventId: EVENT_ID,
          title: s.dj,
          instructors: [s.dj],
          style: s.style,
          room,
          day: party.day,
          start: extendedTime(startMins),
          end: extendedTime(endMins),
          type: "party",
          artistIds: [djArtist(s.dj, s.style, s.igHandle, s.photoUrl)],
        });
      });
    }
  }

  event.sessions.push(...specialSessions, ...partySessions);
  event.artists.push(...djArtists.values());

  await fs.writeFile(file, JSON.stringify(event, null, 2));
  console.log(`Added ${specialSessions.length} special sessions (performances/competitions/socials)`);
  console.log(`Added ${partySessions.length} DJ-set sessions from ${event.parties?.length ?? 0} parties`);
  console.log(`Added ${djArtists.size} DJ artists`);
  console.log(`Total sessions now: ${event.sessions.length}`);
}

main();
