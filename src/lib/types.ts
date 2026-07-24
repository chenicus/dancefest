export type DanceStyle = "bachata" | "salsa" | "kizomba" | "zouk" | "other";
export type EventType = "workshop" | "performance" | "competition" | "social" | "party" | "empty";

export interface Theme {
  /** Accent color extracted from festival branding; chrome stays black. */
  accent: string;
  background: string;
  eventName: string;
  fontHint?: "serif" | "sans" | "display";
}

export interface Session {
  id: string;
  eventId: string;
  title: string;
  instructors: string[];
  style: DanceStyle;
  /** Mixed-style sets (e.g. a salsa+bachata party room). When present it
   * drives the tile's letter watermark; `style` stays the primary style for
   * filtering/colors. Rendered in canonical S-B-K-Z order regardless of
   * the order given here. */
  styles?: DanceStyle[];
  level?: string;
  room: string;
  /** ISO date ("2026-07-25") or a label like "day-1" when dates are unknown. */
  day: string;
  /** "HH:mm" in festival-local time. */
  start: string;
  end: string;
  artistIds?: string[];
  /** Event category: workshop (default), performance, competition, break, or transition. */
  type?: EventType;
}

export interface IgLink {
  label: string;
  url: string;
  kind: "joint" | "individual";
}

export interface Artist {
  id: string;
  eventId: string;
  name: string;
  style?: DanceStyle;
  photoUrl?: string;
  bioUrl?: string;
  igLinks?: IgLink[];
  /** Set once the bio page has been fetched, even if no links were found. */
  socialsFetchedAt?: string;
}

/** One DJ set during a night party. */
export interface PartySet {
  start: string;
  room: string;
  style: DanceStyle;
  dj: string;
  /** Best-match Instagram handle (no @), when a profile was identified. */
  igHandle?: string;
  /** Headshot from a public DJ directory (Instagram pics aren't accessible). */
  photoUrl?: string;
}

/** A themed night party (one per festival night). */
export interface Party {
  id: string;
  eventId: string;
  /** ISO date of the night (the evening it starts). */
  day: string;
  name: string;
  /** Dress-code / theme description. */
  dressCode?: string;
  /** Themed promo poster (from the festival's posts). */
  image?: string;
  sets: PartySet[];
}

export interface FestivalEvent {
  id: string;
  name: string;
  slug: string;
  dates: { start?: string; end?: string };
  rooms: string[];
  days: string[];
  sessions: Session[];
  artists: Artist[];
  parties?: Party[];
  theme: Theme;
  sourceUrl?: string;
  createdAt: string;
  createdBy?: string | null;
}

export interface SchedulePick {
  /** null = anonymous local user (v1); real user id once accounts exist. */
  userId: string | null;
  sessionId: string;
  eventId: string;
  status: "going" | "interested";
  createdAt: string;
}

/** What extraction returns — a draft event plus quality signals, before save. */
export interface ExtractionResult {
  name: string;
  dates: { start?: string; end?: string };
  rooms: string[];
  days: string[];
  sessions: Omit<Session, "id" | "eventId" | "artistIds">[];
  artists: Omit<Artist, "id" | "eventId" | "igLinks" | "socialsFetchedAt">[];
  theme: Theme;
  sourceUrl?: string;
  partial: boolean;
  missingHints: string[];
  confidenceNotes: string[];
  parties?: Party[];
}
