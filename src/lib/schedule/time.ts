/** "HH:mm" → minutes since midnight. Tolerates "H:mm". */
export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatRange(start: string, end: string): string {
  return `${to12h(start)}–${to12h(end)}`;
}

/** "23:00" → "11 PM"; "14:30" → "2:30 PM". Hours ≥24 (post-midnight sessions
 *  stored on the previous day, e.g. a "26:00" DJ set) wrap for display while
 *  toMinutes() keeps them unwrapped so ordering/layout stay continuous. */
export function to12h(t: string): string {
  const [rawH, m] = t.split(":").map(Number);
  const h = rawH % 24;
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${period}` : `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/** On-the-hour label from minutes since midnight: 540 → "9 AM". */
export function hourLabel(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour} ${period}`;
}

/** Weekday label ("Fri") for an ISO date; falls back to the raw label. */
export function dayLabel(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

/** Full date with ordinal suffix ("July 26th") for an ISO date; empty if unparseable. */
export function dayDateLabel(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const date = d.getDate();
  const suffix =
    date % 10 === 1 && date !== 11
      ? "st"
      : date % 10 === 2 && date !== 12
        ? "nd"
        : date % 10 === 3 && date !== 13
          ? "rd"
          : "th";
  return `${month} ${date}${suffix}`;
}
