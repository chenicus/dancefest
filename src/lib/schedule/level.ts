/** Shorten level labels for the cramped card layout: "Intermediate-Advance"
 *  → "Int to Adv", "Beginner" → "Beg". Source data is messy free text (typos,
 *  hyphens, "to") so this matches on word prefixes rather than exact strings. */
export function abbreviateLevel(level: string): string {
  return level
    .replace(/\binterm\w*/gi, "Int")
    .replace(/\badv\w*/gi, "Adv")
    .replace(/\bbeg\w*/gi, "Beg")
    .replace(/Int\s*(?:-|to)\s*Adv/gi, "Int to Adv")
    .replace(/\blevel\b/gi, "")
    .replace(/\s*[-–]\s*$|^\s*[-–]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
