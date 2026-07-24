import { ImageResponse } from "next/og";

// A plain route handler rather than the `icon` file convention: under
// `output: export` that convention emits an extensionless file, which
// GitHub Pages serves as application/octet-stream and browsers then refuse
// as a favicon. A route named `icon.png` lands on disk as a real .png.
// `force-static` bakes it at build time — there is no server to render on
// request. Same fix as `og.png`.
export const dynamic = "force-static";

export const ICON_SIZE = { width: 180, height: 180 };

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 140,
        }}
      >
        🪩
      </div>
    ),
    ICON_SIZE,
  );
}
