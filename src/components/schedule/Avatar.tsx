"use client";

import { useState } from "react";
import { darken, mix } from "@/lib/theme";
import type { Artist } from "@/lib/types";

function initials(name: string): string {
  return name
    .split(/[\s&y]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

const INITIALS_BGS = ["#F5C4B3", "#CECBF6", "#C0DD97", "#F4C0D1", "#FAC775", "#B5D4F4"];
const INITIALS_FGS = ["#712B13", "#3C3489", "#27500A", "#72243E", "#633806", "#0C447C"];

export function Avatar({
  artist,
  name,
  size = 36,
  tint,
}: {
  artist?: Artist;
  name: string;
  size?: number;
  /** When set, a photo-less avatar drops the multicolor initials palette and
   *  instead renders in this color's own hue — a stronger patch of the same
   *  family the card is already tinted with, just differentiated enough to
   *  read as its own element. Keeps a grid of photo-less cards calm instead of
   *  scattering unrelated rainbow chips across it. */
  tint?: string;
}) {
  const [broken, setBroken] = useState(false);
  const hue = Math.abs([...name].reduce((a, c) => a + c.charCodeAt(0), 0)) % INITIALS_BGS.length;

  if (artist?.photoUrl && !broken) {
    // Root-relative photos (the locally-hosted DJ pics under public/) live under
    // the deploy basePath on GitHub Pages; Next only rewrites next/image, not a
    // plain <img>, so prefix them by hand. Absolute http(s) URLs pass through.
    const src = artist.photoUrl.startsWith("/")
      ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${artist.photoUrl}`
      : artist.photoUrl;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        onError={() => setBroken(true)}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  // Same hue as the card, just a shade apart: a light-but-saturated wash for
  // the fill (stronger than the card's own faint tint, so the circle still
  // reads as a distinct element) with a darkened shade of the same color for
  // the initials.
  const bg = tint ? mix(tint, "#ffffff", 0.72) : INITIALS_BGS[hue];
  const fg = tint ? darken(tint, 0.5) : INITIALS_FGS[hue];
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-medium"
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: size * 0.36,
      }}
    >
      {initials(name)}
    </span>
  );
}
