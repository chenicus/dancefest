import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import { cn } from "@/lib/utils";

/**
 * Thin wrapper over Hugeicons so call sites read like `<Icon icon={...} />`
 * and inherit `currentColor` + sensible stroke defaults across the app.
 */
export function Icon({
  className,
  strokeWidth = 1.8,
  size = 20,
  ...props
}: HugeiconsIconProps) {
  return (
    <HugeiconsIcon
      className={cn("shrink-0", className)}
      strokeWidth={strokeWidth}
      size={size}
      {...props}
    />
  );
}

/**
 * Park Daddy's filter-chip checkmark — a single open path, not an icon-set
 * glyph. Hugeicons' Tick01Icon reads as a heavier, more "closed" mark at
 * small sizes; this is the exact shape/stroke used for Park Daddy's chips.
 */
export function CheckIcon({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
