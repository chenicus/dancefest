import type { ImageInput } from "./extract";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const MAX_TEXT = 150_000;

export interface FetchedPage {
  pageText: string;
  sheetCsvs: string[];
  scheduleImages: ImageInput[];
  lineupLinks: string[];
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(10_000),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
  return res.text();
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h[1-6])[^>]*>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " | ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .slice(0, MAX_TEXT);
}

export function findSheetUrls(html: string): string[] {
  const ids = new Set<string>();
  for (const m of html.matchAll(/docs\.google\.com\/spreadsheets\/d\/(?:e\/)?([\w-]+)/g)) {
    ids.add(m[0]);
  }
  return [...ids];
}

function csvUrlFor(sheetUrl: string): string {
  const m = /spreadsheets\/d\/(e\/)?([\w-]+)/.exec(sheetUrl);
  if (!m) return "";
  return m[1]
    ? `https://docs.google.com/spreadsheets/d/e/${m[2]}/pub?output=csv`
    : `https://docs.google.com/spreadsheets/d/${m[2]}/export?format=csv`;
}

export function findScheduleImageUrls(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
    const tag = m[0];
    const src = m[1];
    if (/schedule|program|timetable|lineup-?grid/i.test(src) || /alt=["'][^"']*(schedule|program|timetable)/i.test(tag)) {
      try {
        urls.add(new URL(src, baseUrl).href);
      } catch {
        /* ignore malformed src */
      }
    }
  }
  return [...urls].slice(0, 3);
}

export function findLineupLinks(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  for (const m of html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)) {
    const href = m[1];
    if (/^(\/|https?:)/.test(href) && /\b(bachata|salsa|kizomba|zouk|artists?|lineup|instructors?)\b/i.test(href) && !/instagram|facebook|youtube/i.test(href)) {
      try {
        const u = new URL(href, baseUrl);
        if (u.origin === new URL(baseUrl).origin) urls.add(u.href.replace(/[#?].*$/, ""));
      } catch {
        /* ignore malformed href */
      }
    }
  }
  return [...urls].slice(0, 8);
}

async function fetchImageAsInput(url: string): Promise<ImageInput | null> {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    const mediaType = ["image/png", "image/jpeg", "image/webp", "image/gif"].find((t) => type.includes(t));
    if (!mediaType) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 8_000_000) return null;
    return { base64: buf.toString("base64"), mediaType: mediaType as ImageInput["mediaType"] };
  } catch {
    return null;
  }
}

/** Fetch the program page plus lineup pages, embedded sheet CSVs, and
 *  schedule graphics — everything extraction can use in one Claude call. */
export async function fetchPageBundle(url: string): Promise<FetchedPage> {
  const html = await fetchText(url);

  const sheetCsvs: string[] = [];
  for (const sheetUrl of findSheetUrls(html).slice(0, 2)) {
    try {
      const csv = await fetchText(csvUrlFor(sheetUrl));
      if (csv && !csv.trimStart().startsWith("<")) sheetCsvs.push(csv.slice(0, 60_000));
    } catch {
      /* sheet not publicly exportable — extraction will flag partial */
    }
  }

  const scheduleImages = (
    await Promise.all(findScheduleImageUrls(html, url).map(fetchImageAsInput))
  ).filter((i): i is ImageInput => i !== null);

  const lineupLinks = findLineupLinks(html, url);
  let lineupText = "";
  for (const link of lineupLinks.slice(0, 4)) {
    try {
      const lineupHtml = await fetchText(link);
      const imgs = [...lineupHtml.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
        .map((m) => {
          try {
            return new URL(m[1], link).href;
          } catch {
            return "";
          }
        })
        .filter((u) => u && !/logo|icon|sprite/i.test(u))
        .slice(0, 40);
      const bios = [...lineupHtml.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)]
        .map((m) => {
          try {
            return new URL(m[1], link).href;
          } catch {
            return "";
          }
        })
        .filter((u) => u && /workshops?\/|lineup\//i.test(u))
        .slice(0, 60);
      lineupText += `\n\nLineup page ${link}:\n${stripHtml(lineupHtml).slice(0, 15_000)}\nPhoto URLs:\n${imgs.join("\n")}\nBio links:\n${[...new Set(bios)].join("\n")}`;
    } catch {
      /* skip unreachable lineup page */
    }
  }

  return {
    pageText: stripHtml(html) + lineupText,
    sheetCsvs,
    scheduleImages,
    lineupLinks,
  };
}

/** Parse Instagram links (with nearby label text) out of an artist bio page. */
export async function fetchArtistSocials(bioUrl: string): Promise<{ label: string; url: string }[]> {
  const html = await fetchText(bioUrl);
  const out: { label: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/<a[^>]+href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'/?]+)\/?["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)) {
    const url = m[1].replace(/\/$/, "");
    const handle = url.split("/").pop() ?? "";
    if (!handle || seen.has(url.toLowerCase())) continue;
    seen.add(url.toLowerCase());
    const label = stripHtml(m[2]).trim().slice(0, 60) || `@${handle}`;
    out.push({ label, url });
  }
  return out;
}
