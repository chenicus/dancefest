import { fetchArtistSocials } from "./fetchPage";
import { saveEvent } from "@/lib/store/events";
import type { Artist, FestivalEvent, IgLink } from "@/lib/types";

/** The people in an artist name: "Ngoc Huynh & Tien Tran" → [{first:"Ngoc",
 *  tokens:["ngoc","huynh"]}, {first:"Tien", tokens:["tien","tran"]}]. */
function people(name: string): { first: string; tokens: string[] }[] {
  return name.split(/\s+&\s+/).map((part) => {
    const words = part.trim().split(/\s+/);
    return {
      first: words[0] ?? part.trim(),
      tokens: words.map((w) => w.toLowerCase().replace(/[^a-z]/g, "")).filter((w) => w.length > 2),
    };
  });
}

/** Fetch an artist's bio page and turn its Instagram links into labelled {@link IgLink}s.
 *  Drops the festival's own account and tags joint-vs-individual handles for couples.
 *  Returns [] (never throws) when there's no bio page or it can't be reached. */
export async function resolveArtistSocials(
  event: Pick<FestivalEvent, "name">,
  artist: Pick<Artist, "name" | "bioUrl">,
): Promise<IgLink[]> {
  if (!artist.bioUrl) return [];

  try {
    const raw = await fetchArtistSocials(artist.bioUrl);
    const members = people(artist.name);
    // The festival's own account is linked from every bio page — drop it.
    const eventSlug = event.name.toLowerCase().replace(/[^a-z]/g, "");
    const filtered = raw.filter((l) => {
      const handle = (l.url.split("/").pop() ?? "").toLowerCase().replace(/[^a-z]/g, "");
      return handle && !(eventSlug.includes(handle) || handle.includes(eventSlug));
    });
    const igLinks: IgLink[] = filtered.map((l) => {
      const handle = l.url.split("/").pop()?.toLowerCase() ?? "";
      // Which of the couple does this handle belong to?
      const owners = members.filter((m) => m.tokens.some((t) => handle.includes(t)));
      const joint = members.length > 1 && (owners.length > 1 || owners.length === 0);
      // Label with the person's first name when it clearly belongs to one of them.
      const label = joint ? "Joint account" : owners.length === 1 ? owners[0].first : l.label;
      return { url: l.url, label, kind: joint ? ("joint" as const) : ("individual" as const) };
    });
    igLinks.sort((a, b) => (a.kind === "joint" ? -1 : 0) - (b.kind === "joint" ? -1 : 0));
    return igLinks;
  } catch {
    /* bio page unreachable — treat as no links found */
    return [];
  }
}

/** Ensure every artist has its Instagram links baked in. New events prefetch at
 *  import, but events saved before that (or artists never opened) may still be
 *  missing links — resolve those once and persist, so cards never fetch on open.
 *  Mutates and saves `event` only when something was actually filled in. */
export async function backfillArtistSocials(event: FestivalEvent): Promise<FestivalEvent> {
  const pending = event.artists.filter((a) => !a.socialsFetchedAt);
  if (pending.length === 0) return event;

  const fetchedAt = new Date().toISOString();
  await Promise.all(
    pending.map(async (a) => {
      a.igLinks = await resolveArtistSocials(event, a);
      a.socialsFetchedAt = fetchedAt;
    }),
  );
  await saveEvent(event);
  return event;
}
