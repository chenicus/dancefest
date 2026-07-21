"use client";

import { useRef, useState } from "react";
import { Alert02Icon, Cancel01Icon, ImageAdd01Icon } from "@hugeicons/core-free-icons";
import { fileToImageInput } from "@/lib/downscale";
import { STYLE_COLORS } from "@/lib/theme";
import type { DanceStyle, ExtractionResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";

const STYLES: DanceStyle[] = ["bachata", "salsa", "kizomba", "zouk", "other"];
type DraftSession = ExtractionResult["sessions"][number];

export function ExtractionReview({
  draft,
  onChange,
  onSave,
  saving,
}: {
  draft: ExtractionResult;
  onChange: (d: ExtractionResult) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [addingShots, setAddingShots] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function patchSession(i: number, patch: Partial<DraftSession>) {
    const sessions = draft.sessions.map((s, j) => (j === i ? { ...s, ...patch } : s));
    onChange({ ...draft, sessions });
  }

  function removeSession(i: number) {
    onChange({ ...draft, sessions: draft.sessions.filter((_, j) => j !== i) });
  }

  function addSession(day: string) {
    onChange({
      ...draft,
      sessions: [
        ...draft.sessions,
        { title: "", instructors: [], style: "other", room: draft.rooms[0] ?? "", day, start: "12:00", end: "13:00" },
      ],
    });
  }

  async function addScreenshots(files: FileList | null) {
    if (!files?.length) return;
    setAddingShots(true);
    setAddError(null);
    try {
      const images = await Promise.all([...files].slice(0, 4).map(fileToImageInput));
      const res = await fetch("/api/extract/screenshot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ images, existingDraft: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Extraction failed");
      onChange(data);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setAddingShots(false);
    }
  }

  const days = draft.days.length ? draft.days : [...new Set(draft.sessions.map((s) => s.day))];

  return (
    <div className="flex flex-col gap-5">
      {draft.partial && draft.missingHints.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-medium">
            <Icon icon={Alert02Icon} size={18} className="text-amber-600" />
            This import looks incomplete
          </p>
          <ul className="mt-1.5 list-disc pl-5 text-amber-800">
            {draft.missingHints.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={addingShots}
            size="sm"
            className="mt-3"
          >
            <Icon icon={ImageAdd01Icon} size={16} />
            {addingShots ? "Reading screenshots…" : "Add screenshots"}
          </Button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => addScreenshots(e.target.files)}
      />
      {addError && <p className="text-sm text-destructive">{addError}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="text-muted-foreground">Event name</span>
          <Input
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value, theme: { ...draft.theme, eventName: e.target.value } })}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Accent color</span>
          <input
            type="color"
            value={draft.theme.accent}
            onChange={(e) => onChange({ ...draft, theme: { ...draft.theme, accent: e.target.value } })}
            className="h-11 w-full cursor-pointer rounded-xl border border-input bg-background p-1"
          />
        </label>
      </div>

      {draft.confidenceNotes.length > 0 && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer">Extraction notes ({draft.confidenceNotes.length})</summary>
          <ul className="mt-1 list-disc pl-5">
            {draft.confidenceNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </details>
      )}

      {days.map((day) => (
        <div key={day}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium">{day}</h3>
            <button
              onClick={() => addSession(day)}
              className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Add session
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {draft.sessions.map((s, i) =>
              s.day !== day ? null : (
                <div
                  key={i}
                  className="grid grid-cols-2 items-center gap-2 rounded-2xl border border-border bg-card p-3 sm:grid-cols-[auto_1fr_1fr_auto_auto_auto_auto_auto]"
                >
                  <span
                    aria-hidden
                    className="hidden size-2.5 rounded-full sm:block"
                    style={{ background: STYLE_COLORS[s.style] }}
                  />
                  <Input
                    value={s.title}
                    placeholder="Session title"
                    onChange={(e) => patchSession(i, { title: e.target.value })}
                    className="h-9 px-2.5"
                  />
                  <Input
                    value={s.instructors.join(", ")}
                    placeholder="Instructors"
                    onChange={(e) =>
                      patchSession(i, { instructors: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })
                    }
                    className="h-9 px-2.5"
                  />
                  <select
                    value={s.style}
                    onChange={(e) => patchSession(i, { style: e.target.value as DanceStyle })}
                    className="h-9 rounded-xl border border-input bg-background px-2.5 text-sm"
                  >
                    {STYLES.map((st) => (
                      <option key={st}>{st}</option>
                    ))}
                  </select>
                  <Input
                    value={s.room}
                    placeholder="Room"
                    list="rooms"
                    onChange={(e) => patchSession(i, { room: e.target.value })}
                    className="h-9 w-28 px-2.5"
                  />
                  <Input
                    type="time"
                    value={s.start}
                    onChange={(e) => patchSession(i, { start: e.target.value })}
                    className="h-9 px-2.5"
                  />
                  <Input
                    type="time"
                    value={s.end}
                    onChange={(e) => patchSession(i, { end: e.target.value })}
                    className="h-9 px-2.5"
                  />
                  <button
                    onClick={() => removeSession(i)}
                    aria-label="Remove session"
                    className="flex size-9 items-center justify-center justify-self-end rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Icon icon={Cancel01Icon} size={16} />
                  </button>
                </div>
              ),
            )}
          </div>
        </div>
      ))}
      <datalist id="rooms">
        {draft.rooms.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      <Button
        onClick={onSave}
        disabled={saving || !draft.sessions.length}
        size="lg"
        className="sticky bottom-4 w-full shadow-md"
      >
        {saving ? "Saving…" : `Save event (${draft.sessions.length} sessions)`}
      </Button>
    </div>
  );
}
