import { NextResponse } from "next/server";
import { extractFromPage } from "@/lib/extraction/extract";
import { fetchPageBundle } from "@/lib/extraction/fetchPage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server." },
      { status: 503 },
    );
  }
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  let url: URL;
  try {
    url = new URL(body.url ?? "");
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("bad protocol");
  } catch {
    return NextResponse.json({ error: "Enter a valid http(s) URL" }, { status: 400 });
  }
  try {
    const bundle = await fetchPageBundle(url.href);
    const result = await extractFromPage({
      url: url.href,
      pageText: bundle.pageText,
      sheetCsvs: bundle.sheetCsvs,
      scheduleImages: bundle.scheduleImages,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("url extraction failed", err);
    return NextResponse.json(
      { error: "Couldn't read that page. Check the URL, or import screenshots instead." },
      { status: 502 },
    );
  }
}
