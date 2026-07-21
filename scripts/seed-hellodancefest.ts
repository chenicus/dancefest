import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import type { Artist, DanceStyle, FestivalEvent, Session } from "../src/lib/types";

const EVENT_ID = "hellodancefest-2026";
const DAYS: Record<string, string> = {
  Friday: "2026-07-24",
  Saturday: "2026-07-25",
  Sunday: "2026-07-26",
};

// Room + style are fixed by column index across all day tabs.
const COLUMNS: { room: string; style: DanceStyle }[] = [
  { room: "Peninsula D-G", style: "bachata" },
  { room: "Peninsula A-B", style: "bachata" },
  { room: "Harbour", style: "kizomba" },
  { room: "Bayside", style: "other" },
  { room: "Regency", style: "salsa" },
  { room: "Peninsula C", style: "salsa" },
  { room: "Sandpebble A-C", style: "zouk" },
  { room: "Sandpebble D-E", style: "zouk" },
];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function to24h(label: string): string | null {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(label);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2];
  const pm = m[3].toUpperCase() === "PM";
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

function plusHour(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const SKIP = /^(no class|break time|transition|performance showcase|\* times|closing)/i;

function cleanInstructor(line: string): string {
  return line
    .replace(/[\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{1F300}-\u{1FAFF}️]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 3);
}

async function main() {
  const artistsRaw = JSON.parse(await fs.readFile("/tmp/hdf_artists.json", "utf8")) as Record<
    string,
    { bio: string; photo: string | null; name: string | null }[]
  >;

  const decode = (s: string) =>
    s
      .replace(/&amp;/g, "&")
      .replace(/&#0?39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, " ");

  const artists: Artist[] = [];
  const seenBio = new Set<string>();
  for (const [style, cards] of Object.entries(artistsRaw)) {
    for (const card of cards) {
      if (!card.name || seenBio.has(card.bio)) continue;
      seenBio.add(card.bio);
      // "…Fest - Alan & Cristina (Valencia, Spain)" → "Alan & Cristina"
      let name = decode(card.name);
      const dash = name.split(/\s[-–]\s/);
      if (dash.length > 1) name = dash.slice(1).join(" - ");
      name = name.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s[-–]\s.*$/, "").trim();
      const photo = card.photo ? decode(card.photo).split("#")[0].replace(/[?&]width.*$/, "") : undefined;
      artists.push({
        id: nanoid(8),
        eventId: EVENT_ID,
        name,
        style: style as DanceStyle,
        photoUrl: photo,
        bioUrl: card.bio,
      });
    }
  }

  const artistIndex = artists.map((a) => ({ artist: a, tokens: nameTokens(a.name) }));
  function matchArtists(instructor: string): string[] {
    const tokens = nameTokens(instructor);
    if (!tokens.length) return [];
    const hits = artistIndex
      .filter((a) => a.artist.style && tokens.some((t) => a.tokens.includes(t)))
      .map((a) => a.artist.id);
    return [...new Set(hits)].slice(0, 1);
  }

  const sessions: Session[] = [];
  for (const [dayName, date] of Object.entries(DAYS)) {
    const csv = await fs.readFile(`/tmp/hdf_${dayName}.csv`, "utf8");
    const rows = parseCsv(csv);
    for (const row of rows) {
      const start = to24h(row[1] ?? "");
      if (!start) continue;
      const end = plusHour(start);
      COLUMNS.forEach((col, idx) => {
        const cell = (row[idx + 2] ?? "").trim();
        if (!cell || SKIP.test(cell)) return;
        const lines = cell.split("\n").map((l) => l.trim()).filter(Boolean);
        if (!lines.length) return;
        const instructor = cleanInstructor(lines[0]);
        const title = lines[1] ?? instructor;
        const level = lines.slice(2).join(" ") || undefined;
        if (SKIP.test(instructor)) return;
        sessions.push({
          id: nanoid(8),
          eventId: EVENT_ID,
          title,
          instructors: [instructor],
          style: col.style,
          level,
          room: col.room,
          day: date,
          start,
          end,
          artistIds: matchArtists(instructor),
        });
      });
    }
  }

  // Keep only artists actually referenced, to slim the payload.
  const usedIds = new Set(sessions.flatMap((s) => s.artistIds ?? []));
  // Drop rooms with no sessions anywhere (e.g. Bayside was all "No Class").
  const usedRooms = new Set(sessions.map((s) => s.room));
  const event: FestivalEvent = {
    id: EVENT_ID,
    name: "Hello! Dance Fest 2026",
    slug: "hello-dance-fest-2026",
    dates: { start: "2026-07-24", end: "2026-07-26" },
    rooms: COLUMNS.map((c) => c.room).filter((r) => usedRooms.has(r)),
    days: Object.values(DAYS),
    artists: artists.filter((a) => usedIds.has(a.id)),
    sessions,
    theme: { accent: "#111111", background: "#ffffff", eventName: "Hello! Dance Fest 2026" },
    sourceUrl: "https://hellodancefest.com/event-program",
    createdAt: new Date().toISOString(),
    createdBy: null,
  };

  const dir = path.join(process.cwd(), ".data");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${EVENT_ID}.json`), JSON.stringify(event, null, 2));
  console.log(
    `Seeded ${sessions.length} sessions, ${event.artists.length}/${artists.length} artists matched, rooms: ${event.rooms.length}`,
  );
  const byDay = event.days.map((d) => `${d}: ${sessions.filter((s) => s.day === d).length}`);
  console.log(byDay.join(" | "));
  console.log("matched sample:", sessions.filter((s) => s.artistIds?.length).slice(0, 3).map((s) => s.instructors[0]));
  console.log("unmatched sample:", sessions.filter((s) => !s.artistIds?.length).slice(0, 5).map((s) => s.instructors[0]));
}

main();
