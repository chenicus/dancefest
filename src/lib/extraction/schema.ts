import type Anthropic from "@anthropic-ai/sdk";

const TIME = { type: "string", pattern: "^\\d{1,2}:\\d{2}$" } as const;
const STYLE = {
  type: "string",
  enum: ["bachata", "salsa", "kizomba", "zouk", "other"],
} as const;
const EVENT_TYPE = {
  type: "string",
  enum: ["workshop", "performance", "competition", "social", "party"],
} as const;

export const RECORD_SCHEDULE_TOOL: Anthropic.Tool = {
  name: "record_schedule",
  description:
    "Record the complete extracted festival schedule, artist lineup, and branding.",
  input_schema: {
    type: "object",
    required: ["name", "rooms", "days", "sessions", "theme", "partial", "missingHints", "confidenceNotes"],
    properties: {
      name: { type: "string", description: "Festival/event name" },
      dates: {
        type: "object",
        properties: {
          start: { type: "string", description: "ISO date, first day" },
          end: { type: "string", description: "ISO date, last day" },
        },
      },
      rooms: {
        type: "array",
        items: { type: "string" },
        description: "All room names, in the order they appear in the source",
      },
      days: {
        type: "array",
        items: { type: "string" },
        description: "ISO dates of schedule days in order; use 'day-1', 'day-2'… if dates are unknown",
      },
      sessions: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "instructors", "style", "room", "day", "start", "end"],
          properties: {
            title: { type: "string" },
            instructors: { type: "array", items: { type: "string" } },
            style: STYLE,
            level: { type: "string" },
            room: { type: "string" },
            day: { type: "string" },
            start: TIME,
            end: TIME,
            type: { ...EVENT_TYPE, description: "Event category: workshop (default), performance, competition, social (DJ dancing block), or party (night DJ set)" },
          },
        },
      },
      artists: {
        type: "array",
        description: "Artist/instructor lineup if visible: names, photo URLs, bio page URLs",
        items: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
            style: STYLE,
            photoUrl: { type: "string", description: "Absolute URL of profile photo" },
            bioUrl: { type: "string", description: "Absolute URL of artist bio page" },
          },
        },
      },
      theme: {
        type: "object",
        required: ["accent", "background", "eventName"],
        properties: {
          accent: { type: "string", description: "Primary brand color as hex" },
          background: { type: "string", description: "Page background hex, usually #ffffff" },
          eventName: { type: "string" },
          fontHint: { type: "string", enum: ["serif", "sans", "display"] },
        },
      },
      partial: {
        type: "boolean",
        description: "true if a schedule exists in the source but could not be fully read",
      },
      missingHints: {
        type: "array",
        items: { type: "string" },
        description: "User-facing hints about what is missing and how to supply it",
      },
      confidenceNotes: {
        type: "array",
        items: { type: "string" },
        description: "Notes about uncertain or illegible extractions",
      },
    },
  },
};
