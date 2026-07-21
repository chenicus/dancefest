import { NextResponse } from "next/server";
import { extractFromImages, type ImageInput } from "@/lib/extraction/extract";
import { mergeExtractions } from "@/lib/extraction/merge";
import type { ExtractionResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server." },
      { status: 503 },
    );
  }
  let body: { images?: ImageInput[]; existingDraft?: ExtractionResult };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const images = (body.images ?? []).slice(0, 4);
  if (!images.length) {
    return NextResponse.json({ error: "No images provided" }, { status: 400 });
  }
  try {
    const result = await extractFromImages(images, body.existingDraft);
    const final = body.existingDraft ? mergeExtractions(body.existingDraft, result) : result;
    return NextResponse.json(final);
  } catch (err) {
    console.error("screenshot extraction failed", err);
    return NextResponse.json({ error: "Extraction failed. Try again or use smaller screenshots." }, { status: 502 });
  }
}
