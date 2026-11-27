# Phase 2 SEO / performance audit — coachramesh.com

Date: 2026-10-15 · Branch: `main` @ `f3c2435` · Working tree: **changes not committed**
Status: implemented and verified locally; **not deployed** (see §7).

---

## 1. How the numbers in this document were produced

| Method | Detail |
|---|---|
| Lab runs (live) | Lighthouse 12.8.2, `--form-factor=mobile` (412×823, DSR 1.75), simulated throttling, against `https://www.coachramesh.com/` |
| Lab runs (A/B) | Same Lighthouse, against two local servers: a copy of `HEAD` and a copy of the changed tree after `npm run build`. Both served the same `config/config.json`, so the only difference is the code. |
| Repeats | 3 runs each side; medians reported, because single runs on a laptop vary by ±5–10 points |
| **Not available** | PageSpeed Insights API (anonymous quota exhausted: HTTP 429 — no API key), CrUX field data, and any measurement of the deployed result |
| Scripts used | Temporary, outside the repo (deleted after): `functional-check.js` (CDP, 198 checks), `layout-check.js` (geometry diff), `repo-check.js` (static checks) |

`/admin.html` and `/docs/` are deliberately excluded from all of this — they are private/noindex.

---

## 2. Phase A — findings, with evidence

### 2.1 The LCP element is text, not the hero image

Live mobile run, `largest-contentful-paint-element`:

```
<p class="sub">            ← the hero paragraph
  TTFB / Load Delay / Load Time / Render Delay
```

LCP 3.7 s, of which **`render-blocking-resources` = "Est savings of 950 ms"**:

| Blocking resource | Bytes | Wasted |
|---|---|---|
| `fonts.googleapis.com/css2?family=Oswald…` | 1 388 | **912 ms** |
| `css/styles.css?v15` | 10 057 | 166 ms |

**Consequence for the fix:** preloading `photos/hero-1.jpeg` would have been the wrong
move — it is not the LCP resource, and a preload would have competed with the
stylesheet and the webfonts that the LCP text actually waits on. No `rel=preload`
was added, on purpose. The lever is the critical path: a third-party font
stylesheet on two extra origins, plus 53 KB of fonts from `fonts.gstatic.com`.

### 2.2 Images

| File | Real size | Bytes | Where it is painted | Waste reported |
|---|---|---|---|---|
| `photos/hero-1.jpeg` | 960×1280 | 179 445 | 378×503 (mobile) | 151 693 B |
| `photos/hero-2.jpeg` | 720×1280 | 124 384 | 404×718 | 82 554 B |

- `modern-image-formats`: *Est savings of 90 KiB*. `uses-responsive-images`: *105 KiB*.
- Both `<img>` tags declared **transposed** dimensions: `hero-1` said `1280×960` but
  the file is `960×1280`; `hero-2` said `1280×720` but the file is `720×1280`.
  In the hero *frame* this is harmless (the image is absolutely positioned inside a
  3:4 frame), which is why CLS stayed low — but the attributes were simply wrong.
- `hero-2` sits in `.hero-photos`, whose CSS sets `width:100%` and `aspect-ratio:16/10`
  but no `height`. **The `height` attribute is therefore what sizes that strip**
  (a fixed 720 px band). Changing it to the file's real 1280 px made the strip 560 px
  taller and pushed the entire page down — measured, then reverted. This trap is now
  documented in `css/styles.css` next to the rule.

### 2.3 Fonts and CSS

- Two `preconnect`s + one render-blocking cross-origin stylesheet for Google Fonts.
- Google served **five** WOFF2 files (54 417 B) on the homepage. Oswald was requested
  at four weights but Google returned the *same* variable file for all four.
- CSS: 42 514 B (`styles.css`). `unused-css-rules` scored 1 with no items — there is
  no significant unused CSS on the homepage. A dead-rule scan did find leftovers from
  removed features (see §3.4).

### 2.4 JavaScript and main-thread work

| Item | Evidence |
|---|---|
| `cdn.jsdelivr.net/…/supabase-js@2` | 56 405 B transferred, **38 489 B unused**; 51 ms blocking, 112 ms main-thread |
| `unused-javascript` | *Est savings of 38 KiB* — entirely `supabase-js` |
| `bootup-time` | 0.4 s total; `gallery.js` 160 ms scripting, `main.js` 62 ms |
| Third parties | JSDelivr 56 KB (51 ms blocking), Google Fonts 54 KB, supabase.co 4 KB |

Nothing here is broken; the CDN bundle is simply much larger than the one query it is
used for on public pages. See §6 for the recommended follow-up (not done — too risky
to change gallery/admin behaviour in the same pass).

### 2.5 Unnecessary network requests (found and fixed)

Live run showed `/config/config.json` fetched **twice** (663 B + 956 B), and the
response is served `no-store`, so both were real round trips:

- `js/main.js` (`loadSiteConfig`) fetched it for the WhatsApp number.
- `js/supabase-config.js` (`loadConfig`) fetched it for the Supabase URL/key.
- Two callers meant the "already loaded" guard needed to cache the **promise**, not
  just the result — otherwise both DOMContentLoaded handlers were in flight at once.

Also present: one HTTP **400** per gallery page load —
`?select=display_order&limit=1`, the probe for the optional column (migration 004 has
not been run). Pre-existing, left alone; it is the mechanism that keeps the gallery
working on an un-migrated database.

### 2.6 Crawlability and indexing

Verified against the live site:

| Check | Result |
|---|---|
| All 10 public pages | HTTP 200 |
| Canonical tag on each page | correct and self-referencing |
| `meta robots` on public pages | none (correct) |
| `admin.html` | `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` + `no-store` |
| `/config/` | `X-Robots-Tag: noindex, nofollow` + `no-store` |
| `robots.txt` | allows `/`, blocks `/config/`, `/js/auth.js`, `/js/supabase-config.js`, `/docs/`; sitemap declared |
| `sitemap.xml` | valid XML, 10 URLs, all live and canonical |
| Internal links | every page links to every other page in the nav and the footer |

**Why Programs / Nutrition / Clients / Gallery may not be indexed.** Two distinct causes,
and only the first is technical:

1. **Gallery, Transformations, Achievements, Powerlifting and the homepage's "Recent
   Work" block contained no photos in the HTML at all.** They were empty
   `<div class="gallery" data-gallery>` containers filled in JavaScript after a
   Supabase fetch. Google can render JS, but it is slower and weaker, and the photo
   captions — the only text on those pages — existed nowhere in the source. This
   matches the reported *"Discovered – currently not indexed"* for the gallery.
2. **Programs, Nutrition and Clients are thin.** Programs was 4 one-line cards;
   Nutrition was 3 cards + 4 steps; Clients was 4 quotes and a button. Nothing else.
   Combined with no city, no prices and no FAQ, there is very little for a crawler to
   treat as a page worth indexing.

### 2.7 Structured data

- Present: `Person` + `ProfessionalService` + `WebSite` in one `@graph` on the
  homepage only. Valid, and no invented address/geo/price — those are still absent and
  should stay absent until §6 is answered.
- Missing: `BreadcrumbList` on every inner page; `Service` on the service pages.
- Correctly absent: `Review`/`aggregateRating` on the site's own testimonials.

### 2.8 Two incidental observations (no action taken)

- `admin.html` has `lang="en"` (not `en-IN`) and two `<h1>` elements. It is noindex, so
  neither has a search consequence.
- The gallery's `Coach` and `Clients` filter buttons return 0 photos — those
  categories are empty in the database (43 rows: 22 transformations, 18 achievements,
  3 powerlifting).

### 2.9 Phone number — the discrepancy, reported not resolved

Every **committed** file agrees on `+91 9963526973` / `919963526973`
(`index.html` ×2, `programs.html`, `contact.html` ×2, `js/main.js`,
`js/supabase-config.js` ×2, `scripts/build-config.js`, `README.md`,
`docs/QUICK_START.md`, `DEPLOY_VERCEL.md`, `docs/SEO_GEO_PLAN.md`).

The disagreement is between the repository and the **deployed environment**:

```
https://www.coachramesh.com/config/config.json
  "WHATSAPP_NUMBER": "919000000000"      ← placeholder, NOT the real number
  "PHONE_NUMBER":    "+91 9963526973"    ← correct
```

- `WHATSAPP_NUMBER` is set in Vercel to the literal placeholder `919000000000`
  (`scripts/build-config.js` would have fallen back to the real number only if the
  variable were *unset*, so it is set — to a dead value).
- `js/main.js` catches this: it rejects any number matching `0{6,}` and falls back to
  the hardcoded real number, so the contact form still works.
- `js/supabase-config.js` did **not** have that guard, so
  `window.SUPABASE_CONFIG.whatsappNumber` was the dead placeholder. Nothing currently
  links to it, but it is a live trap. A guard was added (§3.2) — the value is still
  not corrected, because choosing the number is the owner's call.

No number was changed anywhere. **Owner action: set `WHATSAPP_NUMBER` in Vercel to the
confirmed number, or delete the variable so the file's default applies.**

---

## 3. What was changed

Priority order was performance → crawlability → structured data → local SEO.

### 3.1 Images (`index.html`, `photos/`, `css/styles.css`)

- Added WebP variants, original JPEGs kept as the `<picture>` fallback:
  `hero-1-480/640/960.webp`, `hero-2-480/720.webp`. Full-size JPEG→WebP saves 19 %
  (304 KB → 245 KB); the mobile variants save much more (the phone now pulls 80 KB
  instead of 179 KB).
- `<picture>` + `srcset`/`sizes`, so the browser picks by viewport and DPR.
- `hero-1`'s `width`/`height` corrected to the real `960×1280` (no layout effect — it is
  absolutely positioned, verified).
- `hero-2`'s attributes deliberately left alone and documented, because they are what
  sizes the strip.
- **No LCP preload** — measurement says the LCP element is the hero paragraph.
- `fetchpriority="high"` kept on `hero-1` (it is still the likely desktop LCP) and
  nothing lazy-loaded above the fold.

### 3.2 Fonts (`css/fonts.css` + `fonts/`, all 11 pages, `vercel.json`, `.htaccess`)

- Self-hosted latin WOFF2 with the same weights, `unicode-range` and
  `font-display: swap` Google served (one Oswald variable file + four Poppins files,
  53 KB total — provenance in `fonts/README.txt`).
- Removed both `preconnect`s and the `fonts.googleapis.com` stylesheet from all 11
  pages; `css/fonts.css` loads first so the font requests start immediately.
- CSP tightened accordingly in **both** `vercel.json` and `.htaccess`:
  `style-src 'self' 'unsafe-inline'; font-src 'self'` (the two Google origins were
  removed, nothing was loosened; `style-src` keeps `'unsafe-inline'` for the existing
  inline `style=` attributes).
- `/fonts/*` was already `max-age=31536000, immutable` in `vercel.json`.

### 3.3 JavaScript (`js/main.js`, `js/supabase-config.js`, all 11 pages)

- `loadConfig()` now caches the in-flight promise, so `/config/config.json` is fetched
  **once** per page load instead of once per caller.
- `main.js` reuses that shared fetch instead of making its own, and applies the same
  placeholder guard to the shared value.
- `supabase-config.js` gained the placeholder guard for `WHATSAPP_NUMBER`.
- All `<script>` tags are `defer`-ed (order preserved) and bumped to `?v16`.
- The scroll listener is `{ passive: true }`.

### 3.4 CSS (`css/styles.css`)

- Removed only rules that appear **nowhere** in the HTML or JS: the `.price-card`/
  `.price`/`.tag-flag` pricing block (removed feature), `.hero-photo-placeholder`,
  `.meter`/`.bar`, `.field-row`, `.login-meta`, `.monogram`.
- Left the generic utility block (`.mt-*`, `.mb-*`, `.flex-*`, `.text-*`, `.gap-sm`,
  `.btn-danger`) in place — genuinely unused, but harmless and plausibly wanted.
- Added `.crumbs` (visible breadcrumb) and the `.hero-photos picture` rule, both
  documented in place.

### 3.5 Prerendered galleries (`scripts/prerender-gallery.js`, `package.json`, `vercel.json`, 5 pages, `js/gallery.js`)

- Build-time step in the existing build command:
  `node scripts/build-config.js && node scripts/prerender-gallery.js`.
- Reads the photos with the **public anon key** (public SELECT is already allowed by
  RLS — no service-role key, no RLS change) and writes the cards into the page
  between `<!-- prerender:start -->` / `<!-- prerender:end -->` markers.
- Homepage gets 6, gallery 43, transformations 22, achievements 18, powerlifting 3.
- Ordering matches the gallery: `display_order` when the column exists, `created_at`
  otherwise (it correctly falls back on the current database).
- **Fail-safe by design**: no credentials, network failure, empty table or a missing/
  duplicated marker → log a warning, leave the page exactly as committed, `exit 0`.
  It cannot break a deploy.
- `js/gallery.js` no longer replaces prerendered cards with "Loading photos...", and
  re-renders the same rows on top so filters and the lightbox keep working.

### 3.6 Content depth (`programs.html`, `nutrition.html`, `clients.html`)

Each of the three thin pages gained a "Common questions" block built **only** from
claims already on the site (assessment-first, weekly check-ins, online delivery,
three plan directions, no published prices). `clients.html` gained a short
"what the reviews have in common" section using the figures the clients themselves
quote. No price, city, credential or timeline was invented. Contextual in-body links
were added on those pages and on transformation/achievements/powerlifting.

### 3.7 Structured data (`index.html` unchanged, 9 inner pages)

- `BreadcrumbList` on all nine inner pages, matching a **visible** breadcrumb trail
  added to each page — markup and page agree.
- `Service` on `programs.html`, `nutrition.html`, `powerlifting.html`, describing what
  those pages visibly show, with `provider` as a plain `Person`.
- Homepage `Person`/`ProfessionalService`/`WebSite` untouched. No `Review`, no
  `aggregateRating`, no address, no geo, no opening hours beyond what already existed.

### 3.8 Caching and sitemap (`vercel.json`, `sitemap.xml`)

- `/photos/*`: `max-age=86400` → `31536000, immutable` (they were flagged as the
  largest cacheable payload; the hero URLs now carry `?v16`).
- `sitemap.xml`: `lastmod` refreshed to the date of this change. Still 10 canonical
  URLs, still valid XML. **No `lastmod` generator and no image sitemap** — see §6.

---

## 4. Measurements

### 4.1 Live baseline (Lighthouse 12.8.2, mobile, production URL, 2026-10-15)

| | |
|---|---|
| Performance / Accessibility / Best Practices / SEO | **83 / 100 / 96 / 100** |
| FCP / LCP / TBT / CLS / TTI | 3.0 s / **3.7 s** / 100 ms / 0.016 / 4.2 s |
| Total transfer | 434 KiB in 20 requests |
| LCP element | `<p class="sub">` |

This matches the reported baseline (Perf 82, LCP 3.9 s) within run-to-run noise, so the
starting point is confirmed.

### 4.2 A/B on localhost — pristine `HEAD` vs changed build (medians of 3 runs)

| | before | after | |
|---|---|---|---|
| Performance | 90 | **95** | +5 (runs: 93/90/86 vs 95/95/88) |
| FCP | 1 774 ms | 1 873 ms | within noise |
| **LCP** | **3 016 ms** | **2 508 ms** | **−508 ms** |
| TBT | 111 ms | 118 ms | within noise (60–330 ms run to run) |
| CLS | 0.0157 | 0.0157 | unchanged — pre-existing webfont swap |
| Transfer | 491 KiB | **377 KiB** | **−114 KiB (−23%)** |
| Requests | 20 | 19 | |

Hard, non-noisy results from the same runs:

| | before | after |
|---|---|---|
| `render-blocking-resources` | *800 ms* | *none* |
| Requests to `fonts.googleapis.com` / `fonts.gstatic.com` | 6 | **0** |
| Same-origin font requests | 0 | 5 (all 200) |
| Hero bytes actually downloaded (mobile) | 179 KB JPEG + 124 KB JPEG | **80 KB WebP + 100 KB WebP** |
| `modern-image-formats` | *90 KiB* | gone |
| `uses-responsive-images` | *105 KiB* | gone |
| `image-delivery-insight` | *229 KiB* | *69 KiB* |
| `/config/config.json` real fetches | 2 | **1** |
| LCP element | `<p class="sub">` | `<p class="sub">` (unchanged) |

### 4.3 Honest reading of these numbers

- The A/B is a **lab** comparison on one laptop with a local server. It isolates the code
  change well, but localhost has no network latency, so the absolute scores are not
  production scores. Deployed mobile performance is expected to land well above the 83
  baseline, but that is an expectation, not a measurement.
- **Partially replicated earlier single runs** showed the same direction with a larger
  margin (perf 65→96, LCP 4.7 s→2.5 s). Those single runs also contained an outlier
  (65/4.7 s on the pristine side), which is why the medians above are the numbers to
  quote.
- No CrUX field data was available, so no real-user claim is made anywhere in this
  document.

---

## 5. Verification

| Suite | What it covers | Result |
|---|---|---|
| `repo-check.js` (static, source files) | per-page title/description/lang/single-H1/canonical/noindex, JSON-LD parses + expected types, visible breadcrumb, no Google Fonts left, internal links resolve on disk, scripts deferred + versioned, empty prerender markers only, CSP not loosened, build wiring, cache headers, robots, sitemap, fonts/photos present, no service-role key | **128/128**, exit 0 |
| `functional-check.js` (CDP, real Chrome, built site, mobile **and** desktop, all 11 pages) | per page: single H1, canonical path, noindex correctness, JSON-LD parse, **both self-hosted fonts actually loaded and applied**, breadcrumb, hero image is WebP and fills its frame, gallery rendered with no placeholders and not stuck loading, `tel:`/`wa.me` values, 9 nav links + menu open/close, zero console errors. Plus: gallery filters partition the set and reset, lightbox opens/shows an image/closes, contact form builds `https://wa.me/919963526973?text=…` with the name encoded | **198/198**, exit 0 |
| `layout-check.js` (CDP, geometry) | 19 above-the-fold elements + page height, pristine vs changed, at 412×823 DSR 1.75 and 1440×900 DSR 1 (animations frozen) | **38/38 identical**, page heights equal (7125/7125, 4717/4717) |
| `npm run build` in a copy of the tree | the exact Vercel build command incl. the prerender | exit 0; 43 rows; 6/43/22/18/3 cards |
| Prerender against the live database | real data, ordering matches the gallery (created_at, as `display_order` does not exist yet) | 43 photos, all categories covered |
| JS syntax | `node --check` on all 6 `js/*.js` + 2 `scripts/*.js` | all OK |

Two bugs were found and fixed **because** of these suites, not by inspection:
the `hero-2` height-attribute layout regression (§2.2) and the `loadConfig` race.

### Not verified

- **The deployed result.** Everything above is local; no production measurement was
  taken, by instruction.
- **PSI API / CrUX field data / Search Console** — unavailable in this environment.
- **Anything server-header related on Vercel** (`X-Robots-Tag` for `/config/`,
  the new 1-year `/photos/` cache, the tightened CSP). These are config-only changes
  that could not be exercised locally; the JSON was validated and the live headers were
  read as the before-state.
- **RLS was not re-probed.** A no-match `PATCH` with the anon key returns HTTP 200 with
  an empty array (the same "silent success" the admin panel now guards against), which
  proves nothing either way. Prior work in this repo established that the anon key
  cannot mutate rows; no write was attempted here, and no RLS policy was touched.
- **The gallery's `display_order` probe still returns one HTTP 400 per page load** on the
  current database. It is the intended mechanism and is unchanged.

---

## 6. Owner actions (nothing here can be done from the repo)

**Blocking for local SEO** — the same list the site's own plan asks for, none of which
was invented or guessed:

1. **Primary city and actual service area.**
2. **Fixed training address, or service-area business?**
3. **Correct public phone number** — and fix the Vercel `WHATSAPP_NUMBER` (currently
   `919000000000`, see §2.9).
4. **Google Business Profile** — does one exist? URL? verified?
5. **Official social profile URLs** (Instagram / YouTube / Facebook / LinkedIn), if any.

**Recommended follow-ups, deliberately not done in this pass:**

- **Drop `supabase-js` from public pages.** 38 KiB of the 56 KiB bundle is unused on
  pages that only run one `SELECT`. A plain `fetch` against
  `https://<ref>.supabase.co/rest/v1/photos?select=*` with the anon key would remove the
  CDN dependency from 5 pages and cut ~56 KB. Needs its own reviewed change because
  `js/admin.js`/`js/auth.js` share the client.
- **AVIF** on top of WebP (`<picture>` makes it a drop-in). Probably another 20–30 % on
  the hero bytes; skipped here to keep the file count manageable.
- **Mirror the best 8–12 photos onto `/photos/`** and add an image sitemap. Until then,
  the gallery images are indexed under `*.supabase.co`, not this domain.
- **A generated `lastmod`** in the sitemap instead of a hand-edited date.
- **`FAQPage` markup** for the new Q&A blocks. Skipped because Google retired FAQ rich
  results for most sites — the visible text is what matters for indexing.
- **`size-adjust` fallback metrics** to remove the last 0.016 CLS (a font-swap shift
  that predates this work).
- **Rewrite the generic photo captions.** Every photo is labelled "Achievements" or
  "Powerlifting"; those are the only words on the gallery pages, so they are what gets
  indexed. Descriptive captions set in the admin panel would help more than anything
  else in this list.
- **`llms.txt`** and the content clusters from `docs/SEO_GEO_PLAN.md` — untouched.

---

## 7. Risks, and how to undo this

- **Rollback:** nothing is committed and nothing is pushed. `git checkout -- .` plus
  deleting the untracked additions (`css/fonts.css`, `fonts/`, `photos/*.webp`,
  `scripts/prerender-gallery.js`) returns the tree to `f3c2435` exactly.
- **Prerender:** designed to fail open; the worst case is a build that keeps
  client-side rendering. It runs only in the build command, only over the marker region.
- **Cache:** `/photos/*` is now immutable for a year. Replacing `hero-1.jpeg` in future
  requires bumping the `?v16` query (or the file name) or returning visitors keep the old
  bytes. This is noted in `fonts/README.txt`'s counterpart comment in `index.html`.
- **CSP:** tightened, never loosened. If a font ever needs to come from elsewhere again,
  both `vercel.json` and `.htaccess` must change together.
- **Admin/tests:** `admin.html` changed only in its `<head>` (fonts + script version);
  its logic, markup and noindex are untouched, and RLS/auth were not modified.

## 8. Deployment order, once approved

1. Review the working-tree diff.
2. Commit (and, if the internal docs should stop being served, confirm `docs/` stays
   untracked — `robots.txt` only asks crawlers to stay out, it does not unpublish them).
3. Deploy, then reload `/admin.html` once (assets are now `?v16`).
4. In Search Console: **URL Inspection → Request indexing** for the four pages that were
   not indexed (Programs, Nutrition, Clients, Gallery). Do this manually and once —
   the repo does nothing automatic.
5. Re-run PageSpeed Insights mobile on the deployed URL and record the result.
6. Answer the five questions in §6 so the city/service-area work can finally start.
