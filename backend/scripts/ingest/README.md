# Vacancy ingestion

Reads job posts from Telegram channels and turns the ones with a **usable
employer contact** into listings on the site.

The rule this pipeline exists to enforce: a listing a candidate cannot act on
from our own page is worse than no listing. 130 such rows once had to be closed
in one batch — imported with no contact, so the only thing left to offer was a
link back to the channel (or to cloz.uz, a competitor) we read them from. Every
stage below is about not doing that again.

## Run

```bash
export DSN='postgres://…'          # Railway: railway variables -s ishtop-db --json
HASH=$TG_API_HASH                  # the Telethon api_hash; never commit it

python3 harvest.py           "$HASH" raw_posts.json
python3 structure.py         raw_posts.json structured.json
python3 - <<'PY'                   # collect the handles structure.py kept
import json; d=json.load(open("structured.json"))
json.dump(sorted({h for r in d for h in r["handles"]}), open("handles.json","w"))
PY
python3 classify_handles.py  "$HASH" handles.json      # -> handles_kind.json
python3 insert_jobs.py       "$DSN" structured.json handles_kind.json 50   # dry run
python3 insert_jobs.py       "$DSN" structured.json handles_kind.json 50 --commit
```

Every stage prints what it dropped and why. `insert_jobs.py` without `--commit`
prints the exact list it would add — read it before committing.

## What each stage refuses

**harvest.py** — keeps a post only if it carries a phone, an email, or an
`@handle` that is not one of the channels we read. Skips posts that are ads,
course promos or giveaways.

**structure.py** — nothing is guessed. A salary, a city or a requirement is set
only when the post states it; otherwise the field stays empty and the
description carries the original wording. A post that has no city does **not**
become a Tashkent job. Also drops:
- job-seeker posts (UstozShogird carries "Ish joyi kerak" — someone looking —
  alongside "Xodim kerak", someone hiring);
- posts advertising several roles at once, since splitting them would mean
  inventing which requirement belongs to which role.

**roles.py** — the title is a canonical role name matched from a fixed list, in
the language the post is written in. An earlier version cut a phrase out of the
post with a character window and sliced words in half ("ьство КНР в РУз
требуется охранник"). Post headlines are also slogans ("Стань частью команды
мечты"), which name no job.

**classify_handles.py** — asks Telegram what each handle actually is. A
broadcast channel is the *source*, not the employer: writing there reaches
nobody. This is what caught `@devs_it` and `@itjobsfeed` in the last batch.

**insert_jobs.py** — drops channel handles and template phone numbers
(`+998 90 123 45 67` parses fine and reaches nobody), skips employers whose
contact is already on the site, and caps how many of one role go in so the feed
does not fill with forty sales-manager posts. Sorts so listings that state city,
pay and requirements go in first.

`external_apply_url` is written as provenance only — it is not returned by the
API and is never an apply target. See `frontend/src/lib/jobApply.ts`.

## Channel posts

`channel_top.py` — the week's best-paying vacancy from each category, as an
album of rendered cards (`job_card.py`).

`channel_promo.py` — the platform's own posts, one feature per post
(`promo_card.py`). Five exist: `contact`, `resume`, `match`, `interview`,
`trust`.

```bash
python3 channel_promo.py "$DSN" "$HASH" --list        # what exists + live numbers
python3 channel_promo.py "$DSN" "$HASH" contact       # render + print the caption
python3 channel_promo.py "$DSN" "$HASH" contact --send
```

Two rules these follow:

**One post at a time.** Five posts in five minutes reads as spam to a channel
this size; one a day reads as a series. That is why there is no `--all`.

**Nothing is claimed that does not work.** The counts in each caption are read
from prod at render time, and every feature named was checked against the live
API before it went into the series. A post advertising a broken feature costs
more than no post.

Icons on these cards are drawn with primitives, not typed: Arial has no ☎ / ✈ /
✓ glyph, and the first cut shipped a row of tofu boxes.
