import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Dev-only helper: receives DJ profile-pic bytes from the browser (fetched
// there via the user's logged-in session) and saves them under public/dj/.
// Never enabled in production — it writes files.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled" }, { status: 403, headers: CORS });
  }
  const handle = (new URL(req.url).searchParams.get("handle") ?? "").replace(/[^a-zA-Z0-9._-]/g, "");
  if (!handle) return NextResponse.json({ error: "handle required" }, { status: 400, headers: CORS });

  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.byteLength || buf.byteLength > 5_000_000) {
    return NextResponse.json({ error: "bad size" }, { status: 400, headers: CORS });
  }
  const dir = path.join(process.cwd(), "public", "dj");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${handle}.jpg`), buf);
  return NextResponse.json({ ok: true, handle, bytes: buf.byteLength }, { headers: CORS });
}
