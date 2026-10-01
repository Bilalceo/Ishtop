"""Insert the vetted vacancies into the site.

Every row that gets in has a contact a candidate can actually use: a phone, an
email, or an @handle that Telegram resolved to a real person or bot. Handles
that resolved to a CHANNEL are dropped here — @devs_it and @itjobsfeed are
aggregator feeds, and offering them as "the employer" is the mistake that put
130 unreachable listings on the site in the first place.

Selection favours listings that say where the work is, what it pays and what is
required, and caps how many of one role go in so the feed does not turn into
forty sales-manager posts.

--commit writes; otherwise prints the plan.
"""
import sys, re, json, uuid, pathlib, collections
import pg8000.native
import urllib.parse as u
from datetime import datetime, timezone, timedelta

dsn, structured, kinds_path = sys.argv[1], sys.argv[2], sys.argv[3]
want = int(sys.argv[4])
commit = "--commit" in sys.argv

COMPANY_ID = "479f2973-7bdc-4489-a0fb-55c4afce97a4"  # telegram-import@ishtopuz.uz


def _job_type(p: dict) -> str:
    """Part-time wins over remote: job_type holds one value, and remote is
    still recorded in is_remote_allowed (which the "Masofadan" filter reads).
    Printed in the dry run — check it there: a multi-role post can say
    "yarim kunlik" about a different role than the one being imported."""
    if p.get("is_part_time"):
        return "part_time"
    return "remote" if p["is_remote"] else "full_time"
MAX_PER_ROLE = 4

# Posts sometimes carry an example number in a template ("+998 90 123 45 67").
# It parses as a valid phone and reaches the candidate as a dead line, so treat
# a sequential or single-digit body as no number at all.
def real_phone(raw: str) -> bool:
    body = re.sub(r"\D", "", raw)[-9:]
    if len(body) < 9:
        return False
    if len(set(body)) <= 2:
        return False
    return body[2:] not in ("1234567", "7654321", "0000000") and \
        not re.match(r"^(\d)(?:\1{6,})$", body[2:])


sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
# Discovery slugs decide whether a listing shows on the city and profession
# pages at all. Every row imported before 2026-10-01 went in without them, so
# the whole catalogue was invisible to those filters and absent from the
# sitemap. Derive them with the app's own helpers so an import cannot
# reintroduce that.
from app.services.discovery import (  # noqa: E402
    city_slug_from_location, profession_slug_from_title,
)

rows = json.load(open(structured, encoding="utf-8"))
kinds = json.load(open(kinds_path, encoding="utf-8"))

d = u.urlparse(dsn)
db = pg8000.native.Connection(user=d.username, password=d.password, host=d.hostname,
                              port=d.port, database=d.path[1:])

# --- what is already here ----------------------------------------------------
existing_contacts = set()
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
for c, in db.run("select contact_info from jobs where is_deleted=false and coalesce(contact_info,'')<>''"):
    # Emails first, and struck out before the handle scan: "hr_uz@biotact.de"
    # would otherwise also read as the handle "@biotact".
    for e in EMAIL_RE.findall(c):
        existing_contacts.add(e.lower())
    c = EMAIL_RE.sub(" ", c)
    for ph in re.findall(r"\d{7,}", c.replace(" ", "")):
        existing_contacts.add(ph[-9:])
    for h in re.findall(r"@([A-Za-z0-9_]{4,32})", c):
        existing_contacts.add(h.lower())
# The same Telegram post must never go in twice (one did, three times).
existing_sources = {u for u, in db.run(
    "select external_apply_url from jobs where coalesce(external_apply_url,'')<>''")}

picked, per_role, skipped = [], collections.Counter(), collections.Counter()
# Newest first. A vacancy posted today is still open; one from six weeks ago has
# most likely been filled, and a candidate who calls it gets told so. Within the
# same day, prefer the listing that states city, pay and requirements.
rows.sort(key=lambda r: (r["date"],
                         bool(r["city"]) + bool(r["salary_min"]) +
                         bool(r["requirements"]) + bool(r["responsibilities"])),
          reverse=True)

# Russian posts are not published as Russian: the site is Uzbek. Pass
# --translations uz.json ({"<channel>/<msg_id>": {"title", "description",
# "requirements", "responsibilities", "benefits"}}) to publish them translated;
# without one they are listed and skipped.
TRANSLATIONS = {}
if "--translations" in sys.argv:
    TRANSLATIONS = json.load(open(sys.argv[sys.argv.index("--translations") + 1], encoding="utf-8"))
needs_translation = []

for r in rows:
    if len(picked) >= want:
        break
    key = f"{r['channel']}/{r['msg_id']}"
    if r.get("lang") == "ru":
        if key not in TRANSLATIONS:
            needs_translation.append((key, r["title"]))
            skipped["tarjima kerak (ruscha)"] += 1
            continue
        # The post as written becomes the Russian version on the site.
        orig_ru = {k: r[k] for k in ("title", "description", "requirements",
                                    "responsibilities", "benefits") if r.get(k)}
        r = {**r, **{k: v for k, v in TRANSLATIONS[key].items() if k != "ru"},
             "_translations": {"ru": orig_ru}}
    elif key in TRANSLATIONS and TRANSLATIONS[key].get("ru"):
        # An Uzbek post can be given its Russian version the same way.
        r = {**r, "_translations": {"ru": TRANSLATIONS[key]["ru"]}}
    handles = [h for h in r["handles"] if kinds.get(h, {}).get("kind") in ("odam", "bot")]
    phones = [p.strip() for p in r["phones"] if real_phone(p)]
    parts = (phones + [f"@{h}" for h in handles]
             + list(r["emails"][:1]))
    contact = ", ".join(dict.fromkeys(parts))
    if not contact:
        skipped["kontaktsiz"] += 1
        continue

    role = re.sub(r"\s*\([^)]*\)\s*$", "", r["title"]).strip().lower()
    if per_role[role] >= MAX_PER_ROLE:
        skipped["rol limiti"] += 1
        continue

    title = r["title"]
    # A different employer hiring for the same role is a different vacancy, so
    # the title alone never disqualifies one — the employer's contact does.
    # MAX_PER_ROLE is what keeps the feed from filling with one job name.
    # Emails belong in it: an employer whose only contact was an email was
    # re-imported on every run — BIOTACT DEUTSCHLAND ended up listed 9 times.
    fingerprint = ({re.sub(r"\D", "", p)[-9:] for p in phones} | {h.lower() for h in handles}
                   | {e.lower() for e in r["emails"][:1]})
    if f"https://t.me/{r['channel']}/{r['msg_id']}" in existing_sources:
        skipped["post allaqachon bor"] += 1
        continue
    if fingerprint & existing_contacts:
        skipped["kontakt bor"] += 1
        continue

    picked.append({**r, "contact": contact, "handles": handles, "phones": phones})
    per_role[role] += 1
    existing_contacts |= fingerprint

print(f"tanlandi: {len(picked)} / {want}")
print("o'tkazib yuborildi:", dict(skipped))
print("\nrollar:", dict(collections.Counter(
    re.sub(r"\s*\([^)]*\)\s*$", "", p["title"]) for p in picked).most_common()))
print()
for i, p in enumerate(picked, 1):
    sal = (f"{p['salary_min']//1_000_000}"
           + (f"-{p['salary_max']//1_000_000}" if p["salary_max"] else "+")
           + " mln") if p["salary_min"] else "—"
    print(f"{i:>3}. {p['title'][:46]:<48} {p['city'] or '—':<10} {sal:<9} {_job_type(p):<10} {p['contact'][:34]}")

if needs_translation:
    print(f"\ntarjima kerak — ruscha postlar ({len(needs_translation)}), --translations bilan qayta ishga tushiring:")
    for k, t in needs_translation:
        print(f"   {k:<28} {t[:50]}")

if not commit:
    print("\n(dry run)")
    raise SystemExit

expires = datetime.now(timezone.utc) + timedelta(days=30)
for p in picked:
    db.run("""insert into jobs
        (id, company_id, title, description, requirements, responsibilities, benefits,
         salary_min, salary_max, salary_currency, location, job_type, experience_level,
         is_remote_allowed, status, external_apply_url, contact_info, translations,
         city_slug, profession_slug,
         expires_at, created_at, updated_at, views_count, applications_count, is_deleted)
        values (:id, :co, :t, :d, cast(:req as jsonb), cast(:resp as jsonb), cast(:ben as jsonb),
                :smin, :smax, 'UZS', :loc, :jt, :exp, :rem, 'active', :src, :con, cast(:tr as jsonb),
                :cslug, :pslug,
                :exp_at, now(), now(), 0, 0, false)""",
        id=uuid.uuid4(), co=COMPANY_ID, t=p["title"], d=p["description"],
        req=json.dumps(p["requirements"], ensure_ascii=False),
        resp=json.dumps(p["responsibilities"], ensure_ascii=False),
        ben=json.dumps(p["benefits"], ensure_ascii=False),
        smin=p["salary_min"], smax=p["salary_max"],
        # A post that never says where the work is does not become a Tashkent
        # job because most of them are — that would be inventing the one field
        # candidates filter on hardest.
        loc=("Masofaviy" if p["is_remote"] else (p["city"] or "O'zbekiston")),
        # a post with no city gets no city slug rather than a guessed one, so
        # it stays off the city pages instead of landing on the wrong one
        cslug=(city_slug_from_location(p["city"]) or None) if p.get("city") else None,
        pslug=profession_slug_from_title(p["title"]) or None,
        jt=_job_type(p),
        exp=p["experience_level"], rem=p["is_remote"],
        # provenance only — never shown, never an apply target
        src=f"https://t.me/{p['channel']}/{p['msg_id']}",
        con=p["contact"], exp_at=expires,
        tr=json.dumps(p["_translations"], ensure_ascii=False) if p.get("_translations") else None)

print(f"\nqo'shildi: {len(picked)} ta vakansiya")
db.close()
