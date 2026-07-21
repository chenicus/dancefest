import Anthropic from "@anthropic-ai/sdk";
import type { DanceStyle, ExtractionResult } from "../types";
import { EXTRACTION_MODEL } from "./model";
import { HTML_SYSTEM, IMAGE_SYSTEM } from "./prompts";
import { RECORD_SCHEDULE_TOOL } from "./schema";

export interface ImageInput {
  base64: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
}

const STYLES: DanceStyle[] = ["bachata", "salsa", "kizomba", "zouk", "other"];

function clampStyle(style: unknown): DanceStyle {
  return STYLES.includes(style as DanceStyle) ? (style as DanceStyle) : "other";
}

function clampTime(t: unknown): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t ?? ""));
  if (!m) return "00:00";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/** Coerce whatever the model returned into a well-formed ExtractionResult. */
export function sanitizeExtraction(raw: unknown): ExtractionResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const sessions = Array.isArray(r.sessions) ? r.sessions : [];
  const artists = Array.isArray(r.artists) ? r.artists : [];
  const theme = (r.theme ?? {}) as Record<string, unknown>;
  const name = String(r.name ?? "Untitled event");
  return {
    name,
    dates: (r.dates as ExtractionResult["dates"]) ?? {},
    rooms: Array.isArray(r.rooms) ? r.rooms.map(String) : [],
    days: Array.isArray(r.days) ? r.days.map(String) : [],
    sessions: sessions
      .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
      .map((s) => ({
        title: String(s.title ?? "(untitled)"),
        instructors: Array.isArray(s.instructors) ? s.instructors.map(String) : [],
        style: clampStyle(s.style),
        level: s.level ? String(s.level) : undefined,
        room: String(s.room ?? ""),
        day: String(s.day ?? ""),
        start: clampTime(s.start),
        end: clampTime(s.end),
      })),
    artists: artists
      .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
      .map((a) => ({
        name: String(a.name ?? ""),
        style: a.style ? clampStyle(a.style) : undefined,
        photoUrl: a.photoUrl ? String(a.photoUrl) : undefined,
        bioUrl: a.bioUrl ? String(a.bioUrl) : undefined,
      }))
      .filter((a) => a.name),
    theme: {
      accent: /^#[0-9a-fA-F]{6}$/.test(String(theme.accent)) ? String(theme.accent) : "#111111",
      background: /^#[0-9a-fA-F]{6}$/.test(String(theme.background)) ? String(theme.background) : "#ffffff",
      eventName: String(theme.eventName ?? name),
      fontHint: ["serif", "sans", "display"].includes(String(theme.fontHint))
        ? (String(theme.fontHint) as "serif" | "sans" | "display")
        : undefined,
    },
    partial: Boolean(r.partial),
    missingHints: Array.isArray(r.missingHints) ? r.missingHints.map(String) : [],
    confidenceNotes: Array.isArray(r.confidenceNotes) ? r.confidenceNotes.map(String) : [],
  };
}

async function callClaude(
  system: string,
  content: Anthropic.MessageParam["content"],
): Promise<ExtractionResult> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 16000,
    system,
    tools: [RECORD_SCHEDULE_TOOL],
    tool_choice: { type: "tool", name: "record_schedule" },
    messages: [{ role: "user", content }],
  });
  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("Model returned no record_schedule call");
  return sanitizeExtraction(toolUse.input);
}

export async function extractFromImages(
  images: ImageInput[],
  existingDraft?: ExtractionResult,
): Promise<ExtractionResult> {
  const content: Anthropic.ContentBlockParam[] = images.map((img) => ({
    type: "image",
    source: { type: "base64", media_type: img.mediaType, data: img.base64 },
  }));
  let text = "Extract the full schedule from these screenshots.";
  if (existingDraft) {
    text += `\n\nExisting draft to extend/correct:\n${JSON.stringify({
      name: existingDraft.name,
      dates: existingDraft.dates,
      rooms: existingDraft.rooms,
      days: existingDraft.days,
      sessions: existingDraft.sessions,
      theme: existingDraft.theme,
    })}`;
  }
  content.push({ type: "text", text });
  return callClaude(IMAGE_SYSTEM, content);
}

export async function extractFromPage(input: {
  url: string;
  pageText: string;
  sheetCsvs: string[];
  scheduleImages: ImageInput[];
}): Promise<ExtractionResult> {
  const content: Anthropic.ContentBlockParam[] = input.scheduleImages.map((img) => ({
    type: "image",
    source: { type: "base64", media_type: img.mediaType, data: img.base64 },
  }));
  let text = `Source URL: ${input.url}\n\nPage content:\n${input.pageText}`;
  for (const csv of input.sheetCsvs) {
    text += `\n\nEmbedded spreadsheet data (CSV):\n${csv}`;
  }
  if (input.scheduleImages.length) {
    text += "\n\nThe attached images are schedule graphics found on the page.";
  }
  content.push({ type: "text", text });
  const result = await callClaude(HTML_SYSTEM, content);
  return { ...result, sourceUrl: input.url };
}
