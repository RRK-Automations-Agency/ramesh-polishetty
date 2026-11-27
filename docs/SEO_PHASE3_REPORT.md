# Phase 3 — Local SEO: code changes, test results, open items

Audit date: 2026-10-15 · Repo: `G:\code\rrk\ramesh-polishetty` · Branch: `main` @ `f3c2435`

**Nothing was committed, pushed or deployed.** The working tree holds the uncommitted
Phase 2 (performance) work *and* this phase's changes; §2 separates them.

Every confirmed fact below is from the brief. Nothing was invented, and where a fact was
missing the site says nothing rather than guessing.

| Brief | Value | Used as |
|---|---|---|
| Professional | Ramesh Polisetty | name, `Person`, footer |
| Primary area | Medchal, Hyderabad, Telangana, India | service-area copy, `areaServed` |
| Services | in-person + online coaching | copy, `Service`, `OfferCatalog` |
| Model | service-area business, no public address | no address anywhere; said so on the contact page |
| Phone | +91 9963526973 | visible text, `tel:+919963526973` |
| WhatsApp | 919963526973 | `https://wa.me/919963526973` |
| Pricing | keep removed | no price, no `priceRange` |
| Opening hours | **not confirmed** | not added; pre-existing published hours flagged, §5.4 |
| Social URLs | **not provided** | no `sameAs` |
| GBP status | **unknown** | no profile touched; manual checklist only |

---

## 1. Phase A audit — what the repo actually looked like

- **Phone numbers were already consistent in the repo** (`+91 9963526973` /
  `919963526973` / `tel:+919963526973` everywhere, 11 public pages). The disagreement was
  in the **deployed environment**: `config/config.json` on production carried
  `"WHATSAPP_NUMBER": "919000000000"` (a placeholder set in Vercel), which the runtime
  guard in `js/main.js` rejected before it could reach a visitor. Guarded in three places
  now (§2.1) rather than "fixed" by editing a number.
- **The pages that carry photographs had no photographs in their HTML.** Gallery,
  Transformations, Achievements, Powerlifting and the homepage's "Recent Work" were empty
  containers filled by a Supabase fetch, so the captions — the only real text on them —
  existed nowhere in the source. Prerendering (Phase 2) had already solved the crawlability
  half of this; Phase 3 finished the job for the text and the local angle.
- Structured data was one `Person` + `WebSite` + `ProfessionalService` graph on the
  homepage plus `Person` on inner pages — accurate, no `PostalAddress` beyond
  `addressCountry: IN`, no `sameAs`, no `geo`. Preserved and extended, not replaced.
- `sitemap.xml` listed exactly the 10 indexable URLs; `admin.html` and `404.html` were
  outside it; `robots.txt` allowed public pages and disallowed `/config/`, `/js/auth.js`,
  `/js/supabase-config.js`, `/docs/`.
- `vercel.json` and `.htaccess` headers were left as Phase 2 set them (CSP tightened there,
  never loosened). No security header was relaxed in this phase. Both CSP strings are
  byte-identical, `script-src` carries no `'unsafe-inline'`, and no Google font origin
  remains in either. `/config/*` is covered by `X-Robots-Tag: noindex, nofollow` +
  `Cache-Control: no-store` in `vercel.json` and by `Disallow: /config/` in `robots.txt`;
  `/admin.html` and `/admin` by `X-Robots-Tag` + `no-store` + the page's own meta tag.
- **There is no analytics on this site** — no `gtag`, no tag manager, no `dataLayer`, no
  Plausible/Umami/Vercel Analytics anywhere in the repo. So the brief's "analytics remain
  functional" has nothing to break today, and nothing was added. Worth knowing before one
  is added: the CSP allows `script-src 'self' https://cdn.jsdelivr.net` and
  `connect-src 'self' https://*.supabase.co`, so Google Analytics would need an entry in
  **both** `vercel.json` and `.htaccess` — that is exactly why the two are kept in sync.

## 2. What changed in this phase

### 2.1 `scripts/build-config.js` — a build can no longer ship a dead number (or a blank config)

Two defects, both real, both fixed:

1. **Placeholder passthrough.** `WHATSAPP_NUMBER || '919963526973'` only falls back when the
   env var is *absent*. The live project had it set to `919000000000`, so the placeholder
   was written into `config.json` and shipped. The build now rejects an implausible number
   (`<10` digits, `>15` digits, or `0{6,}`) with a warning and writes the confirmed values.
2. **Missing env var blanked working credentials.** A plain `npm run build` (no env
   exported — `PHONE_NUMBER=+91 9963526973` in `.env` is not shell-sourceable) wrote
   `"SUPABASE_URL": ""` and `"SUPABASE_ANON_KEY": ""`, which parses fine and breaks every
   gallery, the admin panel and the prerender. Values already in `config.json` are now kept
   when an env var is missing; only a truly absent config falls back to `''` (Vercel ships
   no file, so behaviour there is unchanged), and it now says so out loud.

### 2.2 Local content — 11 HTML pages

| Page | Added |
|---|---|
| `index.html` | title/description/OG now name Medchal, Hyderabad; `areaServed` = Hyderabad, Medchal, Telangana, India, Online; a "Where Ramesh coaches" service-area section that keeps in-person and online distinct; hero copy names the area |
| `contact.html` | two information blocks (in-person around Medchal & Hyderabad · online worldwide), a service-area paragraph stating there is **no public address**, phone/WhatsApp retained |
| `about.html` | service-area sentence + description, breadcrumb trail + `BreadcrumbList` |
| `programs.html`, `nutrition.html`, `powerlifting.html` | service-area sentence, descriptive internal links, `Service` markup with `provider` + `areaServed` |
| `gallery.html`, `transformation.html`, `achievements.html`, `clients.html` | service-area sentence, descriptive internal links, breadcrumb trail |
| `404.html` | no change beyond Phase 2's head; still `noindex, nofollow` and out of the sitemap |
| all 10 public pages | footer now prints "In-person coaching in Medchal, Hyderabad · Online coaching worldwide · +91 9963526973" — one NAP line, same on every page, for the Google profile to match |

Titles: only the homepage was rewritten for locality (the one place it makes the page more
accurate). Every other title kept its intent. City names appear in exactly **one** heading
site-wide (the homepage section), and in a sentence — not in every H1/H2.

Not created, deliberately: locality landing pages for Medchal/other suburbs (no evidence of
real coverage and no unique local content to write), prices, hours, testimonials wording,
client statistics, certifications, guarantees.

### 2.3 Structured data

- Homepage: `Person` + `WebSite` + `ProfessionalService` preserved; `areaServed` extended to
  City/Place/AdministrativeArea/Country + "Online coaching worldwide"; descriptions now name
  the service area; the existing `OfferCatalog` left intact.
- Inner pages: `BreadcrumbList` mirrors the visible trail on every page that has one;
  a standalone `Service` node added only on the three pages that describe a real named
  service (programs, nutrition, powerlifting), each with `provider` → `#ramesh` and
  `areaServed`. The homepage's five `Service` entries are the pre-existing ones inside its
  `OfferCatalog`; no page other than those three gained a `Service` node.
- **Absent on purpose, and verified absent by the harness:** `PostalAddress` with a street,
  `GeoCoordinates`, `hasMap`, `openingHoursSpecification` (new), `priceRange`, `sameAs`,
  `Review`/`aggregateRating` on the site's own testimonials. One block per page, no
  duplicate or contradictory business entities.

### 2.4 Technical

- `sitemap.xml`: the same 10 canonical URLs, `lastmod` moved to 2026-10-15 because every one
  of those pages genuinely changed this phase. No URL added or removed.
- Titles/descriptions unique across the 10 indexable pages, all ≤ 58 characters.
- Canonicals unchanged and correct, including the homepage's root form (`/`, not
  `index.html`).

### 2.5 New documents (owner-facing; `docs/` is `robots`-disallowed but still *served*, and none of these are committed yet)

- `docs/LOCAL_SEO_GBP_CHECKLIST.md` — the Phase F manual checklist: search before creating,
  real business name, primary category "Personal trainer", service-area configuration,
  address hidden, phone/website from the table above, **hours blank**, genuine photos only,
  owner-controlled verification, and an explicit "if clients really do visit a staffed
  location with signage, reassess for a hybrid/storefront profile" section.
- `docs/SEO_PHASE3_REPORT.md` — this file.

## 3. Verification — what was run, and the result

Two harnesses, both **outside the repo** (`G:\code\rrk\_p3\`), so nothing test-related was
added to the deployable tree. They can be deleted; the repo does not depend on them.

| Check | Result |
|---|---|
| `node static-check.js` (repo-wide, no browser) | **123/123 passed** |
| `node func-check.js` (real Chrome 155.0.8059.79, CDP, 390×844 + 1440×900, 11 pages) | **251/251 passed**, 3 INFO findings |
| `npm run build` | exit 0 — config written, prerender `index 6 · gallery 43 · transformation 22 · achievements 18 · powerlifting 3` cards |
| Live Supabase read (anon key) | 200, **43** rows — matches the prerendered counts |

**Static harness covers:** per public page — `tel:` href and visible number, absence of
placeholder digits, footer NAP line + in-person/online split; titles/descriptions unique and
under length; only one title rewritten for locality; city not in headings; per page JSON-LD
parses and contains no invented address/geo/price/review/social field; canonical correctness;
sitemap = exactly the 10 public URLs with today's `lastmod`; robots rules; admin noindex;
`js/main.js`, `js/supabase-config.js`, `scripts/build-config.js`, `config.example.json` free
of placeholder numbers; `wa.me` built with `encodeURIComponent`; no service-role key in
shipped files; **`supabase/migrations/*`, `js/auth.js`, `js/admin.js` byte-identical to
`HEAD`**; no pricing reintroduced; no locality landing pages created; prerender markers
intact; Q&A blocks intact.

**Functional harness, per page × viewport, covers:** canonical == expected; title present and
< 70 chars; viewport meta; **every internal link returns 200** (fetched in-page, same origin);
`tel:` hrefs all `tel:+919963526973` and the number visible as text; no placeholder digits
rendered; `wa.me` destinations well-formed and decodable; in-page JSON-LD parses; **zero
console errors/warnings** (two documented expectations filtered out, §5.3); `config.json`
requested **at most once** per page load (measured 1 on all 25 loads); gallery pages render
6/43/22/18/3 cards, **every card backed by a `photos/` image, 0 broken**; homepage retains
Person + WebSite + ProfessionalService.

**Contact form (both viewports):** empty name/phone → alert, no navigation; filled →
`https://wa.me/919963526973?text=…`, and the decoded message is exactly
`Hi Ramesh, I'm Priya S.\nGoal: Fat loss\nPhone: +91 90000 00000\nNote: Evenings only, near Medchal`,
with no raw spaces in the URL. Lead path works end-to-end with no network call of its own.

**Admin / Supabase (read-only probes, no write attempted to any real row):**

| Probe | Result |
|---|---|
| `js/supabase-config.js` receives real values | `whatsappNumber=919963526973`, `phoneNumber=+91 9963526973` |
| `admin.html` (signed out) | `noindex, nofollow, noarchive, nosnippet`; no service-role key or inline JWT in the DOM; sign-in gate shown |
| `GET /rest/v1/photos` (anon) | 200, 43 rows — public gallery still readable |
| `POST /rest/v1/photos` (anon) | **401 `42501` new row violates row-level security policy** — refused |
| `GET /rest/v1/admins` (anon) | 404 `PGRST205` — table absent (**INFO**) |
| `POST /rest/v1/rpc/is_admin` | 404 `PGRST202` — function absent (**INFO**) |
| `GET /auth/v1/settings` | `disable_signup=false`, email provider on (**INFO**) |

The insert probe deliberately violates `NOT NULL` on `image_url`/`category`/`label`, so it
**cannot create a row either way** — RLS refuses it, or the constraint would. It returned the
RLS refusal, which is the property that matters.

## 4. Not verified, and why

- **Nothing deployed.** No commit, no push, no `vercel deploy`, no Search Console action.
  Every measurement and probe above is local + the live database's read API.
- **Header-only changes** (`/photos/*` cache, CSP) cannot be exercised by a local static
  server; they need the deployed edge.
- **An authenticated non-admin write** was not attempted: it would require creating an
  account on the production project and touching production data. See §5.2 — the evidence
  there is from schema probes, not from a write.
- **Storage object writes** were not probed for the same reason (an accepted upload would
  leave a junk object). The table-level refusal plus identical `auth.role()` predicates in
  the storage policies are the basis for the claim, and the claim is limited to the table.
- **Appearance** is verified geometrically and functionally (counts, text, geometry), not
  visually — I cannot view a screenshot.
- **CrUX / deployed PageSpeed** — the anonymous PageSpeed API was HTTP 429 in Phase 2 and was
  not retried here; localhost Lighthouse numbers are not production numbers.

## 5. Open items — separated by who can close them

### 5.1 Owner: Vercel dashboard

1. **Fix or unset `WHATSAPP_NUMBER`** (currently `919000000000`). The repo can no longer
   ship it (§2.1), but the value should still be corrected: set `919963526973`, or delete the
   variable so the confirmed default applies. `PHONE_NUMBER` was already correct.
2. Confirm `SUPABASE_URL` / `SUPABASE_ANON_KEY` are set in Vercel, or galleries stay
   client-side rendered (the build now warns instead of silently writing empty strings).

### 5.2 Owner: Supabase (security — pre-existing, unrelated to this phase)

The live project's schema cache shows **no `public.admins` table** (`PGRST205`) and **no
`is_admin()` function** (`PGRST202`), i.e. **migration `20240101000003_secure_rls_admin_only.sql`
has not been applied**, while `GET /auth/v1/settings` reports `disable_signup=false`. Until
migration 003 is applied, the active write policies are migration 002's —
`USING/WITH CHECK (auth.role() = 'authenticated')` on both `photos` and `storage.objects` —
so *anyone who can create an account* can insert, edit and delete gallery rows and uploaded
files. Anonymous visitors cannot (verified above), but that is the weaker half of the
boundary.

Recommended, in this order: **turn off Auth → Sign In / Providers → Email → "Allow new users
to sign up"**, then apply migration 003, then re-run the admin flow. This phase changed no
migration, policy or auth setting.

### 5.3 Owner: Supabase (known, benign)

Migration `20240101000004_add_display_order.sql` is not applied either
(`column photos.display_order does not exist`), so each gallery load probes for the column
once, gets one HTTP 400 and logs one warning, then falls back to `created_at` ordering. The
Phase 2 prerender uses the same ordering, so pages and client render agree today. Re-check
both after applying 004 rather than assuming.

### 5.4 Owner: confirm the published opening hours

`contact.html` prints **"Mon–Sat · 6:00 AM – 9:00 PM"** and the homepage JSON-LD has the
matching `openingHoursSpecification`. Both are **pre-existing** (present in `f3c2435`) and
were left alone rather than invented or silently deleted — but they are unverified, and the
Google profile must not contradict them. Confirm the real hours (or say "none of that is
right") and the site will be corrected; the GBP checklist also says to leave hours blank
until confirmed.

### 5.5 Owner: the five facts local SEO is still waiting on

1. Street address or "service-area only, forever" (currently: no address published, and the
   contact page says so explicitly).
2. Whether any fixed, staffed, signposted location serves clients — that changes the profile
   type and whether `PostalAddress` + map belong in the markup.
3. Confirmation that Medchal is the primary locality and which neighbouring areas are really
   served (service area wording, and any future locality page).
4. Official social profile URLs (nothing was added to `sameAs`).
5. GBP: does a profile already exist, and who controls it.

### 5.6 Not done on purpose

No locality landing pages, no fake profiles or duplicate listings, no `Review`/`aggregateRating`
markup on the site's own testimonials, no automated indexing requests, no prices, no changes
to admin/auth/RLS code, and no deploy.

Pre-existing marketing claims that this phase neither added nor verified are left as they
were: "12+ years of experience", "1,000+ hours of coaching", and the client testimonials.
They appear in page copy only — **no JSON-LD** on any page asserts them.

## 6. Deployment order, once approved

1. Review the working-tree diff (Phase 2 + Phase 3 together — they are uncommitted as one set).
2. Commit. `docs/QUICK_START.md`, `docs/SUPABASE_SETUP.md` and `docs/SUPABASE_CLI_GUIDE.md`
   are tracked; the four newer notes (this one, the Phase 2 audit, the GBP checklist and
   `PROJECT_HANDOFF.md`) are untracked. Decide whether they should be committed —
   `robots.txt` asks crawlers to stay out, it does not unpublish: `vercel.json` serves the
   repository root, so a committed file is reachable at its path.
3. Fix the Vercel vars in §5.1 **before** the deploy, so the first build after deploy writes
   the real number.
4. Deploy, then reload `/admin.html` once (assets are `?v16`).
5. Search Console → URL Inspection → **Request indexing** for Programs, Nutrition, Clients and
   Gallery, manually and once. The repo does nothing automatic.
6. Work the GBP checklist in §2.5, and answer §5.4/§5.5.

**Rollback:** nothing is committed. `git checkout -- .` plus deleting the untracked additions
(`css/fonts.css`, `fonts/`, `photos/*.webp`, `scripts/prerender-gallery.js`,
`docs/*.md`) returns the tree to `f3c2435` exactly.
