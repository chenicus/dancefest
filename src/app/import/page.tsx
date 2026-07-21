"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft01Icon,
  ImageUploadIcon,
  Link01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { ExtractionReview } from "@/components/import/ExtractionReview";
import { fileToImageInput } from "@/lib/downscale";
import type { ExtractionResult } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const LOADING_STAGES = [
  "Reading the schedule…",
  "Sorting sessions into rooms…",
  "Matching instructors…",
  "Picking up the branding…",
];

export default function ImportPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<ExtractionResult | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!busy) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, LOADING_STAGES.length - 1)), 6000);
    return () => clearInterval(t);
  }, [busy]);

  const runExtraction = useCallback(async (endpoint: string, body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Extraction failed");
      setDraft(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setBusy(false);
    }
  }, []);

  async function handleFiles(files: FileList | File[] | null) {
    if (!files || !files.length) return;
    const images = await Promise.all([...files].slice(0, 4).map(fileToImageInput));
    runExtraction("/api/extract/screenshot", { images });
  }

  async function handleUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    runExtraction("/api/extract/url", { url: url.trim() });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.push(`/event/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-16">
      <header className="flex items-center gap-3 py-5">
        <Link
          href="/"
          aria-label="Back to events"
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        >
          <Icon icon={ArrowLeft01Icon} size={20} />
        </Link>
        <h1 className="wordmark text-2xl">Import a festival</h1>
      </header>

      {!draft && !busy && (
        <div className="flex flex-col gap-5">
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex min-h-52 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
              dragOver ? "border-primary bg-secondary/60" : "border-input hover:bg-secondary/30",
            )}
          >
            <span className="mb-1 flex size-14 items-center justify-center rounded-2xl bg-secondary">
              <Icon icon={ImageUploadIcon} size={26} className="text-muted-foreground" />
            </span>
            <p className="text-lg font-medium">Drop schedule screenshots</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Up to 4 photos of the timetable — different days are merged into one event
            </p>
            <span className={cn(buttonVariants({ size: "sm" }), "mt-2 pointer-events-none")}>
              Choose images
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleUrl} className="flex gap-2">
            <div className="relative flex-1">
              <Icon
                icon={Link01Icon}
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="hellodancefest.com/program"
                inputMode="url"
                className="pl-10"
              />
            </div>
            <Button type="submit">Import</Button>
          </form>
        </div>
      )}

      {busy && (
        <div className="flex flex-col items-center gap-4 py-20 text-center" role="status">
          <Icon icon={Loading03Icon} size={32} className="animate-spin-smooth text-muted-foreground" />
          <p className="text-foreground">{LOADING_STAGES[stage]}</p>
          <p className="text-xs text-muted-foreground">Usually 10–30 seconds</p>
        </div>
      )}

      {error && !busy && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {draft && !busy && (
        <ExtractionReview draft={draft} onChange={setDraft} onSave={save} saving={saving} />
      )}
    </main>
  );
}
