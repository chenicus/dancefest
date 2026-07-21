import { NextResponse } from "next/server";
import { resolveArtistSocials } from "@/lib/extraction/socials";
import { getEvent, saveEvent } from "@/lib/store/events";

export const runtime = "nodejs";
export const maxDuration = 30;

type Params = { params: Promise<{ id: string; artistId: string }> };

/** Backfill path for events saved before socials were prefetched at import.
 *  New events already have igLinks baked in, so this is a no-op cache hit. */
export async function GET(_req: Request, { params }: Params) {
  const { id, artistId } = await params;
  const event = await getEvent(id);
  const artist = event?.artists.find((a) => a.id === artistId);
  if (!event || !artist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (artist.socialsFetchedAt) {
    return NextResponse.json({ igLinks: artist.igLinks ?? [] });
  }

  const igLinks = await resolveArtistSocials(event, artist);
  artist.igLinks = igLinks;
  artist.socialsFetchedAt = new Date().toISOString();
  await saveEvent(event);
  return NextResponse.json({ igLinks });
}
