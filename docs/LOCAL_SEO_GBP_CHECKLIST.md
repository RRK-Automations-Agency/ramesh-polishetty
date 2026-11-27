# Google Business Profile — manual checklist (owner action)

Nothing in this file has been done automatically. No profile was created, claimed,
edited or verified, and the site does not submit indexing requests.

Confirmed facts to type in exactly as written (this is what the website now publishes,
so the profile and the site must not disagree):

| Field | Value |
|---|---|
| Professional name | Ramesh Polisetty |
| Website | https://www.coachramesh.com/ |
| Public telephone | +91 9963526973 |
| WhatsApp | +91 9963526973 (`https://wa.me/919963526973`) |
| Primary area | Medchal, Hyderabad, Telangana, India |
| Services | In-person coaching · Online coaching |
| Business model | Service-area business — **keep the address hidden** |
| Street address | **Not published anywhere. Do not add one.** |
| Opening hours | **Not confirmed. Leave blank.** |
| Pricing | Not published on the site. Leave prices out. |
| Social profiles | None supplied. Leave `sameAs`/social fields empty. |

## 1. First: does a profile already exist?

1. Search Google Maps for `Ramesh Polisetty`, then for `personal trainer Medchal`.
2. Also check `https://business.google.com` — if a profile exists, it appears under the
   signed-in Google account, and Google shows a "Claim this business"/"Own this profile"
   option on the Maps listing.
3. Outcome decides everything below:
   - **Exists and you control it** → skip to step 3 (audit what is there) and correct any
     field that disagrees with the table above.
   - **Exists but you do not control it** → use *Claim this business* and complete
     Google's verification. Do not create a second profile — a duplicate splits or
     suppresses your visibility.
   - **Does not exist** → continue to step 2.

## 2. Create it (only if step 1 found nothing)

1. https://business.google.com → *Add business* → enter the real name:
   **`Ramesh Polisetty`**.
   - Do **not** add keywords to the name ("Best Personal Trainer in Medchal…"). A
     keyword-stuffed name is the most common cause of suspension.
2. Business type: **Service area business** ("I deliver goods and services to my
   customers"). Choose this, not storefront, unless you genuinely serve clients at a
   fixed staffed location (see step 6).
3. Service area: **Medchal** plus the areas you actually coach in, and the wider
   Hyderabad area you genuinely cover. Google allows a limited number — list only areas
   you would really travel to. Do not add the whole country; "online coaching worldwide"
   is not a service area.
4. **Address: leave the street address out of the public profile.** If Google requires a
   mailing address for verification, it stays unlisted.
5. Primary category: **Personal trainer**.
   Secondary categories — add only those that are true and that you actually deliver:
   *Fitness center*, *Nutritionist*, *Health consultant*, *Physical fitness program*.
   More categories is not better; a false one is a suspension risk.
6. Website: `https://www.coachramesh.com/` (exactly — with `www`).
   Phone: `+91 9963526973`.
7. Leave **opening hours blank** until you confirm the real hours. The website currently
   shows "Mon–Sat · 6:00 AM – 9:00 PM" on the contact page, and the homepage JSON-LD
   carries the same window — if that is not accurate, tell me and I will fix or remove it
   from the site as well, because the profile and the site must match.
8. Services: add the real ones — 1-on-1 personal training, online coaching, body
   transformation coaching, strength/powerlifting coaching, nutrition and meal plans.
   No prices unless you decide to publish them.
9. Description (750 chars max): reuse the wording already on the site. A safe opening:
   *"Ramesh Polisetty is a personal trainer and body transformation coach working with
   clients in person around Medchal and Hyderabad, and online worldwide. 1-on-1 coaching,
   structured training, nutrition guidance and regular check-ins."*
   Do not add years of experience, client counts, credentials, awards or guarantees that
   are not confirmed.
10. Photos: real photos only — you, your clients (with their permission), and training.
    Use the ones already on the site. No stock images, no before/after composites that
    are not genuine.
11. Verification: Google chooses the method (video, phone, postcard, or instant). It can
    take up to a couple of weeks. Nothing else in this list is worth doing before the
    profile is verified.

## 3. After it is verified

- **Reviews:** ask real clients for a Google review after their first month. No
  incentives, no discounts for reviews, no writing them yourself, no review gating. Reply
  to every review within 48 hours.
- **NAP consistency:** the same name, phone and website on the profile, the site footer /
  contact page, and every directory listing. The site now prints the phone, the service
  area and the WhatsApp destination in the footer of every public page for exactly this
  reason.
- Post a photo or update weekly, and keep the "Services" list current.
- If you also want Apple Maps and Bing Places listings, use the same NAP. (Bing feeds
  Copilot/ChatGPT search.)

## 4. What is still missing before the site can do more local SEO

- **No locality landing pages have been created**, deliberately. A page per locality is
  worth building only where you genuinely serve that area *and* there is real,
  locality-specific content to write — which gyms, which timings, which clients. Say the
  word per locality and I will build them one at a time, not from a template.
- **No social profile URLs exist**, so nothing was added to `sameAs` in the structured
  data. Send the URLs and they can be added.
- **No street address, postcode, coordinates or map** were added. A service-area business
  does not need them, and inventing them would be worse than omitting them.
- **No `Review`/`aggregateRating` markup** was added to the site's own testimonials —
  self-serving review markup is ineligible for rich results and is a spam risk. Stars
  belong on the Google profile.

## 5. If you later confirm a fixed, staffed location

If clients really do come to a fixed place you staff, with signage, during published
hours, then the correct configuration is a **hybrid** profile: a storefront (address
shown) plus a service area. That is a different setup from the service-area profile
described above, and it should be decided deliberately rather than assumed — it changes
what the profile shows, what the site should publish, and whether a map and
`PostalAddress` belong in the structured data. **Do not switch to a storefront
configuration on the assumption that it ranks better.**
