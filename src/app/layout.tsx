import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Sans_Condensed, Permanent_Marker, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import { OG_ALT, OG_SIZE } from "./og.png/route";

const body = Schibsted_Grotesk({ variable: "--font-body", subsets: ["latin"] });
const display = Fraunces({
  variable: "--font-display-face",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});
// Condensed face for the dense schedule cards — fits more text per line.
const condensed = IBM_Plex_Sans_Condensed({
  variable: "--font-condensed-face",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
// Thick, fun, faintly handwritten marker face — used only for the oversized
// dance-style initial watermarked behind each class card.
const marker = Permanent_Marker({
  variable: "--font-marker-face",
  subsets: ["latin"],
  weight: ["400"],
});

const TITLE = "Hello! Dance Fest 2026 — Build your own schedule";
const DESCRIPTION = "Every workshop across all three days, with times, rooms and artists.";

// Link unfurlers (iMessage, WhatsApp, Slack, X) reject relative image URLs, so
// og:image has to be absolute. metadataBase carries the Pages project subpath
// and the image below is relative to it, giving …/dancefest/og.png.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://chenicus.github.io/dancefest/";
const OG_IMAGE = {
  url: "og.png",
  width: OG_SIZE.width,
  height: OG_SIZE.height,
  alt: OG_ALT,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: "icon.png",
    apple: "icon.png",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Hello! Dance Fest 2026",
    url: SITE_URL,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} ${condensed.variable} ${marker.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
