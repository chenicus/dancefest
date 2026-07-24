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

/** Is this handle one of the organizers' own accounts rather than an artist's?
 *
 *  Every bio page links the festival, so those handles arrive mixed in with the
 *  artist's. Matching the event name alone isn't enough: a festival that spans
 *  styles runs an account per style, so "Hello! Dance Fest" also posts as
 *  @hellobachata and @hellokizombafest — which is how @hellokizombafest ended
 *  up listed as one couple's "Joint account". Match the brand word plus a
 *  style/fest word instead, which catches the siblings without touching a
 *  handle like @bachatasensualorlando that merely mentions a style. */
export function isOrganiserAccount(eventName: string, url: string): boolean {
  const handle = (url.split("/").filter(Boolean).pop() ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (!handle) return false;
  const slug = eventName.toLowerCase().replace(/[^a-z]/g, "");
  if (slug && (slug.includes(handle) || handle.includes(slug))) return true;
  const brand = /[a-z]+/.exec(eventName.toLowerCase())?.[0] ?? "";
  return brand.length >= 4 && handle.startsWith(brand) && /fest|bachata|salsa|kizomba|zouk|dance/.test(handle);
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
    // The festival's own accounts are linked from every bio page — drop them.
    const filtered = raw.filter((l) => !isOrganiserAccount(event.name, l.url));
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
