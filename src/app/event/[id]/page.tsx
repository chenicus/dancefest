import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { backfillArtistSocials } from "@/lib/extraction/socials";
import { FIXTURE_EVENT } from "@/lib/fixtures";
import { getEvent } from "@/lib/store/events";
import { themeToCssVars } from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stored = id === FIXTURE_EVENT.id ? FIXTURE_EVENT : await getEvent(id);
  if (!stored) notFound();
  // Bake in any missing Instagram links before render so artist cards always
  // have them (older events / never-opened artists). No-op once fetched.
  const event = id === FIXTURE_EVENT.id ? stored : await backfillArtistSocials(stored);

  return (
    <div style={themeToCssVars(event.theme) as React.CSSProperties} className="flex-1">
      <Suspense>
        <ScheduleView event={event} />
      </Suspense>
    </div>
  );
}
