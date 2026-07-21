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
