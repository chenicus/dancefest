"use client";

import { useState } from "react";
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
}: {
  artist?: Artist;
  name: string;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const hue = Math.abs([...name].reduce((a, c) => a + c.charCodeAt(0), 0)) % INITIALS_BGS.length;

  if (artist?.photoUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={artist.photoUrl}
        alt={name}
        width={size}
        height={size}
        onError={() => setBroken(true)}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-medium"
      style={{
        width: size,
        height: size,
        background: INITIALS_BGS[hue],
        color: INITIALS_FGS[hue],
        fontSize: size * 0.36,
      }}
    >
      {initials(name)}
    </span>
  );
}
