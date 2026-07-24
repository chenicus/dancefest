#!/usr/bin/env python3
"""Fill in artist photos and Instagram links the sheet sync can't supply.

Usage: python3 scripts/backfill-artist-media.py [--apply]

The sheet (scripts/sync-from-sheet.py) only knows the short name printed in a
schedule cell — "Ngoc & Tien", "MKiZ", "Kakah & Guest" — so any name that
doesn't fuzzy-match an existing record is created bare: no photo, no bioUrl, no
Instagram. This script fills those in from sources the sync can't reach:

  1. PARTY SETS — the DJ tab's own embedded headshots and researched handles
     already live on `parties[].sets[]` (see scripts/seed-parties.ts). Every DJ
     also exists as an `artists[]` record, and that copy was never given them.

  2. SAME_ARTIST — the schedule's short name for someone who is already in the
     roster under their full name ("Maurico & Serena" = "Maurizio Bollo &
     Serena"). They stay separate records on purpose: session.artistIds already
     point at the short-name record, and merging them would rewrite ids that
     saved picks resolve against. Instead the short name inherits the full
     record's photo, bio page, and links.

  3. .data/ig-handles.json — hand-approved handles for artists the festival
     site has no bio page for, each carrying the `source` that ties it to the
     right person. Only unambiguous matches belong there (right person, right
     dance, right scene); a plausible-looking account for a same-named stranger
     is worse than an empty card. scripts/collect-ig-handles.mjs proposes
     candidates for it by reading the festival's own lineup posts in a browser
     you're logged into — that's the one source that can't be reached from a
     cloud session.

Only ever fills a field that is empty — re-running after a sheet sync is safe,
and hand-edits to .data survive. Without --apply it just prints what it would
fill in.
"""
import copy
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / ".data" / "hellodancefest-2026.json"
HANDLES_FILE = ROOT / ".data" / "ig-handles.json"

# Short schedule name -> the roster record that is the same act. `handles`
# narrows which of that record's links carry over, for a schedule name that is
# one half of a listed couple (or one half of two different couples), and
# `labels` renames a link whose inherited label describes the act it came from
# rather than the person teaching here.
SAME_ARTIST = {
    # Same act, just written shorter in the sheet.
    "Maurico & Serena": {"from": ["Maurizio Bollo & Serena"]},
    "Mikael & Ana": {"from": ["Mikael Bozon & Ana Gomes"]},
    "Pamelita & Mike": {"from": ["Pamelita & Mike Ahombi"]},
    "Nick & Vivi": {"from": ["Nick & Vivienne"]},
    "Hector & Analiza": {"from": ["Hector Reyes and Annaliza Pena"]},
    "Javier & Kiki": {"from": ["Javier Campines and Kiki Amanno"]},
    "Ngoc & Tien": {"from": ["Ngoc Huynh & Tien Tran"]},
    "Diego Jarosky & Marika": {"from": ["Jarosky & Marika"]},
    "JAS & Hailie": {"from": ["Jose Santamaria JAS and Hailie Patton"]},
    # Teaching solo in one slot, listed as a couple elsewhere: take their own
    # handle, not their partner's and not the couple's joint account.
    "Ngoc Knockout": {"from": ["Ngoc Huynh & Tien Tran"], "handles": ["knockout_ngoc"]},
    "Cristian Vergari": {"from": ["Cristian Vergari & Yolieyh"], "handles": ["cristianvergari"]},
    "Yolieth Barragan": {"from": ["Cristian Vergari & Yolieyh"], "handles": ["yolieth_barragan1"]},
    "Yolena Kapoli": {"from": ["Dimitris & Yolena"], "handles": ["yolena.kapoli"]},
    "Johanna Pellerin": {"from": ["Patrick and Johanna"], "handles": ["johannap.official"]},
    "Linda Tavana": {"from": ["Jacopo & Linda"], "handles": []},  # own handle in RESEARCHED
    # The bio page lists no Instagram at all, so this one inherits a photo only.
    "Joshua Barbosa": {"from": ["Joshua Barbosa & Yeni Lei"]},
    # Paired up across acts for one workshop — each half brings their own.
    "Cosan & Helen": {"from": ["Cosan Caglayan", "Helen & Tony"],
                      "labels": {"helentony.zouk": "Helen"}},
    "Bruna K. & Leandro": {"from": ["Bruna Kazakevic", "Leandro & Nayara"],
                           "labels": {"leandroandnayara": "Leandro"}},
    "Sink & Masha": {"from": ["DJ Sink", "MKiZ"], "handles": ["dj_sink", "mashakizz"],
                     "labels": {"dj_sink": "Sink", "mashakizz": "Masha"}},
    # Teaching with an unannounced partner: the named half is all we can fill.
    "Alexia & Zohra": {"from": ["Alexia Meirelles"]},
    "Kakah & Guest": {"from": ["KAKAH"]},
    # Evelyn Magyari Lopez, the Evelyn of the Evelyn & Derrick listing — same
    # "Foundations of Flow" material as her solo slot here.
    "Evelyn Lopez": {"from": ["Evelyn & Derrick"], "handles": ["evelynmagyari"]},
}

# Placeholders in the sheet rather than people — never fill these in.
PLACEHOLDERS = {"Guest", "DJ TBA"}

IG = "https://www.instagram.com/"


def now_iso():
    """Millisecond UTC stamp, matching the JS `toISOString()` the app writes."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def is_couple(name):
    return " & " in name or " and " in name.lower()


def handle_of(url):
    return url.rstrip("/").rsplit("/", 1)[-1].lower()


def approved_handles():
    """Artist name -> igLinks, from .data/ig-handles.json (see its _note)."""
    if not HANDLES_FILE.exists():
        return {}
    entries = json.loads(HANDLES_FILE.read_text()).get("artists", {})
    out = {}
    for name, links in entries.items():
        out[name] = [{"url": IG + l["handle"],
                      "label": l.get("label") or name.split()[0],
                      "kind": l.get("kind", "individual")} for l in links]
    return out


def dj_media(event):
    """DJ name -> {photoUrl, igHandle} from the party sets seeded off the DJ tab."""
    out = {}
    for party in event.get("parties") or []:
        for s in party["sets"]:
            cur = out.setdefault(s["dj"], {})
            for field in ("photoUrl", "igHandle"):
                if s.get(field) and not cur.get(field):
                    cur[field] = s[field]
    return out


def main():
    apply = "--apply" in sys.argv
    event = json.loads(DATA_FILE.read_text())
    artists = copy.deepcopy(event["artists"])
    by_name = {a["name"]: a for a in artists}
    djs = dj_media(event)
    filled = []

    def fill(artist, photo=None, bio=None, links=None, source=""):
        added = []
        if photo and not artist.get("photoUrl"):
            artist["photoUrl"] = photo
            added.append("photo")
        if bio and not artist.get("bioUrl"):
            artist["bioUrl"] = bio
            added.append("bio")
        if links and not artist.get("igLinks"):
            artist["igLinks"] = links
            artist.setdefault("socialsFetchedAt", now_iso())
            added.append(f"ig({len(links)})")
        if added:
            filled.append((artist["name"], "+".join(added), source))

    # 1. DJs — headshot and handle already sitting on their party sets.
    for name, media in djs.items():
        artist = by_name.get(name)
        if not artist:
            continue
        handle = media.get("igHandle")
        fill(
            artist,
            photo=media.get("photoUrl"),
            links=[{"url": IG + handle, "label": name, "kind": "individual"}] if handle else None,
            source="party set",
        )

    # 2. Short schedule names that are someone already in the roster.
    for name, spec in SAME_ARTIST.items():
        artist = by_name.get(name)
        if not artist:
            continue  # dropped from the schedule since this map was written
        wanted = spec.get("handles")
        photo = bio = None
        links = []
        for canonical_name in spec["from"]:
            canonical = by_name.get(canonical_name)
            if not canonical:
                print(f"  ! {name}: no roster record named {canonical_name!r}")
                continue
            photo = photo or canonical.get("photoUrl")
            bio = bio or canonical.get("bioUrl")
            for link in canonical.get("igLinks") or []:
                if wanted is not None and handle_of(link["url"]) not in wanted:
                    continue
                links.append(dict(link))
        # A couple's joint account isn't one person's — relabel what a solo
        # artist inherits so their card doesn't claim someone else's handle.
        if not is_couple(name):
            for link in links:
                link["kind"] = "individual"
                link["label"] = name.split()[0]
        for link in links:
            override = spec.get("labels", {}).get(handle_of(link["url"]))
            if override:
                link["label"] = override
                link["kind"] = "individual"
        fill(artist, photo=photo, bio=bio, links=links or None,
             source="same as " + " + ".join(spec["from"]))

    # 3. Hand-approved handles for artists with no bio page to scrape.
    for name, links in approved_handles().items():
        artist = by_name.get(name)
        if not artist:
            print(f"  ! ig-handles.json lists {name!r}, who isn't in the schedule")
            continue
        fill(artist, links=links, source=HANDLES_FILE.name)

    for name, added, source in filled:
        print(f"  {name:26} {added:12} <- {source}")

    missing = [a for a in artists
               if a["name"] not in PLACEHOLDERS and (not a.get("photoUrl") or not a.get("igLinks"))]
    print(f"\nFilled {len(filled)} artist(s).")
    print(f"Still incomplete: {len(missing)} of {len(artists)} "
          f"({sum(1 for a in missing if not a.get('photoUrl'))} without a photo, "
          f"{sum(1 for a in missing if not a.get('igLinks'))} without Instagram)")
    for a in missing:
        gap = "no photo, no ig" if not a.get("photoUrl") and not a.get("igLinks") else (
            "no photo" if not a.get("photoUrl") else "no ig")
        print(f"    {a['name']:26} {gap}")

    if not apply:
        print("\nDry run only. Re-run with --apply to write .data/hellodancefest-2026.json.")
        return

    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    backup = DATA_FILE.with_name(f"hellodancefest-2026.pre-media-backfill-{ts}.json")
    shutil.copy(DATA_FILE, backup)
    event["artists"] = artists
    DATA_FILE.write_text(json.dumps(event, indent=2))
    print(f"\nBacked up to {backup.name}, wrote {DATA_FILE.name}")


if __name__ == "__main__":
    main()
