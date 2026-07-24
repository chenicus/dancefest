---
name: artist-instagrams
description: Fill in the artist Instagram links missing from the schedule, by reading the festival's own lineup posts in a logged-in browser. Use when artists in .data/hellodancefest-2026.json have no igLinks, when a sheet sync adds new instructors, or when the user asks to collect, refresh, or fix artist Instagram handles. Requires a machine with a browser and an Instagram login — this cannot be done from a cloud session.
---

# Filling in missing artist Instagram links

Most artists get their photo and links from their bio page on the festival
site. The ones that don't are the ones the organizers only ever typed into
their spreadsheet: local guest instructors and DJs listed by stage name
("DJ X", "Nav & Kat", "Ali Loo"). They have no bio page, and search engines
can't place them — but the festival tags them in its own lineup posts.

Those posts need a logged-in Instagram session, so this only works on a
machine with a browser. Run it there.

## The loop

**1. See what's actually missing.**

```
python3 scripts/backfill-artist-media.py
```

The tail of the output lists every incomplete artist. Handles are what this
skill fills; photos are a separate problem (see "Photos" below).

**2. Collect candidates.**

```
node scripts/collect-ig-handles.mjs                    # @hellobachata + @hellokizomba
node scripts/collect-ig-handles.mjs --accounts hellozouk --posts 60
```

First run opens a browser window; if Instagram shows a login wall, the user
logs in there once and the session is saved to `.data/.ig-session`. Output is
`.data/ig-candidates.json`: every `@handle` seen, each with the caption text
around it and a link to the post.

**3. Match candidates to artists — this is the part that needs judgment.**

Read `.data/ig-candidates.json` and pair handles with the missing artists.
The caption snippet is the evidence. A pairing is good enough to keep when
the post ties the handle to that artist:

- the caption names the artist next to the handle ("Bachata with Ali Loo
  @aliloo"), or
- the handle is the artist's name in an obvious form and the post is that
  artist's own lineup announcement.

Reject, and leave the artist empty:

- a handle that merely appears in the same post as the name (lineup posts tag
  a dozen accounts at once — position alone proves nothing),
- a same-named stranger from a different city or dance,
- a venue, promoter, or festival account standing in for a person.

An empty card is fine. A wrong handle sends someone to a stranger's profile,
and nobody looking at the app can tell it's wrong. When a pairing is
arguable, ask the user rather than guessing — quote the snippet so they can
judge it in one glance.

**4. Write the ones that survive** into `.data/ig-handles.json` under
`artists`, keyed by the artist's name exactly as it appears in the schedule:

```json
"Ali Loo": [
  { "handle": "aliloo", "label": "Ali", "kind": "individual",
    "source": "@hellobachata lineup post 2026-05-12: 'Bachata with Ali Loo @aliloo'" }
]
```

`source` is not decoration — it's how the next person (or the next you)
re-checks the claim without redoing the research. Quote the evidence.
`label` is what shows at the right of the row in the artist sheet: a first
name for a person, the act's name for a company. Use `"kind": "joint"` only
for an account a couple shares.

**5. Apply and check.**

```
python3 scripts/backfill-artist-media.py            # dry run: what would change
python3 scripts/backfill-artist-media.py --apply
npm run test
```

Then commit `.data/ig-handles.json` and `.data/hellodancefest-2026.json`
together, with a message saying where the handles came from.

## Notes

- The collector only reads. It doesn't like, follow, or comment, and it
  pauses between page loads. Keep `--posts` modest; there's no reason to walk
  an account's whole history to find a lineup announcement.
- `.data/ig-candidates.json` and `.data/.ig-session/` are gitignored. The
  candidates file is raw scrape — never treat it as the source of truth, and
  never copy it wholesale into `ig-handles.json`.
- Re-running is safe. The backfill only ever writes fields that are empty, so
  it won't overwrite a handle someone already curated.
- **Photos** aren't solved by this. Instagram profile-picture URLs are signed
  and expire within days, so they can't be stored as `photoUrl`. A photo has
  to be a file committed under `public/artists/` or a URL on a host that keeps
  serving it, like the festival's own site.
