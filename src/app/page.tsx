import Link from "next/link";
import {
  Add01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  Menu01Icon,
  MusicNote01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { FIXTURE_EVENT } from "@/lib/fixtures";
import { listEvents } from "@/lib/store/events";
import { dayLabel } from "@/lib/schedule/time";
import { Button, buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Soft translucent tint from an event accent, for the card wash. */
function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n)) return `rgba(23, 22, 26, ${alpha})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export default async function HomePage() {
  const events = await listEvents();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-20">
      <header className="flex items-center justify-between py-5">
        <span className="wordmark text-2xl">
          DanceFest<span className="text-muted-foreground">*</span>
        </span>
        <Button variant="ghost" size="icon" aria-label="Menu">
          <Icon icon={Menu01Icon} size={22} />
        </Button>
      </header>

      <div className="flex items-center justify-between border-t border-border pt-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
            <Icon icon={Calendar03Icon} size={22} />
          </span>
          <div>
            <h1 className="text-xl font-semibold leading-tight">Festivals</h1>
            <p className="text-sm text-muted-foreground">
              {events.length ? `${events.length} saved` : "Nothing yet"}
            </p>
          </div>
        </div>
        <Link href="/import" aria-label="Import event" className={cn(buttonVariants({ size: "icon" }))}>
          <Icon icon={Add01Icon} size={22} />
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-8 text-center">
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-card shadow-sm">
            <Icon icon={SparklesIcon} size={24} />
          </span>
          <p className="text-lg font-medium">Add your first festival</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            Drop in schedule screenshots or paste the event website, and get a tappable
            timetable with your own picks.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2.5">
            <Link href="/import" className={cn(buttonVariants())}>
              <Icon icon={Add01Icon} size={18} />
              Import event
            </Link>
            <Link href={`/event/${FIXTURE_EVENT.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
              Try the sample
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/event/${e.id}`}
              className="group flex items-center gap-4 rounded-2xl border border-transparent p-4 transition-colors hover:border-border"
              style={{ background: tint(e.theme.accent, 0.1) }}
            >
              <span
                aria-hidden
                className="flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm"
                style={{ background: e.theme.accent }}
              >
                <Icon icon={MusicNote01Icon} size={20} className="text-white" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{e.name}</span>
                <span className="truncate text-sm text-muted-foreground">
                  {e.dates.start && e.dates.end
                    ? `${dayLabel(e.dates.start)} ${e.dates.start} – ${dayLabel(e.dates.end)} ${e.dates.end}`
                    : `${e.days.length} days`}
                  {" · "}
                  {e.sessions.length} sessions
                </span>
              </span>
              <Icon
                icon={ArrowRight01Icon}
                size={20}
                className="text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
              />
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
