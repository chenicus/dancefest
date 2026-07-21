import { Redis } from "@upstash/redis";
import { promises as fs } from "fs";
import path from "path";
import type { FestivalEvent } from "../types";

const INDEX_KEY = "events:index";
const eventKey = (id: string) => `event:${id}`;

/** Upstash in prod (and dev once connected); JSON files under .data/ before
 *  the Redis env vars exist so local work never blocks on account setup. */
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

const DATA_DIR = path.join(process.cwd(), ".data");

async function fileRead(id: string): Promise<FestivalEvent | null> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${id}.json`), "utf8");
    return JSON.parse(raw) as FestivalEvent;
  } catch {
    return null;
  }
}

export async function getEvent(id: string): Promise<FestivalEvent | null> {
  if (redis) return (await redis.get<FestivalEvent>(eventKey(id))) ?? null;
  return fileRead(id);
}

export async function listEvents(): Promise<FestivalEvent[]> {
  if (redis) {
    const ids = (await redis.get<string[]>(INDEX_KEY)) ?? [];
    if (!ids.length) return [];
    const events = await Promise.all(ids.map((id) => redis.get<FestivalEvent>(eventKey(id))));
    return events.filter((e): e is FestivalEvent => e !== null);
  }
  try {
    const files = await fs.readdir(DATA_DIR);
    const events = await Promise.all(
      files.filter((f) => f.endsWith(".json")).map((f) => fileRead(f.replace(/\.json$/, ""))),
    );
    return events
      .filter((e): e is FestivalEvent => e !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function saveEvent(event: FestivalEvent): Promise<void> {
  if (redis) {
    await redis.set(eventKey(event.id), event);
    const ids = (await redis.get<string[]>(INDEX_KEY)) ?? [];
    if (!ids.includes(event.id)) await redis.set(INDEX_KEY, [event.id, ...ids]);
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, `${event.id}.json`), JSON.stringify(event, null, 2));
}

export async function deleteEvent(id: string): Promise<void> {
  if (redis) {
    await redis.del(eventKey(id));
    const ids = (await redis.get<string[]>(INDEX_KEY)) ?? [];
    await redis.set(INDEX_KEY, ids.filter((x) => x !== id));
    return;
  }
  await fs.rm(path.join(DATA_DIR, `${id}.json`), { force: true });
}
