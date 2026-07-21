import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { resolveArtistSocials } from "@/lib/extraction/socials";
import { listEvents, saveEvent } from "@/lib/store/events";
import type { ExtractionResult, FestivalEvent } from "@/lib/types";

export const runtime = "nodejs";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "event";
}

export async function GET() {
  const events = await listEvents();
  return NextResponse.json(
    events.map(({ id, name, slug, dates, theme, days, sessions }) => ({
      id,
      name,
      slug,
      dates,
      theme,
      dayCount: days.length,
      sessionCount: sessions.length,
    })),
  );
}

export async function POST(req: Request) {
  let draft: ExtractionResult;
  try {
    draft = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!draft?.name || !Array.isArray(draft.sessions)) {
    return NextResponse.json({ error: "Draft must include a name and sessions" }, { status: 400 });
  }
  const id = nanoid(10);
  const baseArtists = (draft.artists ?? []).map((a) => ({ ...a, id: nanoid(8), eventId: id }));
  // Fetch every artist's Instagram links up front so cards render them instantly
  // (no on-the-fly lookup when a card is opened). One slow bio page can't block save.
  const fetchedAt = new Date().toISOString();
  const artists = await Promise.all(
    baseArtists.map(async (a) => ({
      ...a,
      igLinks: await resolveArtistSocials(draft, a),
      socialsFetchedAt: fetchedAt,
    })),
  );
  const artistIdByName = new Map(artists.map((a) => [a.name.toLowerCase(), a.id]));

  const event: FestivalEvent = {
    id,
    name: draft.name,
    slug: slugify(draft.name),
    dates: draft.dates ?? {},
    rooms: draft.rooms ?? [],
    days: draft.days ?? [],
    artists,
    sessions: (draft.sessions ?? []).map((s) => ({
      ...s,
      id: nanoid(8),
      eventId: id,
      artistIds: s.instructors
        .map((name) => matchArtist(name, artistIdByName))
        .filter((x): x is string => !!x),
    })),
    theme: draft.theme,
    sourceUrl: draft.sourceUrl,
    createdAt: new Date().toISOString(),
    createdBy: null,
  };
  await saveEvent(event);
  return NextResponse.json({ id: event.id });
}

/** Exact lowercase match, then containment either way ("Simon" ⊂ "Simon & Lolahontas"). */
function matchArtist(instructor: string, byName: Map<string, string>): string | undefined {
  const needle = instructor.toLowerCase().trim();
  if (!needle) return undefined;
  const exact = byName.get(needle);
  if (exact) return exact;
  for (const [name, id] of byName) {
    if (name.includes(needle) || needle.includes(name)) return id;
  }
  return undefined;
}
