# Project Handoff — coachramesh.com (Ramesh Polisetty)

Context for any coding agent picking this repo up. Written 13 Oct 2026 after the
session that added photo ordering to the admin panel. Read this file first, then
`docs/SEO_GEO_PLAN.md` for the next planned body of work.

---

## 1. What this project is

A **static marketing website** for Ramesh Polisetty, a personal trainer and body
transformation coach in India (`coachramesh.com`). Ten public pages, one
password-protected photo manager, and Supabase behind the gallery.

- **No framework, no bundler.** Plain HTML + CSS + vanilla JS. Every page's
  markup is hand-written; edits are direct file edits.
- **Hosting:** Vercel, deploying `main` on push. `vercel.json` sets
  `buildCommand: node scripts/build-config.js`, `outputDirectory: "."`, security
  headers, cache headers, and the `/admin` → `/admin.html` rewrite.
- **Backend:** Supabase (Auth + Postgres + Storage) for the photo gallery and the
  admin panel. An `.htaccess` mirrors the Vercel headers for Apache hosts.
- **Git remote:** `https://github.com/RRK-Automations-Agency/ramesh-polishetty`
  (branch `main`, deploys to the live site).

## 2. Repo map

```
*.html                 10 public pages + 404.html + admin.html (noindex)
css/styles.css         one stylesheet, CSS custom properties in :root
js/main.js             shared page behaviour (nav, reveal, WhatsApp links, config)
js/gallery.js          GalleryData: Supabase read/upload/delete + lightbox render
js/admin.js            photo manager: login gate, list, edit, upload, ordering
js/admin-boot.js       config + Supabase init for the admin page, connection badge
js/auth.js             Supabase Auth wrapper (login, logout, lockout handling)
js/supabase-config.js  config loading, client creation, getSupabaseStatus()
config/config.json     GENERATED at build from env vars; gitignored; example in config/
supabase/migrations/   0000 create photos, 0001 storage bucket, 0002 RLS fix,
                       0003 admin allowlist + secure RLS, 0004 display_order
supabase/seed.sql      local seed data
scripts/build-config.js  writes config/config.json from environment variables
scripts/setup-supabase.* interactive Supabase setup helpers
docs/                  QUICK_START, SUPABASE_SETUP, SUPABASE_CLI_GUIDE, SEO_GEO_PLAN, this file
DEPLOY_VERCEL.md       deployment walkthrough
```

**Deploy pipeline:** push to `main` → Vercel runs `node scripts/build-config.js`
(which writes `config/config.json` from `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`BUCKET_NAME`, `TABLE_NAME`, `WHATSAPP_NUMBER`, `PHONE_NUMBER`) → static output.

## 3. Data layer and security model

- Table `public.photos`: `id uuid`, `image_url`, `category` (constrained to
  transformations / achievements / powerlifting / coach / clients), `label`,
  `note`, `file_name`, `user_id`, `created_at`, `updated_at`, and (migration 004)
  `display_order integer not null default 0`.
- Storage bucket `photos`, public read.
- **RLS:** anyone can `SELECT`; only allowlisted admins can insert/update/delete.
  The allowlist is the table `public.admins`, checked by
  `public.is_admin()` (SECURITY DEFINER). **Admin membership is deliberately not
  read from `user_metadata`** — users can write their own metadata, which would
  let anyone self-promote. See the header comment in migration 0003.
- Public signups must stay **disabled** in the Supabase dashboard
  (Authentication → Sign In / Providers → Email).
- The **anon key is public by design** and ships to the browser in
  `/config/config.json`. It grants nothing without RLS.

## 4. Rules that will bite you if you forget them

1. **Cache busting is manual.** `vercel.json` sets
   `/js/*` and `/css/*` to `max-age=3600, stale-while-revalidate=86400`. Every
   HTML page references assets as `...?vN`. **After changing any JS or CSS, bump
   `?vN` in all `*.html`** (currently `v13`) or returning visitors keep the old
   file for up to an hour.
2. **No inline `<script>`.** The CSP in `vercel.json` is
   `script-src 'self' https://cdn.jsdelivr.net` with no `unsafe-inline`. New
   behaviour goes in a new file under `js/` and gets a `<script src>` tag.
   `style-src` does allow `'unsafe-inline'`, so inline `style="..."` is fine.
3. **Files are CRLF.** Edit tools normalise newlines, but do not reformat whole
   files — it produces noisy diffs.
4. **`config/config.json` is generated.** Locally it holds empty placeholder
   values; do not "fix" it or commit it.
5. **`admin.html` is deliberately blocked** from indexing (meta tag +
   `X-Robots-Tag` + `robots.txt`) and has `Cache-Control: no-store`.
6. **Migration order matters.** `2024010100000N` files are applied by hand in the
   Supabase SQL editor, in filename order. They are not auto-applied on deploy.
7. **No test framework exists.** `package.json` only has `build` and `dev`
   scripts. Verification is done with throwaway Node harnesses — see §7.

## 5. What the last session built: admin-managed photo ordering

**Problem:** the photo manager could add, edit and delete photos, but nothing
controlled the order they appeared in on the site — the gallery was always
newest-first, so the admin could not choose a lead photo per page.

**Model (important):** there is **one flat ordering sequence for the whole
gallery**. Each category page filters that same sequence, so a photo keeps its
position relative to the other photos in its category. Every reorder renumbers
positions `1..N` so numbers never drift, and only rows whose number actually
changed are written to the database.

**How the order is stored:** `persistOrder()` picks the path at runtime through
`GalleryData.hasOrderColumn()`. With migration 004 applied the position goes into
`display_order`. Without it the position is encoded into `created_at` — the column
the gallery already sorts by — so position 1 carries the newest timestamp and a
single drag writes **one** row (a time between the photo's two new neighbours).
The list is only rewritten wholesale when a gap drops below 2 s or the order is
re-sorted (newest/oldest reset). Applying migration 004 switches to
`display_order`; the timestamps stay behind as the tie-breaker for rows on `0`.

### Files changed

| File | Change |
|---|---|
| `supabase/migrations/20240101000004_add_display_order.sql` | adds `display_order integer not null default 0` (guarded, schema-qualified) + indexes on `(display_order)` and `(category, display_order)`. No RLS change needed — the existing "Admin update" policy covers all columns. |
| `js/gallery.js` | `_normalizeItem()` maps `display_order` → `order` and keeps `created_at`; `hasOrderColumn()` probes the column once per page load (`_orderColumn` caches the answer) and `load()` only orders by `display_order` where it exists, else by `created_at`; re-sorts client-side (`_sortItems`); empty table returns `[]` instead of placeholder cards; `uploadToSupabase()` asks `hasOrderColumn()` before putting `display_order` in the insert body. Also owns `isMissingOrderColumn(error)` (PostgREST codes **42703** for reads, **PGRST204** for writes). |
| `js/admin.js` | flat-order reorder engine; desktop-icon drag (`openSlot()` / `closeDrag()` move a drop slot under the pointer and `orderFromIds()` maps the drop back onto the full sequence); exact-position dialog; position field in the edit dialog; newest/oldest reset. `persistOrder()` picks the storage path — `display_order` when the column exists, otherwise `created_at` via `soleMovedItem()`, `writeTimestamps()`, `rewriteTimestamps()` and `persistDateOrder()`. `saveOrderUpdates()` asks for the row back (`.select('id')`) so an UPDATE that matched nothing is reported, not read as success. |
| `admin.html` | new controls + the position dialog markup. |
| `css/styles.css` | rank badge as a button, 30 px action buttons, 190 px list columns, `.order-shortcuts`, order-dialog styles. |
| `README.md`, `DEPLOY_VERCEL.md`, `docs/QUICK_START.md`, `docs/SUPABASE_SETUP.md` | document the new migration and the ordering controls. |
| all `*.html` | asset version `?v11` → `?v12`. |

### `js/admin.js` — the functions that matter

```
persistOrder(list)          renumbers 1..N, writes only changed rows
                            -> { saved, error }; mutates nothing on failure
applyOrder(list, position)  save + re-render (#admin-list) + status line
moveItem(item, direction)   one-place nudge from the ▲▼ buttons
moveItemToCard(srcId, tgtId) drag & drop: move to the drop target's position
moveItemToPosition(id, n)   exact position (used by the dialog and edit dialog)
saveOrderUpdates(updates)   display_order path: one UPDATE per changed row, asks
                            for the row back so a no-op is not read as success
persistOrder(list)          picks display_order or created_at storage
persistDateOrder(list)      created_at path: one timestamp per drag
soleMovedItem(desired,now)  the single photo a drag moved (null on a re-sort)
rewriteTimestamps(client,l) renumbers the whole list one second apart
writeTimestamps(client,rows) batched writes; treats "no row updated" as a refusal
orderFromIds(draggedId,ids) turned the on-screen order into the full-list order
nextPosition()              where an upload lands: max(order) + 1
resetOrderByDate(dir)       newest-first (1) / oldest-first (-1) for the whole list
orderSaveHint(error)        turns 42703 / PGRST204 into "run migration
                            20240101000004…"; passes other errors through
isMissingOrderColumnError() shared with gallery.js (cached-file safe)
handleOrderSave / openOrderEditor   position dialog
handleEditSave              label/category/note + optional position change;
                            asks for the row back so a refused update is not
                            reported as "saved"
renderList(searchQuery)     loads rows, renders cards, wires drag/click handlers
```

`order` travels in `data-order` on each `.admin-item`; the card's `#N` badge is a
`<button class="admin-item-rank">` that opens the position dialog.

### Bugs found and fixed while building this (do not reintroduce)

1. **Never write text into a parent element that contains a live child you need.**
   The position dialog's markup originally nested `<b id="order-current">` inside
   `<p id="order-label">`; setting `#order-label.textContent` deleted
   `#order-current` from the DOM, so the dialog broke after its first use. The
   label and the position are now separate sibling elements.
2. **`handleEditSave` read a `#edit-order` field that did not exist**, which threw
   on every edit save. The field is now in `admin.html` and the code guards for a
   missing field / empty value (empty = "leave the position alone").
3. The earlier session left `js/gallery.js` **syntactically broken** (`load()`
   had duplicated fallback code and the `save(items)` declaration had been lost).
   If a file ever "looks odd but parses", run `node --check`.
4. **Never detect a PostgREST failure by message text alone.** The fallback in
   `load()` matched `/column "display_order" does not exist/`, but PostgREST
   sends `column photos.display_order does not exist` with **no quotes**, so the
   fallback never ran: on the un-migrated production database every gallery page
   rendered the 8 fake `DEFAULTS` placeholder cards instead of the real photos,
   and the admin's upload insert sent `display_order` and was rejected with
   PGRST204. Match `error.code` first; treat `42703`/`PGRST204` as "column not in
   this database". Ask the database once (`hasOrderColumn()`) instead of guessing
   per query.

### Commits from this session

```
cec74d5 Let the admin set the order photos appear in on the website   (feature)
db25bb6 Explain the missing photo-order column instead of showing raw SQL
efe3192 Bump asset versions to v12 so the new admin script is not served from cache
<fix 1>  Make the gallery and the uploader work without display_order
         (probe the column, match 42703/PGRST204 by code, asset bump to v13)
<fix 2>  Drag photos into place and store the order without migration 004
         (desktop-icon drag with a drop slot, ▲▼ buttons removed, created_at
         fallback, asset bump to v14)
```

## 6. Current live status — one human step outstanding

Deployed and verified live: `admin.html` serves the new controls, `js/admin.js`
has the ordering engine (drag + `created_at` fallback), `js/gallery.js` orders by
`display_order` when present and by `created_at` otherwise, all pages reference
`?v14`, and all public pages return HTTP 200.

**No longer blocking:** arranging photos works on the un-migrated database. The
order is written to `created_at` until migration 004 adds `display_order`.

**Still optional:** the production database does **not** have `display_order` yet.
Verified 13 Oct 2026 against the live project:

```
GET https://ndsgszwtmwwiecnqpvhh.supabase.co/rest/v1/photos?select=display_order
-> HTTP 400 {"code":"42703","message":"column photos.display_order does not exist"}
```

Until someone with Supabase dashboard access runs
`supabase/migrations/20240101000004_add_display_order.sql` in the SQL editor
(https://supabase.com/dashboard/project/ndsgszwtmwwiecnqpvhh/sql/new):

- the gallery keeps working, falling back to newest-first (verified: 43 real
  photos load from the live project with the column absent);
- uploading works — the insert simply omits `display_order`;
- dragging works and saves into `created_at`; running migration 004 only moves
  that data into the dedicated column on the next reorder (the timestamps stay
  as the tie-breaker), so applying it is no longer urgent.

One side effect of the outage: `uploadToSupabase()` saves the image file before
it inserts the row, so the uploads that failed at the insert step left the photo
in the storage bucket with no row in `photos` (as of 13 Oct 2026: one orphan,
`photos/1791912533826-5p6s1ilsl.JPG`). Re-uploading that file from the admin
panel creates the row; deleting the orphan would need a storage credential.

There is **no service-role key, DB password or Supabase access token in this
environment**, and the anon key cannot run DDL, so this cannot be automated from
the repo. Do not attempt to work around it by stuffing order into another column.

## 7. How this work was verified (recreate these if you change the ordering)

No test framework is committed; the harnesses were temporary files **outside the
repo** and were deleted afterwards. The techniques are worth reusing:

1. **Syntax:** `node --check js/admin.js` and `node --check js/gallery.js`.
2. **Logic harness (no dependencies):** run the real file inside `vm.createContext`
   with DOM stubs (`document.querySelector` returning a memoised fake element,
   `localStorage`, `setTimeout`) and a fake Supabase client whose builder exposes
   thenable `select/order/update/eq/insert`. Assert on the recorded `update`
   payloads — e.g. moving a photo to position 1 writes `[1,2,3]` and
   `[c,a,b]`, and rows that did not change are never written.
3. **UI harness (jsdom, installed in a temp dir outside the repo):** load the real
   `admin.html` with `runScripts: 'outside-only'`, `window.eval()` each script,
   then dispatch `DOMContentLoaded` manually (the scripts wire up on it), inject a
   fake `window.Auth`, `window.getSupabaseClient`, `window.loadConfig` /
   `initSupabase`, and drive real clicks: `▼` button, drag (`dragstart` →
   `dragover` → `drop` with a stub `dataTransfer`), the `#rank` badge dialog, the
   edit dialog, and the newest/oldest buttons. Then load `gallery.html` the same
   way and assert the rendered captions match the saved order.
4. **Live checks after deploy:** `curl` the pages for status 200 and the `?vN`
   version, grep the deployed `js/*` for the new code, and query the Supabase REST
   API with the public anon key (readable from
   `https://www.coachramesh.com/config/config.json`) to confirm the schema and
   that photos are still readable.
5. **Run the deployed code against the live database (best signal).** Fetch
   `https://www.coachramesh.com/js/gallery.js` and `js/admin.js`, run them in
   `vm.createContext` with DOM stubs, and hand them a **real**
   `@supabase/supabase-js` client built with the public anon key — then call
   `GalleryData.load()` and assert on the returned rows. Writes stay testable by
   passing a `global: { fetch }` wrapper to `createClient` that records
   `POST /rest/v1/photos` bodies and answers them locally, so the exact insert
   payload is visible even though the anon key cannot write. This is how the
   `display_order` outage was reproduced (43 photos → 8 placeholder cards) and
   then proven fixed on the live files.
6. **jsdom drag harness (use this before touching the ordering).** Boot the real
   `admin.html` with `runScripts: 'outside-only'`, `window.eval()` the real `js/*`
   files, and inject a stub client that behaves like PostgREST: it must honour
   `.order()` (a stub that ignores it makes the panel render rows in the wrong
   sequence and every later assertion lies), answer the `select('display_order')`
   probe with 42703, and answer `.select('id')` after an update with the rows it
   matched. Then fire real drag events — `MouseEvent` with a hand-made
   `dataTransfer` object, and an overridden `getBoundingClientRect` so the
   left-half / right-half branch is deterministic — and assert the patch
   payloads. The suite used here: top / middle / bottom drops, exactly one write
   per drag, gap exhaustion triggering a rewrite, a search-filtered drop, a no-op
   drag writing nothing, a refused update surfacing an error, and no drop slot
   left behind. Re-run it with the 43 real production rows as the dataset too.

Results at the time of writing: 18/18 logic checks, 22/22 jsdom UI checks, 8/8
after removing a dead helper, plus live page/asset checks. Two real bugs (above)
were found by the UI harness — keep that step.

## 8. Other items from this session

- **Client testimonials:** the four named reviews (Sai Krishna Saketh, Asif,
  Subbareddy, Manikanta) were already present in `clients.html` and committed, so
  nothing was added. Do not re-add them.
- **Repo hygiene:** `git status` was showing an unmerged index entry (`UU`) on
  `clients.html` left over from an earlier hand-resolved merge. The working file
  was already the correct resolution; it was staged to clear the conflict.
- **Dead code:** `saveOrder()` was removed from `js/admin.js` once
  `persistOrder()`/`saveOrderUpdates()` replaced it.

## 9. Next planned work: SEO + local SEO + GEO

See **`docs/SEO_GEO_PLAN.md`** for the complete plan. Highest-impact items in
order:

1. Ask the owner for **city, locality, address/service area, social profiles,
   GBP link** — the site currently has no location anywhere, which blocks all
   local ranking.
2. Extend the home-page JSON-LD into a shared `@graph` on every page
   (`LocalBusiness` + `geo` + `PostalAddress` + `sameAs` + `BreadcrumbList`).
3. **Prerender the gallery photos into static HTML at build time** — the
   transformation/gallery pages are JS-only today, and the photos live on
   `*.supabase.co`, so neither the content nor the image equity lands on this
   domain. This is the single biggest technical SEO gap.
4. Google Business Profile + Search Console + Bing Webmaster + GA4 events
   (see plan §2, §5).
5. Convert hero images to AVIF/WebP and self-host the Google fonts.
6. Start the content clusters (plan §7) and the city/locality page(s).

**Note before committing new docs:** Vercel serves this repo from the root
(`outputDirectory: "."`), so anything committed under `docs/` is publicly
readable at `https://www.coachramesh.com/docs/<file>`. `README.md` and the
existing docs already are. These two new files are currently **untracked** — add
a `Disallow: /docs/` rule (plan §12.6) before publishing them, or keep them out
of the repo and hand them over as files.
