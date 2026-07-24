#!/usr/bin/env node
/**
 * Propose Instagram handles for artists we have none for, by reading the
 * festival's own lineup posts in a browser YOU are logged into.
 *
 *   node scripts/collect-ig-handles.mjs [--accounts a,b] [--posts 40]
 *
 * Why this exists: the artists still missing a handle appear nowhere but the
 * organizers' spreadsheet — no bio page, and too locally-known for a search
 * engine to place ("DJ X", "Nav & Kat"). The festival does tag them, in its
 * own lineup posts. Those posts need a logged-in session, which a cloud agent
 * doesn't have and can't get, so this has to run on your machine.
 *
 * It only reads: it opens a profile, walks recent posts, and pulls the @handles
 * out of the captions. It never likes, follows, comments, or posts. Keep the
 * post count modest — this is a handful of page loads, not a crawler.
 *
 * First run opens a real browser window. If Instagram shows a login wall, log
 * in there by hand; the session is saved to .data/.ig-session (gitignored) and
 * later runs reuse it.
 *
 * Output: .data/ig-candidates.json — every handle seen, with the caption text
 * around it. That file is raw scrape, not truth: a handle only becomes real
 * when a human (or an agent showing its work) matches it to an artist and
 * moves it into .data/ig-handles.json, which is what the backfill reads.
 *
 * Setup, once:  npm i -D playwright && npx playwright install chromium
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_FILE = join(ROOT, ".data", "hellodancefest-2026.json");
const OUT_FILE = join(ROOT, ".data", "ig-candidates.json");
const SESSION_DIR = join(ROOT, ".data", ".ig-session");

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
};
const ACCOUNTS = arg("--accounts", "hellobachata,hellokizomba").split(",").map((s) => s.trim());
const MAX_POSTS = Number(arg("--posts", "40"));
const PAUSE = 2500; // between post loads — deliberately unhurried
// IG_BASE points the run at a local fixture instead of Instagram (that's how
// this script is tested); IG_HEADLESS=1 hides the window, which only works
// once .data/.ig-session already holds a logged-in session.
const BASE = process.env.IG_BASE ?? "https://www.instagram.com";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("Playwright isn't installed. Run:\n  npm i -D playwright && npx playwright install chromium");
  process.exit(1);
}

/** The artists this run is actually hunting for, so the output can be judged. */
function wantedArtists() {
  const event = JSON.parse(readFileSync(DATA_FILE, "utf8"));
  return event.artists
    .filter((a) => !(a.igLinks ?? []).length && !["Guest", "DJ TBA"].includes(a.name))
    .map((a) => ({ name: a.name, style: a.style }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Instagram shows a login wall as a redirect to /accounts/login. */
async function ensureLoggedIn(page) {
  if (!page.url().includes("/accounts/login")) return;
  console.log("\n  Instagram wants a login. Sign in in the browser window that just opened.");
  console.log("  Waiting (up to 10 minutes)…\n");
  for (let i = 0; i < 200; i++) {
    await sleep(3000);
    if (!page.url().includes("/accounts/login")) {
      console.log("  Signed in — carrying on.\n");
      return;
    }
  }
  throw new Error("Still on the login page after 10 minutes; nothing collected.");
}

async function postLinks(page, account) {
  await page.goto(`${BASE}/${account}/`, { waitUntil: "domcontentloaded" });
  await sleep(3000);
  await ensureLoggedIn(page);
  const seen = new Set();
  // The grid lazy-loads, so scroll until we have enough or it stops growing.
  for (let i = 0; i < 12 && seen.size < MAX_POSTS; i++) {
    const hrefs = await page.$$eval('a[href*="/p/"], a[href*="/reel/"]', (as) => as.map((a) => a.href));
    const before = seen.size;
    for (const h of hrefs) seen.add(h.split("?")[0]);
    if (seen.size === before && i > 1) break;
    await page.mouse.wheel(0, 2000);
    await sleep(1500);
  }
  return [...seen].slice(0, MAX_POSTS);
}

/** Caption text plus every @handle in it, with the words around each mention. */
async function readPost(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await sleep(1800);
  const text = await page.evaluate(() => document.body.innerText ?? "");
  const date = await page.$eval("time[datetime]", (t) => t.getAttribute("datetime")).catch(() => null);
  const handles = {};
  for (const m of text.matchAll(/@([A-Za-z0-9._]{2,30})/g)) {
    const handle = m[1].replace(/\.$/, "").toLowerCase();
    if (handles[handle]) continue;
    const from = Math.max(0, m.index - 120);
    handles[handle] = text.slice(from, m.index + m[0].length + 120).replace(/\s+/g, " ").trim();
  }
  return { url, date, handles };
}

const wanted = wantedArtists();
console.log(`Hunting handles for ${wanted.length} artist(s):`);
console.log(wanted.map((a) => `  ${a.name} (${a.style})`).join("\n"));
console.log(`\nReading up to ${MAX_POSTS} posts from: ${ACCOUNTS.map((a) => "@" + a).join(", ")}\n`);

mkdirSync(SESSION_DIR, { recursive: true });
const ctx = await chromium.launchPersistentContext(SESSION_DIR, {
  headless: process.env.IG_HEADLESS === "1",
  viewport: { width: 1280, height: 900 },
});
const page = ctx.pages()[0] ?? (await ctx.newPage());

const posts = [];
const byHandle = {};
try {
  for (const account of ACCOUNTS) {
    let links = [];
    try {
      links = await postLinks(page, account);
    } catch (err) {
      console.log(`  @${account}: ${err.message}`);
      continue;
    }
    console.log(`  @${account}: ${links.length} post(s)`);
    for (const [i, url] of links.entries()) {
      try {
        const post = await readPost(page, url);
        posts.push({ account, ...post, handles: Object.keys(post.handles) });
        for (const [handle, snippet] of Object.entries(post.handles)) {
          (byHandle[handle] ??= []).push({ post: url, date: post.date, snippet });
        }
        process.stdout.write(`\r    post ${i + 1}/${links.length} — ${Object.keys(byHandle).length} handles so far`);
      } catch {
        /* one unreadable post shouldn't end the run */
      }
      await sleep(PAUSE);
    }
    process.stdout.write("\n");
  }
} finally {
  await ctx.close();
}

// The festival's own accounts show up in every caption — not a lead.
for (const own of ACCOUNTS) delete byHandle[own.toLowerCase()];

writeFileSync(
  OUT_FILE,
  JSON.stringify({ collectedAt: new Date().toISOString(), accounts: ACCOUNTS, wanted, posts, handles: byHandle }, null, 2),
);
console.log(`\nWrote ${Object.keys(byHandle).length} candidate handle(s) from ${posts.length} post(s) to ${OUT_FILE}`);
console.log("Next: match them to the artists above, then move the confident ones into .data/ig-handles.json");
console.log("      (the /artist-instagrams skill walks a Claude session through exactly that).");
