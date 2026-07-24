import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { darken, hexAlpha, STYLE_COLORS } from "@/lib/theme";
import type { DanceStyle } from "@/lib/types";

// A plain route handler rather than the `opengraph-image` file convention:
// under `output: export` that convention emits an extensionless file, which
// GitHub Pages serves as application/octet-stream and every link unfurler
// then rejects. A route named `og.png` lands on disk as a real .png.
// `force-static` bakes it at build time — there is no server to render on
// request.
export const dynamic = "force-static";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = "Hello! Dance Fest 2026 — build your own schedule";

// The style pills are the only color on the card; they carry the app's palette
// and, incidentally, tell a stranger what kind of festival this is.
const STYLE_PILLS: DanceStyle[] = ["bachata", "salsa", "kizomba", "zouk"];

async function font(file: string) {
  return readFile(join(process.cwd(), "assets/fonts", file));
}

export async function GET() {
  const [condensed, condensedSemi] = await Promise.all([
    font("IBMPlexSansCondensed-Regular.ttf"),
    font("IBMPlexSansCondensed-SemiBold.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          fontFamily: "Plex",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: 5,
            color: "#64748b",
          }}
        >
          HELLO! DANCE FEST 2026
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 22,
            fontSize: 124,
            fontWeight: 600,
            lineHeight: 1.02,
            letterSpacing: -2,
            color: "#0f172a",
          }}
        >
          <div style={{ display: "flex" }}>Build your own</div>
          <div style={{ display: "flex" }}>schedule</div>
        </div>
        <div style={{ display: "flex", fontSize: 40, color: "#475569", marginTop: 30 }}>
          July 24–26
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 40 }}>
          {STYLE_PILLS.map((style) => (
            <div
              key={style}
              style={{
                display: "flex",
                padding: "12px 26px",
                borderRadius: 999,
                fontSize: 29,
                fontWeight: 600,
                textTransform: "capitalize",
                background: hexAlpha(STYLE_COLORS[style], 0.14),
                color: darken(STYLE_COLORS[style], 0.68),
              }}
            >
              {style}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Plex", data: condensed, weight: 400, style: "normal" },
        { name: "Plex", data: condensedSemi, weight: 600, style: "normal" },
      ],
    },
  );
}
