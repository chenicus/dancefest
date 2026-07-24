"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  "aria-label"?: string;
}

/**
 * Pill segmented control — muted track with a white "thumb" on the active
 * segment, matching the reference calendar's M / W / D switcher.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "default",
  fullWidth = false,
  rounded = "full",
  tone = "accent",
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "default" | "sm";
  /** Stretch the track to its container and distribute segments evenly. */
  fullWidth?: boolean;
  /** Corner style — "full" pill (default) or "md" for a squarer tab look. */
  rounded?: "full" | "md";
  /**
   * "accent" (default): one shared pill track (bg-secondary) with a solid
   * thumb on the active segment — the theme's cool-slate tint.
   * "neutral": one muted grey track with an elevated white "card" on the
   * active segment — iOS-style, selection reads by elevation, never a dark
   * fill.
   */
  tone?: "accent" | "neutral";
  className?: string;
}) {
  const trackRadius = rounded === "full" ? "rounded-full" : "rounded-lg";
  const segmentRadius = rounded === "full" ? "rounded-full" : "rounded-md";
  return (
    <div
      role="tablist"
      className={cn(
        "items-center gap-1",
        tone === "neutral" ? "bg-neutral-100 p-1 dark:bg-neutral-800" : "bg-secondary p-1",
        fullWidth ? "flex" : "inline-flex",
        trackRadius,
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            aria-label={opt["aria-label"]}
            onClick={() => onChange(opt.value)}
            className={cn(
              "font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              segmentRadius,
              fullWidth && "flex-1",
              size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
              tone === "neutral"
                ? active
                  ? "bg-white text-neutral-900 shadow-[0_1px_4px_rgba(0,0,0,0.12)] dark:bg-neutral-600 dark:text-white"
                  : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                : active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
