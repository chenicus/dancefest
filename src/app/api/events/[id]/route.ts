import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { applyDraftToEvent } from "@/lib/extraction/merge";
import { deleteEvent, getEvent, saveEvent } from "@/lib/store/events";
import type { ExtractionResult } from "@/lib/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let draft: ExtractionResult;
  try {
    draft = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const updated = {
    ...event,
    name: draft.name || event.name,
    dates: draft.dates ?? event.dates,
    rooms: draft.rooms ?? event.rooms,
    days: draft.days ?? event.days,
    theme: draft.theme ?? event.theme,
    sessions: applyDraftToEvent(event, draft, () => nanoid(8)),
  };
  await saveEvent(updated);
  return NextResponse.json({ id });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await deleteEvent(id);
  return NextResponse.json({ ok: true });
}
