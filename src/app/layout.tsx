import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Sans_Condensed, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "DanceFest",
  description: "Festival workshop schedules, made tappable",
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
    <html lang="en" className={`${body.variable} ${display.variable} ${condensed.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
