# SEO + GEO Plan — coachramesh.com

Step-by-step plan to (a) rank #1 for the brand ("coach ramesh", "ramesh polisetty
personal trainer"), (b) compete on personal-training terms in the service area,
and (c) be found and quoted by **both** kinds of "geo":

- **Local / geographic SEO** — the Google Maps pack, "personal trainer near me",
  city-level searches.
- **GEO = Generative Engine Optimization** — Google AI Overviews, ChatGPT,
  Perplexity, Gemini, Copilot answering questions about personal training.

Owner: whoever runs the site. Status: **plan** (nothing in this file is applied
yet except where section 1 says it already exists).

> **Reality check before starting.** Nobody can promise position 1 for
> competitive non-brand terms such as "personal trainer". What is realistic:
>
> | Target | Realistic timeline | Main lever |
> |---|---|---|
> | `coach ramesh`, `ramesh polisetty` | days–weeks | Google Business Profile + indexed site + social profiles (`#1` is achievable) |
> | `personal trainer {{CITY}}`, `gym trainer near me` | 4–12 weeks | GBP + reviews + city pages + NAP consistency |
> | `online personal training india`, `fat loss coach india` | 3–9 months | content clusters + backlinks |
> | AI answers (AI Overviews / ChatGPT) | 1–6 months | crawlable facts, entity consistency, third-party mentions |
>
> Every step below is either (a) free and in our control, or (b) a real profile
> on a third-party site. Purchased links, fake reviews and mass-generated city
> pages are listed in the do-not-do section because they actively hurt rankings.

## Placeholders to fill in first

The site currently contains **no city, street address or service area** — this
blocks all local SEO. Fill these once, then reuse everywhere:

| Placeholder | Meaning | Example |
|---|---|---|
| `{{CITY}}` | primary city served in person | `Hyderabad` |
| `{{REGION}}` | state / admin region | `Telangana` |
| `{{LOCALITY}}` | neighbourhood or area of the training location | `Gachibowli` |
| `{{STREET}}`, `{{PIN}}` | street + postal code (see note in §5) | — |
| `{{LAT}}`, `{{LNG}}` | coordinates of the training location | `17.4401, 78.3489` |
| `{{GBP_URL}}` | Google Business Profile link (`https://maps.app.goo.gl/...`) | — |
| `{{INSTAGRAM}}`, `{{YOUTUBE}}`, `{{LINKEDIN}}` | profile URLs, or omit if none | — |

---

## 1. What already exists (do not redo this)

Audited from the repo, 13 Oct 2026:

- **Titles + meta descriptions** on all 10 public pages, keyword-shaped and unique.
- **Canonical URLs**, `og:`/`twitter:` cards and preview images on every page.
- **`robots.txt`** allows all pages, blocks `/config/` and the JS internals, and
  points at the sitemap.
- **`sitemap.xml`** with all 10 public pages, priorities and `changefreq`.
- **JSON-LD on the home page only** (`index.html`): `Person`, `ProfessionalService`,
  `WebSite` in one `@graph`, with `knowsAbout`, opening hours, `OfferCatalog`.
- **`admin.html` is `noindex`** via meta tag + `X-Robots-Tag` header.
- **HTTPS + HSTS + security headers** via `vercel.json` / `.htaccess`.
- **Semantic-ish HTML**: `header`/`footer`/`section`, one `h1` per page, hero
  images carry `alt`, `width`/`height`, `fetchpriority` and `decoding`.
- **Client testimonials** on `clients.html` (four named reviews).
- **Photo manager** with ordered gallery images (see `PROJECT_HANDOFF.md`).

Gaps that this plan fixes: no city/address anywhere, JSON-LD on the home page
only, gallery content rendered client-side from Supabase, no blog, no GBP, no
analytics/Search Console evidence in the repo, no `sameAs` social links, no FAQ
content, no image sitemap.

---

## 2. Phase 0 — Search Console, analytics, sitemaps (day 1)

Nothing else can be measured until this is done. All free.

1. **Google Search Console** — https://search.google.com/search-console
   - Add **domain property** `coachramesh.com` (DNS TXT at the registrar; this
     covers www and non-www).
   - Also add a **URL-prefix** property for `https://www.coachramesh.com/` so
     per-page reports are available.
   - Submit `https://www.coachramesh.com/sitemap.xml`.
   - Use **URL Inspection → Request indexing** for `/` and
     `/transformation.html`.
2. **Bing Webmaster Tools** — https://www.bing.com/webmasters. Import from GSC
   in one click. Bing feeds **ChatGPT search** and Copilot, so this is part of GEO too.
3. **Analytics** — add GA4 (or a lighter option: Plausible/Umami). Minimum events:
   `whatsapp_click` (any `wa.me` link), `phone_click` (`tel:`), `form_submit`,
   `scroll_90`, `view_page`. `js/main.js` already centralises page behaviour, so
   add one delegated click listener there for the `wa.me` / `tel:` events.
4. **IndexNow** — POST the sitemap URLs to `https://api.indexnow.org/indexnow`
   after each deploy (Bing + Yandex instant indexing).
5. **Google Analytics + GSC link**, and set the **Search Console "Performance"
   baseline** as the KPI record: note impressions, clicks, average position now.
6. Check the **PageSpeed Insights** score for the home page and record it
   (field data = CrUX; lab = Lighthouse). This is the before-photo.

---

## 3. Phase 1 — Technical fixes that move rankings (week 1–3)

Do these in order. Each one is a concrete repo change.

### 3.1 City/service-area data in every page (blocks local SEO)
1. Add the city to the **title and H1** of the home page, e.g.
   `Personal Trainer in {{CITY}} — Ramesh Polisetty | Fitness & Transformation Coach`.
2. Add `{{CITY}}` to the **meta description** of `/`, `/programs.html`,
   `/contact.html`, `/transformation.html`.
3. Extend the contact page "Training" row to a real address or service area:
   `In-person coaching in {{LOCALITY}}, {{CITY}} · online worldwide`.
4. Add the address/service area + opening hours to the **footer** on every page
   (plain text; that is what Google uses to corroborate NAP).
5. Re-check `lang="en-IN"` on every page (already correct) — keep it.

### 3.2 Better structured data (see §12.1 for the copy-paste block)
1. Replace the home-page `@graph` with the version in §12.1, which adds
   `geo`, a real `PostalAddress`, `sameAs`, `priceRange`, `hasMap`, `areaServed`
   with the city and nearby localities, and `image` on the business.
2. Move the shared `Person` + `WebSite` + `LocalBusiness` graph into a **single
   JS- or build-injected include** used by every page, then add per-page
   `Service` / `BreadcrumbList` nodes. (CSP forbids inline `<script>` in new
   places only if you add raw inline JS — a `type="application/ld+json"` block is
   data, not script, and is already allowed; keep it in the HTML head.)
3. Add **`BreadcrumbList`** to all non-home pages.
4. Add **`FAQPage`** where a page genuinely answers questions (§6.2). Note:
   Google retired FAQ *rich results* for most sites in Aug 2023 — the markup no
   longer produces stars/accordions in Google, but it is still valid, still read
   by AI answer engines and Bing. Do not expect Google FAQ rich snippets.
5. **Do not** mark up the four testimonials as `Review`/`aggregateRating` on this
   site. Google treats self-serving review markup as ineligible for rich results
   and it can be flagged as spam. Keep them as visible HTML content (as now) and
   put reviewed stars only on the Google Business Profile.

### 3.3 Make the gallery/photos crawlable (highest-value technical fix)
Today `transformation.html`, `gallery.html`, `achievements.html`,
`powerlifting.html` render their photos **client-side** by fetching Supabase.
Google renders JS eventually, but a JS-only page is a weaker, slower signal and
the photos are served from `*.supabase.co`, so **image search equity does not
accrue to this domain**.

1. Add a **build-time prerender step** to `scripts/` (runs in Vercel's
   `buildCommand`, which is currently `node scripts/build-config.js`): fetch the
   rows from the Supabase REST API with the anon key (public read is already
   allowed by RLS) and inject a static `<ul>`/`<figure>` list of the photos —
   `alt`, caption, category, link — into the matching page between markers like
   `<!-- prerender:transformations:start -->`.
2. Keep `js/gallery.js` as the progressive enhancement on top (it already
   replaces `#admin-list`-free containers via `[data-gallery]`); if the static
   list exists, the gallery can skip its first render or hydrate it.
3. Give every photo a **descriptive filename** instead of the current
   `Date.now()-random.jpg` upload name — that is set in
   `GalleryData.uploadToSupabase()` in `js/gallery.js`. Prefer
   `transformation-fat-loss-hyderabad-1.webp`, derived from the photo title.
4. Mirror the 8–12 most important photos onto the domain (`/photos/…`) so the
   best assets are indexed under `coachramesh.com`, and add them to an
   **image sitemap** (§12.4).
5. Generate `sitemap.xml`'s `<lastmod>` at build time instead of the hard-coded
   `2026-10-12`.

### 3.4 Speed / Core Web Vitals
- Convert `photos/hero-1.jpeg` (179 KB) and `hero-2.jpeg` (124 KB) to
  **AVIF/WebP** and serve with `<picture>` + `srcset`; expect ~60–70 % smaller.
- **Preload the LCP image** on the home page:
  `<link rel="preload" as="image" href="photos/hero-1.webp" fetchpriority="high">`.
- **Self-host the fonts** (Oswald, Poppins) as `woff2` in `/fonts/` with
  `font-display: swap`; this removes two render-blocking third-party connections
  (`fonts.googleapis.com`, `fonts.gstatic.com`). After switching, tighten
  `style-src` / `font-src` in `vercel.json` (the CSP currently whitelists them).
- Keep every below-the-fold image `loading="lazy"` with `width`/`height` (already
  the pattern) — no layout shift.
- Target: **LCP < 2.5 s, INP < 200 ms, CLS < 0.1** on mobile field data.

### 3.5 Internal linking
- Every page already links to every other page in the nav — good. Add
  **contextual** in-body links: from blog posts to `/programs.html`,
  `/transformation.html`, `/contact.html`; from `transformation.html` to
  `clients.html` and `programs.html`.
- Use descriptive anchors ("1-on-1 personal training in {{CITY}}"), never "click here".

### 3.6 Optional URL cleanup (low priority, do it once)
Pages are `*.html`. Clean URLs (`/about`) are cosmetic for ranking. If wanted:
add `cleanUrls: true` in `vercel.json` **and** update every canonical + internal
link in the same commit, then re-submit the sitemap. Otherwise leave as is — do
not churn URLs twice.

---

## 4. Phase 2 — On-page keyword map (week 2–4)

One page = one primary intent. Rewrite headings/copy so each page owns its term,
then check it is reachable in ≤2 clicks from the home page.

| Page | Primary target | Secondary | Required on-page work |
|---|---|---|---|
| `/` | personal trainer {{CITY}} | coach ramesh, fitness coach {{CITY}}, body transformation coach | city in title/H1/description; add "About Ramesh" paragraph; link to all services |
| `/programs.html` | personal training programs / 1-on-1 + online coaching | online personal trainer india | split into 2–3 named programs with prices or "from ₹X"; add FAQ |
| `/transformation.html` | body transformation coach {{CITY}} | before after transformation, weight loss transformation | static prerendered photos + captions with real numbers/duration |
| `/powerlifting.html` | powerlifting coach {{CITY}} | strength training coach, deadlift/squat coaching | add meet results, totals lifted, federation |
| `/nutrition.html` | nutrition coach / diet plan {{CITY}} | fat loss diet plan india, indian diet plan for weight loss | add sample day of Indian meals; FAQ |
| `/clients.html` | personal trainer reviews {{CITY}} | client testimonials | keep testimonials; add names + program + timeline; ask for GBP reviews (link) |
| `/about.html` | ramesh polisetty personal trainer | fitness trainer with 12 years experience | add credentials, certifications, experience, photo with `alt` |
| `/achievements.html` | fitness coach achievements {{CITY}} | competition wins | tie each achievement to a real event + year |
| `/gallery.html` | personal training gallery | client photos | static photo list + image sitemap, descriptive filenames |
| `/contact.html` | book personal trainer {{CITY}} | personal trainer near me, gym trainer contact | address/service area, embedded Google Map, hours, phone, WhatsApp |
| `/blog/...` (new) | long-tail questions (§6) | — | 800–1500 words, internal links, FAQ, author box |

Rules: exact-match keyword in the **title**, **H1** and **first 100 words**;
natural variants in H2s; never repeat the city in every heading on one page.

---

## 5. Phase 3 — Local / geographic SEO (week 1–4) ← the fastest wins

This is what makes the site appear for "personal trainer near me" and in the
Google Maps pack.

1. **Create/claim a Google Business Profile** — https://business.google.com
   - Business name: **Ramesh Polisetty — Personal Trainer** (no keyword stuffing;
     adding "Best Gym Trainer in {{CITY}}" to the name gets profiles suspended).
   - Primary category: **Personal trainer**. Secondary: *Fitness center*,
     *Nutritionist*, *Health consultant* (pick only what is true).
   - Service area: if clients come to a location, use the **address**;
     otherwise use a **service-area business** (hide the address, list
     `{{CITY}}` + nearby localities).
   - Add: phone (same as the site), website `https://www.coachramesh.com/`,
     hours (Mon–Sat 06:00–21:00, matching the site), booking link to
     `/contact.html`, services list, 20+ real photos, and a 750-char description
     containing "personal trainer in {{CITY}}".
   - Verification: usually video/phone; a real address or a verifiable service
     area is required. Do this first — it is the single biggest local lever.
2. **Apple Business Connect** (Apple Maps) and **Bing Places** — same NAP.
3. **NAP consistency**: identical name, phone (`+91 9963526973`), website and
   area on: the site footer + contact page, GBP, Apple Maps, Bing Places,
   Instagram bio, YouTube about, Facebook page, and every directory in §5.6.
4. **Google Map embed** on `/contact.html` (iframes are fine — the CSP allows
   frames only via `frame-ancestors`; adding an iframe needs
   `child-src`/`frame-src` in `vercel.json`, so add `frame-src
   https://www.google.com` there).
5. **Reviews** (Google policy: no incentives, no fake reviews, no review gating):
   - After each client's first month, send the GBP review link over WhatsApp.
   - Reply to every review within 48 h; mention the service + city naturally.
   - Target 15–25 reviews in the first 90 days. Review count/velocity is a top-3
     local pack factor.
6. **Citations / directories** (create once, keep NAP identical):
   Justdial, Sulekha, UrbanPro, IndiaMART, Practo (only if qualified),
   Yelp India, Facebook Page, Instagram business profile, LinkedIn company page,
   plus any local gym/fitness directories in `{{CITY}}`. Free, one per week.
7. **Local content that is genuinely local** (Google's doorway-page spam policy):
   only create a page per locality if you can write **400+ unique words** for it —
   which gyms/clients/timings are relevant there. Write `{{LOCALITY}}` pages only
   for areas you actually serve (2–5 max). Template in §12.3. Never mass-generate
   50 city pages from one template.
8. **Track the pack**: monthly, search `personal trainer {{CITY}}` and
   `gym trainer near me` in an incognito window with location = `{{CITY}}` and
   record the rank + which competitors hold the top 3.

---

## 6. Phase 4 — GEO: getting quoted by AI answer engines

How AI Overviews, ChatGPT, Perplexity and Gemini choose what to say: they
summarise **crawlable, unambiguous, cited-by-others facts**. So the goal is
extractable, verifiable statements about Ramesh, repeated consistently.

1. **Entity consistency** — the same three facts everywhere (site, GBP, socials,
   directories, press):
   - "Ramesh Polisetty is a personal trainer and body transformation coach in
     {{CITY}}, India."
   - "12+ years of coaching, 300+ client transformations."
   - "In-person in {{CITY}}; online coaching worldwide."
2. **Write answer-shaped content** (§6.2/§12.2): every service page gets a
   Q&A block using the real questions, with a **direct one-sentence answer** in
   the first line, then the detail. Add dates and numbers ("as of Oct 2026").
3. **Keep facts in crawlable HTML** — the pre-render work in §3.3 matters here
   most: AI crawlers often do not execute JavaScript.
4. **`llms.txt`** — publish `https://www.coachramesh.com/llms.txt` (convention
   for AI crawlers, not yet used by every engine). See §12.5.
5. **Third-party corroboration** — AI models trust sources *other than* your own
   site: Google Business Profile, YouTube video descriptions/transcripts,
   Instagram bio, Reddit/Quora answers (be genuine, declare the affiliation),
   local news features about competition wins, podcasts, guest posts, listicles
   ("best personal trainers in {{CITY}}"). Aim for 10 mentions in 90 days.
6. **YouTube is a GEO channel**: film 60–90 s clips (form fixes, client
   testimonial, one exercise cue), title them the way people ask
   ("How to fix squat knee pain — Coach Ramesh"), and put the site URL in the
   description. Transcripts are indexed and quoted by AI.
7. **Measure monthly** (manual, free): ask ChatGPT, Perplexity, Gemini and
   Google (AI Overview) these questions and record whether the site is cited:
   "who is the best personal trainer in {{CITY}}", "personal trainer near
   {{LOCALITY}}", "how much does a personal trainer cost in {{CITY}}",
   "coach ramesh". Log the answers in a sheet with the date.
8. Do **not** rely on hidden prompt-injection text or cloaked pages — that is
   spam under Google's policies and will not survive.

---

## 7. Phase 5 — The content engine (where non-brand rankings come from)

Service pages alone rarely win competitive head terms. 15–20 long-tail articles
do, because they match what people actually type and they earn links.

Cadence: **2 articles per week for 8 weeks**, then 1/week. Each 800–1500 words,
original photos/screenshots, one clear call to action, internal links to
`/programs.html`, `/transformation.html`, `/nutrition.html`, `/contact.html`,
an FAQ block, and an author box with real credentials.

Build the structure as `/blog/index.html` + `/blog/<slug>.html`, add the index to
the nav and sitemap. Cluster plan:

**Cluster A — fat loss (targets money page `/nutrition.html`, `/transformation.html`)**
1. Indian diet plan for fat loss (vegetarian + non-veg, 1500 kcal sample day)
2. How long does it really take to lose 10 kg?
3. Why the scale stalls in month 2 (and what to change)
4. Cardio vs weights for fat loss: what actually works
5. 7 fat-loss mistakes that keep the weight on

**Cluster B — muscle building (`/programs.html`)**
6. Skinny to strong: a 6-month plan for hardgainers
7. Progressive overload explained with real numbers
8. How much protein do you need (Indian foods, per kg)
9. Push/pull/legs vs full body for busy professionals

**Cluster C — local (`/contact.html`, city page)**
10. Personal trainer cost in {{CITY}}: what you should pay in 2026
11. Gym vs personal trainer in {{CITY}}: which gets results faster
12. Best gyms in {{LOCALITY}} and how to choose one
13. Home workouts vs training in a gym in {{CITY}}

**Cluster D — powerlifting/strength (`/powerlifting.html`)**
14. First powerlifting meet: what to expect
15. Squat, bench, deadlift technique cues I use with every client

**Cluster E — trust/reviews (`/clients.html`)**
16. Real client transformation stories with timelines
17. What a month of coaching with Ramesh actually looks like

For each article: primary keyword in title + H1 + URL slug + first paragraph;
3–5 H2s built from the questions people ask; one table or list that AI can quote;
`Article` + `Person` (author) JSON-LD; publish date + "last updated".

---

## 8. Phase 6 — Authority, links and social (month 2+)

Backlinks are the strongest ranking factor we cannot fake — so earn the small,
local, real ones:

1. **Competition/press angle**: every powerlifting meet or transformation story
   is a press opportunity. Send a short release + photos to local sports pages
   and fitness portals. Ask them to link to `/achievements.html`.
2. **Gym and supplement collaborations** in `{{CITY}}`: partners link to
   `/programs.html` from their site; you link to them from a real page.
3. **Guest posts** on Indian fitness blogs (write one genuinely useful article
   with one link back).
4. **Podcasts / interviews** — description links are strong entity signals.
5. **Directories already listed in §5.6** also pass links (Justdial, Sulekha,
   UrbanPro...).
6. **Social profiles** (Instagram/YouTube/Facebook/LinkedIn) — complete bios,
   site link in bio, post 3–5×/week. Add all URLs to `sameAs` in the JSON-LD.
7. **Google Business Profile posts** weekly (offer, photo, tip) — small but free
   visibility with a link button.

---

## 9. Phase 7 — Measure and iterate (monthly, 30 min)

| What | Where | Watch for |
|---|---|---|
| Impressions / clicks / position per query | Search Console → Performance | brand queries hitting position 1–3; new non-brand queries appearing |
| Indexed pages | GSC → Pages | any "Crawled – not indexed" on money pages → fix content/thin pages |
| Core Web Vitals | GSC → Core Web Vitals + PSI | LCP > 2.5 s on mobile |
| Calls / direction requests / profile views | GBP Insights | rising calls = local pack working |
| Rank for target keywords | incognito, location = {{CITY}} (+ optional tool) | track weekly in a sheet |
| AI citation share | manual queries (§6.7) | mentions of the site/brand in AI answers |
| Leads | GA4 events (`whatsapp_click`, `phone_click`, `form_submit`) | conversion rate, not just traffic |

Then: double down on the 2–3 pages gaining impressions but ranking 5–20
(rewrite, add depth, add internal links) — that is the highest-ROI monthly task.

---

## 10. 90-day roadmap

| Week | Focus | Exit criteria |
|---|---|---|
| 1 | GSC + Bing + analytics; city data in titles/copy/footer; improved JSON-LD | sitemap submitted, 0 coverage errors, city visible site-wide |
| 2 | Google Business Profile created + verified; Apple/Bing Places; Map embed on contact | profile live, NAP identical everywhere |
| 3 | Image/WebP pass, self-host fonts, preload LCP, PSI mobile ≥ 90 | CWV in "good" in GSC |
| 4 | Prerender gallery/transformation photos; descriptive filenames; image sitemap | photos visible in page source without JS |
| 5–6 | On-page rewrite per §4 table; FAQ blocks; breadcrumb schema | every page owns one clear term |
| 5–12 | 2 articles/week (§7); weekly GBP posts; review requests after month 1 | 10+ articles live, 10+ GBP reviews |
| 7–8 | Citation building, locality page(s) with genuinely local content | 8–10 citations live |
| 9–12 | Backlinks: press, gym partners, guest posts, YouTube | 5–10 real referring domains |
| Monthly | §9 measurement + refresh top-20 pages | rising clicks, leads tracked |

---

## 11. Do NOT do (these lose rankings)

- Buy backlinks, use PBNs, link exchanges at scale, or comment spam.
- Buy or incentivise Google reviews, or write them yourself — GBP suspension risk.
- Mark up your own testimonials as `Review`/`aggregateRating` schema.
- Keyword-stuff the GBP business name or generate 20 city pages from one template.
- Hide text, cloaked pages, or AI-crawler-only content.
- Copy descriptions from competitors.
- Change URLs (adding/removing `.html`) more than once.

---

## 12. Copy-paste assets

### 12.1 Improved JSON-LD for `index.html` (replace the existing `@graph`)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "https://www.coachramesh.com/#ramesh",
      "name": "Ramesh Polisetty",
      "alternateName": "Coach Ramesh",
      "jobTitle": "Personal Trainer & Body Transformation Coach",
      "description": "Ramesh Polisetty is a personal trainer and body transformation coach in {{CITY}}, India, with 12+ years of coaching experience and 300+ client transformations. In-person coaching in {{CITY}} and online coaching worldwide.",
      "url": "https://www.coachramesh.com/",
      "image": "https://www.coachramesh.com/photos/hero-1.jpeg",
      "telephone": "+919963526973",
      "email": "ramesh.polisetty@gmail.com",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "{{STREET}}",
        "addressLocality": "{{CITY}}",
        "addressRegion": "{{REGION}}",
        "postalCode": "{{PIN}}",
        "addressCountry": "IN"
      },
      "knowsAbout": [
        "Personal training", "Body transformation", "Fat loss", "Muscle building",
        "Strength training", "Powerlifting", "Nutrition coaching"
      ],
      "sameAs": [
        "{{GBP_URL}}",
        "{{INSTAGRAM}}",
        "{{YOUTUBE}}",
        "{{LINKEDIN}}"
      ]
    },
    {
      "@type": "LocalBusiness",
      "@id": "https://www.coachramesh.com/#business",
      "name": "Ramesh Polisetty — Personal Trainer",
      "description": "Personal training, body transformation, strength and nutrition coaching in {{CITY}}, in person and online.",
      "url": "https://www.coachramesh.com/",
      "image": "https://www.coachramesh.com/photos/hero-1.jpeg",
      "telephone": "+919963526973",
      "email": "ramesh.polisetty@gmail.com",
      "priceRange": "₹₹",
      "currenciesAccepted": "INR",
      "founder": { "@id": "https://www.coachramesh.com/#ramesh" },
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "{{STREET}}",
        "addressLocality": "{{CITY}}",
        "addressRegion": "{{REGION}}",
        "postalCode": "{{PIN}}",
        "addressCountry": "IN"
      },
      "geo": { "@type": "GeoCoordinates", "latitude": "{{LAT}}", "longitude": "{{LNG}}" },
      "hasMap": "{{GBP_URL}}",
      "areaServed": [
        { "@type": "City", "name": "{{CITY}}" },
        { "@type": "Place", "name": "{{LOCALITY}}" },
        { "@type": "Country", "name": "India" },
        { "@type": "Place", "name": "Online coaching worldwide" }
      ],
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
          "opens": "06:00",
          "closes": "21:00"
        }
      ],
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Personal training services",
        "itemListElement": [
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "1-on-1 personal training in {{CITY}}", "url": "https://www.coachramesh.com/programs.html" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Online personal training and check-ins", "url": "https://www.coachramesh.com/programs.html" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Body transformation coaching", "url": "https://www.coachramesh.com/transformation.html" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Nutrition and diet coaching", "url": "https://www.coachramesh.com/nutrition.html" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Powerlifting and strength coaching", "url": "https://www.coachramesh.com/powerlifting.html" } }
        ]
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://www.coachramesh.com/#website",
      "url": "https://www.coachramesh.com/",
      "name": "Ramesh Polisetty — Personal Trainer in {{CITY}}",
      "inLanguage": "en-IN",
      "publisher": { "@id": "https://www.coachramesh.com/#ramesh" }
    }
  ]
}
</script>
```

### 12.2 Answer-shaped Q&A block (put on every service page)

```html
<section class="section faq">
  <h2>Personal training in {{CITY}} — common questions</h2>

  <h3>How much does a personal trainer in {{CITY}} cost?</h3>
  <p>Personal training with Ramesh Polisetty starts at ₹X per month for
  online coaching and ₹Y per month for in-person sessions in {{LOCALITY}}.
  Every plan includes a training program, nutrition guidance and check-ins.</p>

  <h3>Do you train beginners?</h3>
  <p>Yes. Most clients start as complete beginners; the first session is an
  assessment of your body, schedule and goal, and the plan is built from there.</p>
</section>
```

Then add `FAQPage` JSON-LD for exactly those questions (valid, aids AI answers
even though Google no longer shows FAQ rich results).

### 12.3 Locality page template (only for areas genuinely served)

`/personal-trainer-{{locality-slug}}.html`
- Title: `Personal Trainer in {{LOCALITY}}, {{CITY}} — Ramesh Polisetty`
- H1: `Personal trainer in {{LOCALITY}}`
- 400+ words that are **only true of this area**: gyms nearby, travel/time slots,
  client examples from this locality, parking/timings, nearby landmarks.
- Internal links to `/programs.html`, `/transformation.html`, `/contact.html`.
- One local photo with `alt="personal training in {{LOCALITY}}, {{CITY}}"`.
- `LocalBusiness` JSON-LD with `areaServed` = that locality.
- Add to `sitemap.xml` **and** the footer.

### 12.4 Image sitemap additions (`sitemap.xml`)

```xml
<url>
  <loc>https://www.coachramesh.com/transformation.html</loc>
  <lastmod>2026-10-13</lastmod>
  <image:image xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
    <image:loc>https://www.coachramesh.com/photos/transformation-fat-loss-hyderabad-1.webp</image:loc>
    <image:title>Fat loss transformation — coaching in Hyderabad</image:caption>
  </image:image>
</url>
```
(declare `xmlns:image` on the root `<urlset>`).

### 12.5 `llms.txt` (new file at the site root)

```text
# Ramesh Polisetty — Personal Trainer & Body Transformation Coach

> Ramesh Polisetty is a personal trainer and body transformation coach based in
> {{CITY}}, India, with 12+ years of coaching experience and 300+ client
> transformations. He offers 1-on-1 personal training in {{CITY}}, online
> coaching worldwide, strength and powerlifting coaching, and nutrition guidance.

Contact: +91 9963526973 · ramesh.polisetty@gmail.com · https://www.coachramesh.com/contact.html

## Primary pages
- [Personal training programs](https://www.coachramesh.com/programs.html): 1-on-1 and online coaching
- [Client transformations](https://www.coachramesh.com/transformation.html): before/after results with timelines
- [Powerlifting coaching](https://www.coachramesh.com/powerlifting.html): strength and meet preparation
- [Nutrition coaching](https://www.coachramesh.com/nutrition.html): Indian diet plans and fat loss
- [Client reviews](https://www.coachramesh.com/clients.html): named client testimonials
- [About the coach](https://www.coachramesh.com/about.html): experience and coaching philosophy
- [Book a consultation](https://www.coachramesh.com/contact.html): WhatsApp, phone, form
```

### 12.6 `robots.txt` — what to change and what NOT to change

The current file is right for this site:

```text
User-agent: *
Allow: /
Disallow: /config/
Disallow: /js/auth.js
Disallow: /js/supabase-config.js

Sitemap: https://www.coachramesh.com/sitemap.xml
```

- **Do not add `Disallow: /admin.html`.** It is already kept out of the index by
  a `noindex` meta tag plus an `X-Robots-Tag` header. A robots `Disallow` stops
  the crawl, so Google would never *see* that `noindex` — the classic way to end
  up with a bare URL listed in results. Leave it crawlable-but-noindexed.
- Keep `Disallow: /config/` (an internal JSON file nobody needs indexed).
- Add `Disallow: /docs/` **only if** you commit internal notes such as this plan
  and the handoff file — Vercel serves this repo from its root, so `docs/*.md`
  would otherwise be publicly readable.
- `/llms.txt` needs no rule; `Allow: /` already covers it.

---

## 13. Open questions for the site owner

1. **Which city and locality** does Ramesh train in (fills every `{{...}}` above)?
2. Is there a **fixed training address**, or is it a service-area business?
3. Does a **Google Business Profile** already exist? If yes, send the link.
4. Which **social profiles** exist today (Instagram, YouTube, Facebook, LinkedIn)?
5. Any **competition results, certifications or press mentions** we can cite as
   credentials? These are the strongest E-E-A-T assets for the About page.
6. Budget for tools (rank tracker, Ahrefs/Semrush) — optional, everything above
   can be done free.
