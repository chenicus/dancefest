import { Suspense } from "react";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { themeToCssVars } from "@/lib/theme";
import type { FestivalEvent } from "@/lib/types";
import eventData from "../../.data/hellodancefest-2026.json";

// Single-festival launch: the schedule is the whole app. The event is baked in
// from the committed JSON at build time — no data store, no API, so the site
// exports to fully static HTML for GitHub Pages. Socials were already resolved
// into the JSON offline, so there is nothing to backfill at request time.
const event = eventData as unknown as FestivalEvent;

export default function HomePage() {
  return (
    <div style={themeToCssVars(event.theme) as React.CSSProperties} className="flex-1">
      <Suspense>
        <ScheduleView event={event} />
      </Suspense>
    </div>
  );
}
