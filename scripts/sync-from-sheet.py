#!/usr/bin/env python3
"""Sync hellodancefest-2026's schedule/artists from the organizers' public
Google Sheet (view-only, no sign-in needed) into .data/hellodancefest-2026.json.

Usage: python3 scripts/sync-from-sheet.py [--apply]

Without --apply, only prints a diff summary against the current .data file.
Pass --apply to back up the current file and write the rebuilt one.

Re-run this whenever the organizers update the sheet. New artist names that
don't fuzzy-match an existing artist are created without a photo/bioUrl —
same as any brand-new instructor added through the normal import flow.
"""
import csv
import io
import json
import re
import shutil
import string
import subprocess
import sys
import random
import difflib
import copy
from datetime import datetime, timezone
from pathlib import Path

SHEET_ID = "1Phzou1q71mdtwwct1EoKPW5q_8jDTQhLUEkhlA6_bqY"
GIDS = {
    "friday": 1631042477,
    "saturday": 1740721336,
    "sunday": 1856953379,
    "dj-friday": 849955427,
    "dj-saturday": 513970288,
    "dj-sunday": 529728564,
}

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / ".data" / "hellodancefest-2026.json"
EVENT_ID = "hellodancefest-2026"

ROOM_MAP = {
    "Peninsula D or E-F-G": "Peninsula D-G",
    "Peninsula E-F-G": "Peninsula D-G",
    "Peninsula A-B": "Peninsula A-B",
    "Harbour": "Harbour",
    "Bayside": "Bayside",
    "Regency": "Regency",
    "Peninsula C": "Peninsula C",
    "Sandpebble A-B-C": "Sandpebble A-C",
    "Sandpebble D-E": "Sandpebble D-E",
    "Main Ballroom": "Main Ballroom",
}
STYLE_COLS = {2: "bachata", 3: "bachata", 4: "kizomba", 5: "other", 6: "salsa", 7: "salsa", 8: "zouk", 9: "zouk"}
TIME_RE = re.compile(r'^\d{1,2}:\d{2}\s*(AM|PM)$')
FLAG_RE = re.compile(r'[\U0001F1E6-\U0001F1FF\U0001F300-\U0001FAFF]+')
STOP = {"and", "dj", "the", "de"}

SPECIAL_SESSIONS = [
    {"title": "Performance Showcase", "instructors": [], "style": "other", "room": "Main Ballroom",
     "day": "2026-07-24", "start": "21:00", "end": "23:00", "type": "performance"},
    {"title": "Battle Royale", "instructors": [], "style": "bachata", "level": "Open Level",
     "room": "Peninsula A-B", "day": "2026-07-25", "start": "18:30", "end": "19:30", "type": "competition"},
    {"title": "Daytime Dancing", "instructors": ["DJ OLU", "DJ SINK"], "style": "kizomba",
     "level": "Kizomba & Urban Kiz", "room": "Harbour", "day": "2026-07-25", "start": "17:00", "end": "20:00", "type": "social"},
    {"title": "Practica & Dancing", "instructors": ["DJ TBA"], "style": "zouk", "room": "Regency",
     "day": "2026-07-25", "start": "19:00", "end": "20:00", "type": "social"},
    {"title": "JnJ Competition", "instructors": [], "style": "zouk", "level": "Novice–Intermediate–Advance",
     "room": "Regency", "day": "2026-07-25", "start": "20:00", "end": "21:00", "type": "competition"},
    {"title": "Performance Showcase", "instructors": [], "style": "other", "room": "Main Ballroom",
     "day": "2026-07-25", "start": "21:00", "end": "23:00", "type": "performance"},
    {"title": "Daytime Dancing", "instructors": ["DJ WHOMAN", "DJ KRIS KROS"], "style": "bachata",
     "styles": ["salsa", "bachata"], "level": "Bachata & Salsa", "room": "Peninsula A-B",
     "day": "2026-07-26", "start": "17:00", "end": "20:00", "type": "social"},
    {"title": "Practica & Day Dancing", "instructors": ["DJ TBA"], "style": "zouk", "room": "Regency",
     "day": "2026-07-26", "start": "19:00", "end": "20:00", "type": "social"},
    {"title": "JnJ Competition", "instructors": [], "style": "zouk", "level": "Novice–Intermediate–Advance",
     "room": "Regency", "day": "2026-07-26", "start": "20:00", "end": "21:00", "type": "competition"},
    {"title": "Performance Showcase", "instructors": [], "style": "other", "room": "Main Ballroom",
     "day": "2026-07-26", "start": "21:00", "end": "23:00", "type": "performance"},
]

DJ_ROOM_COLS = {
    "friday": [("bachata", 1, 2, "Main Ballroom"), ("kizomba", 4, 5, "Harbour"),
               ("salsa", 7, 8, "Peninsula A-B"), ("zouk", 10, 11, "Regency")],
    "saturday": [("bachata", 1, 2, "Main Ballroom"), ("kizomba", 4, 5, "Harbour"),
                 ("salsa", 7, 8, "Regency"), ("zouk", 10, 11, "Peninsula A-B")],
    "sunday": [("bachata", 1, 2, "Regency"), ("kizomba", 4, 5, "Harbour"),
               ("salsa", 7, 8, "Peninsula A-B"), ("zouk", 10, 11, "Peninsula C")],
}
DAY_ISO = {"friday": "2026-07-24", "saturday": "2026-07-25", "sunday": "2026-07-26"}


def fetch_csv(gid):
    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={gid}"
    out = subprocess.run(["curl", "-sL", url], capture_output=True, check=True)
    return list(csv.reader(io.StringIO(out.stdout.decode("utf-8"))))


def clean_text(s):
    return FLAG_RE.sub('', s).strip().rstrip(',').strip()


def to24(t):
    m = re.match(r'(\d{1,2}):(\d{2})\s*(AM|PM)', t)
    h, mi, ap = int(m.group(1)), int(m.group(2)), m.group(3)
    h = (0 if h == 12 else h) if ap == "AM" else (12 if h == 12 else h + 12)
    return f"{h:02d}:{mi:02d}"


def night_minutes(hhmm):
    h, m = map(int, hhmm.split(":"))
    return ((h + 24) if h < 12 else h) * 60 + m


def fmt_nm(nm):
    h, m = divmod(nm, 60)
    return f"{h % 24:02d}:{m:02d}"


def parse_workshop(rows, day_iso):
    rooms_row = rows[1]
    room_names = {c: ROOM_MAP.get(rooms_row[c].strip(), rooms_row[c].strip()) for c in range(2, 10)}
    sessions = []
    data_rows = []
    for r in rows[2:]:
        t = r[0].strip() if TIME_RE.match(r[0].strip()) else (r[1].strip() if TIME_RE.match(r[1].strip()) else None)
        if t:
            data_rows.append((to24(t), r))
    filtered = [(t, r) for t, r in data_rows if t not in ("21:00", "22:00", "23:00", "10:00")]
    filtered_times = {t for t, _ in filtered}
    filtered_order = [t for t, _ in filtered]
    for start, r in data_rows:
        end = None
        if start in filtered_times:
            idx = filtered_order.index(start)
            end = filtered_order[idx + 1] if idx + 1 < len(filtered_order) else None
        for c in range(2, 10):
            cell = r[c].strip()
            lines = [clean_text(l) for l in cell.split("\n") if l.strip()]
            lines = [l for l in lines if l]
            if not lines:
                continue
            low = lines[0].lower()
            joined = " ".join(lines).lower()
            if low in ("no class", "transition", "break time"):
                continue
            if re.search(r"\bpractica\b", joined) or any(k in joined for k in
                    ["daytime dancing", "battle royale", "jnj competition", "performance showcase"]):
                continue  # handled by SPECIAL_SESSIONS above
            if start not in filtered_times or end is None:
                continue
            if len(lines) >= 2:
                instructors, title = lines[0], lines[1]
                level = lines[2] if len(lines) > 2 else None
            else:
                instructors, title, level = None, lines[0], None
            sessions.append({
                "day": day_iso, "start": start, "end": end, "room": room_names[c],
                "style": STYLE_COLS[c], "instructors": [instructors] if instructors else [],
                "title": title, "level": level,
            })
    return sessions


def parse_dj(rows, day_iso, style_room_cols):
    room_map = {(tcol, djcol): (style, room) for style, tcol, djcol, room in style_room_cols}
    sets_by_room = {}
    for r in rows[2:]:
        if len(r) < 12:
            continue
        for (tcol, djcol), (style, room) in room_map.items():
            tval = r[tcol].strip()
            dj = clean_text(r[djcol].strip())
            if not TIME_RE.match(tval) or not dj or dj.upper() in ("CLOSED", "TRANSITION"):
                continue
            sets_by_room.setdefault(room, []).append({"start": to24(tval), "dj": dj, "style": style})
    out = []
    for room, sets in sets_by_room.items():
        sets.sort(key=lambda s: night_minutes(s["start"]))
        for i, s in enumerate(sets):
            start_nm = night_minutes(s["start"])
            end_nm = night_minutes(sets[i + 1]["start"]) if i + 1 < len(sets) else start_nm + 60
            out.append({"day": day_iso, "room": room, "style": s["style"], "dj": s["dj"],
                        "start": fmt_nm(start_nm), "end": fmt_nm(end_nm)})
    return out


def nanoid(n=8):
    alphabet = string.ascii_letters + string.digits
    return "".join(random.choice(alphabet) for _ in range(n))


def norm(name):
    s = name.lower()
    s = re.sub(r"[^a-z0-9&,]+", " ", s).replace("&", " and ")
    return re.sub(r"\s+", " ", s).strip()


def tokens(name):
    s = re.sub(r"[^a-z0-9\s&]", " ", name.lower()).replace("&", " ")
    return [w for w in s.split() if len(w) >= 3 and w not in STOP]


def token_overlap_score(new_toks, old_toks):
    if not new_toks or not old_toks:
        return 0.0
    matched, pool = 0, list(old_toks)
    for t in new_toks:
        best, best_r = None, 0
        for o in pool:
            r = difflib.SequenceMatcher(None, t, o).ratio()
            if r > best_r:
                best_r, best = r, o
        if best_r >= 0.82:
            matched += 1
            pool.remove(best)
    return matched / max(len(new_toks), len(old_toks))


def main():
    apply = "--apply" in sys.argv

    print("Fetching sheet tabs...")
    raw = {name: fetch_csv(gid) for name, gid in GIDS.items()}

    workshop_sessions = []
    for day in ("friday", "saturday", "sunday"):
        workshop_sessions += parse_workshop(raw[day], DAY_ISO[day])

    party_sets = []
    for day in ("friday", "saturday", "sunday"):
        party_sets += parse_dj(raw[f"dj-{day}"], DAY_ISO[day], DJ_ROOM_COLS[day])

    cur = json.loads(DATA_FILE.read_text())
    existing_artists = copy.deepcopy(cur["artists"])
    by_norm = {}
    for a in existing_artists:
        by_norm.setdefault(norm(a["name"]), []).append(a)
    existing_tok = {a["id"]: tokens(a["name"]) for a in existing_artists}
    used_ids, new_names = set(), []

    def resolve_artist(name, style):
        key = norm(name)
        if key in by_norm:
            cand = by_norm[key][0]
            used_ids.add(cand["id"])
            return cand["id"]
        best_a, best_score = None, 0.0
        for a in existing_artists:
            score = token_overlap_score(tokens(name), existing_tok[a["id"]])
            if score > best_score:
                best_score, best_a = score, a
        if best_a and best_score >= 0.85:
            used_ids.add(best_a["id"])
            return best_a["id"]
        new_a = {"id": nanoid(), "eventId": EVENT_ID, "name": name, "style": style}
        existing_artists.append(new_a)
        existing_tok[new_a["id"]] = tokens(name)
        by_norm.setdefault(key, []).append(new_a)
        new_names.append(name)
        return new_a["id"]

    final_sessions = []
    for s in workshop_sessions:
        ids = [resolve_artist(n, s["style"]) for n in s["instructors"] if n]
        final_sessions.append({
            "id": nanoid(), "eventId": EVENT_ID, "title": s["title"], "instructors": s["instructors"],
            "style": s["style"], **({"level": s["level"]} if s.get("level") else {}),
            "room": s["room"], "day": s["day"], "start": s["start"], "end": s["end"],
            **({"artistIds": ids} if ids else {}),
        })
    for sp in SPECIAL_SESSIONS:
        sp2 = copy.deepcopy(sp)
        if sp2["instructors"]:
            sp2["artistIds"] = [resolve_artist(n, sp2["style"]) for n in sp2["instructors"]]
        final_sessions.append({"id": nanoid(), "eventId": EVENT_ID, **sp2})
    for p in party_sets:
        dj_id = resolve_artist(p["dj"], p["style"])
        final_sessions.append({
            "id": nanoid(), "eventId": EVENT_ID, "title": p["dj"], "instructors": [p["dj"]],
            "style": p["style"], "room": p["room"], "day": p["day"], "start": p["start"], "end": p["end"],
            "type": "party", "artistIds": [dj_id],
        })

    old_ids = {a["id"] for a in cur["artists"]}
    dropped = [a["name"] for a in cur["artists"] if a["id"] not in used_ids]

    def content_key(s):
        return (s["day"], s["start"], s["room"])

    def content_sig(s):
        return (s["title"].strip(), ", ".join(s.get("instructors") or []).strip(), (s.get("level") or "").strip(), s["end"])

    old_by_key = {content_key(s): s for s in cur["sessions"]}
    new_by_key = {content_key(s): s for s in final_sessions}
    removed_keys = sorted(set(old_by_key) - set(new_by_key))
    added_keys = sorted(set(new_by_key) - set(old_by_key))
    changed_keys = sorted(k for k in set(old_by_key) & set(new_by_key)
                          if content_sig(old_by_key[k]) != content_sig(new_by_key[k]))
    total_diff = len(removed_keys) + len(added_keys) + len(changed_keys)

    print(f"\nSessions: {len(cur['sessions'])} -> {len(final_sessions)}")
    print(f"Content diff: {len(changed_keys)} changed, {len(added_keys)} added, {len(removed_keys)} removed (by day/time/room slot)")
    print(f"Artists: {len(cur['artists'])} -> {len(existing_artists)} ({len(new_names)} new, {len(dropped)} no longer referenced)")
    if new_names:
        print("New artists (no photo yet):", ", ".join(new_names))
    if dropped:
        print("No longer referenced:", ", ".join(dropped))

    if total_diff == 0:
        print("\nNO CHANGES since last sync.")
    else:
        print(f"\nCHANGES DETECTED: {total_diff} slot(s) differ from the currently-installed data.")
        for k in changed_keys[:20]:
            o, n = old_by_key[k], new_by_key[k]
            print(f"  CHANGED {k[0]} {k[1]} {k[2]}: '{o['title']}' ({', '.join(o.get('instructors') or [])}) "
                  f"-> '{n['title']}' ({', '.join(n.get('instructors') or [])})")
        for k in added_keys[:20]:
            n = new_by_key[k]
            print(f"  ADDED {k[0]} {k[1]} {k[2]}: '{n['title']}' ({', '.join(n.get('instructors') or [])})")
        for k in removed_keys[:20]:
            o = old_by_key[k]
            print(f"  REMOVED {k[0]} {k[1]} {k[2]}: '{o['title']}' ({', '.join(o.get('instructors') or [])})")

    if not apply:
        print("\nDry run only. Re-run with --apply to write .data/hellodancefest-2026.json.")
        return

    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    backup = DATA_FILE.with_name(f"hellodancefest-2026.pre-sheet-sync-{ts}.json")
    shutil.copy(DATA_FILE, backup)
    print(f"\nBacked up current data to {backup.name}")

    new_event = copy.deepcopy(cur)
    new_event["sessions"] = final_sessions
    new_event["artists"] = existing_artists
    new_event["rooms"] = sorted(set(s["room"] for s in final_sessions))
    new_event["scheduleSyncedAt"] = datetime.now(timezone.utc).isoformat()
    new_event["scheduleSourceUrl"] = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit"
    DATA_FILE.write_text(json.dumps(new_event, indent=2))
    print(f"Wrote {DATA_FILE}")


if __name__ == "__main__":
    main()
