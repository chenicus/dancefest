// Words that signal a stage name, team, or academy rather than a person's
// surname — when the 2nd word is one of these, we keep the full label.
const TEAM_WORDS = new Set([
  "academy",
  "ladies",
  "pro",
  "team",
  "crew",
  "fusion",
  "dance",
  "studio",
  "company",
  "project",
  "mambo",
  "salsa",
  "bachata",
  "zouk",
  "kizomba",
  "collective",
  "family",
  "brothers",
  "sisters",
  "kids",
  "cru",
  "co",
]);

const WORD = /^[\p{L}'.-]+$/u;

/** "Ngoc Huynh" → "Ngoc", but leaves stage names ("Fadi Fusion") and teams
 *  ("SF Salsa Academy") intact. Also leaves DJ handles ("DJ OLU") intact —
 *  "DJ" reads as a first name to the 2-word heuristic otherwise. */
function firstNameOf(part: string): string {
  const words = part.trim().split(/\s+/);
  if (words[0]?.toLowerCase() === "dj") return part.trim();
  if (
    words.length === 2 &&
    WORD.test(words[0]) &&
    WORD.test(words[1]) &&
    !TEAM_WORDS.has(words[1].toLowerCase())
  ) {
    return words[0];
  }
  return part.trim();
}

/** Shorten a display name to first names: "Ngoc Huynh & Tien Tran" → "Ngoc & Tien". */
export function shortArtistName(name: string): string {
  return name
    .split(/\s+(?:&|and)\s+/i)
    .map(firstNameOf)
    .join(" & ");
}
