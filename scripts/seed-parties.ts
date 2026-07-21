import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import type { DanceStyle, Party, PartySet } from "../src/lib/types";

const EVENT_ID = "hellodancefest-2026";
const SHEET_ID = "1Phzou1q71mdtwwct1EoKPW5q_8jDTQhLUEkhlA6_bqY";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0 Safari/537.36";

// gid of each night's DJ tab, and its dress-code theme (from the event page).
const IMG = "https://hellodancefest.com/images/program";
const NIGHTS: Record<string, { gid: string; name: string; dressCode: string; image: string }> = {
  "2026-07-24": {
    gid: "849955427",
    name: "Tropical White Party",
    dressCode: "Fresh and elegant tropical whites.",
    image: `${IMG}/2026-friday-hellofest-theme.jpg`,
  },
  "2026-07-25": {
    gid: "513970288",
    name: "The Prestige Gala",
    dressCode: "Glamorous dresses, heels, sharp suits, and stylish evening outfits.",
    image: `${IMG}/2026-saturday-hellofest-theme.jpg`,
  },
  "2026-07-26": {
    gid: "529728564",
    name: "Wild Paradise Closing Party",
    dressCode: "Wild, creative animal prints, tropical, jungle, and paradise-inspired looks.",
    image: `${IMG}/2026-sunday-hellofest-theme.jpg`,
  },
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
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
  const pm = m[3].toUpperCase() === "PM";
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

function mapStyle(word: string): DanceStyle {
  const w = word.toLowerCase();
  return (["bachata", "salsa", "kizomba", "zouk"] as DanceStyle[]).find((s) => w.includes(s)) ?? "other";
}

const SKIP_DJ = /^(transition|break|closing|closed|tba|n\/a|\*|-)?$/i;

// Best-match Instagram handles for the recurring DJs, identified by web
// research within the SF/Latin-dance scene. Only confident matches are listed;
// the rest fall back to an Instagram name-search in the UI.
const DJ_HANDLES: Record<string, string> = {
  TZOUL: "tzoul4soul",
  BORIQUA: "dj.boriqua",
  MKiZ: "mashakizz",
  KAKAH: "djkakah",
  TRONKY: "djtronky",
  ALEXIO: "dj_alexio",
  SHAMA: "alessioshama",
  SINK: "dj_sink",
  MBRACE: "existential_elijah",
  ELDELACLAVESF: "eldelaclavesf",
};

// Real headshots. Local /dj/*.jpg files were captured from the DJ's Instagram
// via the user's logged-in session; the rest come from the Salsa Vida directory.
const DJ_PHOTOS: Record<string, string> = {
  TRONKY: "/dj/djtronky.jpg",
  BORIQUA: "https://www.salsavida.com/wp-content/uploads/2025/05/dj-boriqua-orlando-felix.jpg",
  MUNDO: "https://www.salsavida.com/wp-content/uploads/2025/05/dj-mundo.jpg",
  ELDELACLAVESF: "https://www.salsavida.com/wp-content/uploads/2025/05/dj-el-de-la-clave.jpg",
};

async function fetchCsv(gid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`DJ tab ${gid} → ${res.status}`);
  return res.text();
}

/** Sort night sets so PM (23:xx) comes before the after-midnight AM hours. */
function nightMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h < 12 ? h + 24 : h) * 60 + m;
}

async function main() {
  const parties: Party[] = [];
  for (const [day, night] of Object.entries(NIGHTS)) {
    const rows = parseCsv(await fetchCsv(night.gid));
    const header = rows[0] ?? [];
    // Each room occupies a 3-col block: [time, dj, spacer]. Header cell marks
    // the block's first column, e.g. "Bachata Main Ballroom".
    const blocks = header
      .map((h, col) => ({ h: h.trim(), col }))
      .filter((b) => b.col > 0 && b.h)
      .map((b) => {
        const words = b.h.split(/\s+/);
        return { col: b.col, style: mapStyle(words[0]), room: words.slice(1).join(" ") || b.h };
      });

    const sets: PartySet[] = [];
    for (let r = 2; r < rows.length; r++) {
      for (const block of blocks) {
        const time = to24h(rows[r][block.col] ?? "");
        const dj = (rows[r][block.col + 1] ?? "").trim();
        if (!time || SKIP_DJ.test(dj)) continue;
        sets.push({
          start: time,
          room: block.room,
          style: block.style,
          dj,
          igHandle: DJ_HANDLES[dj],
          photoUrl: DJ_PHOTOS[dj],
        });
      }
    }
    sets.sort((a, b) => nightMinutes(a.start) - nightMinutes(b.start));

    parties.push({
      id: nanoid(8),
      eventId: EVENT_ID,
      day,
      name: night.name,
      dressCode: night.dressCode,
      image: night.image,
      sets,
    });
    console.log(`${day} — ${night.name}: ${sets.length} DJ sets across ${blocks.length} rooms`);
  }

  const file = path.join(process.cwd(), ".data", `${EVENT_ID}.json`);
  const event = JSON.parse(await fs.readFile(file, "utf8"));
  event.parties = parties;
  await fs.writeFile(file, JSON.stringify(event, null, 2));
  console.log(`Wrote ${parties.length} parties to ${EVENT_ID}.json (sessions/artists untouched)`);
}

main();
