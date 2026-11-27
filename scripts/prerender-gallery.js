#!/usr/bin/env node
/**
 * Static prerender for the Supabase-backed galleries.
 *
 * WHY THIS EXISTS
 * ---------------
 * index.html, gallery.html, transformation.html, achievements.html and
 * powerlifting.html draw their photos in JavaScript after fetching Supabase.
 * Google does render JavaScript eventually, but a JS-only page is a weaker and
 * slower signal, and the photo captions (the part with the actual words on it)
 * exist nowhere in the HTML — which is what "Discovered - currently not
 * indexed" usually means for a page like this. So the photo list is baked into
 * the HTML at build time instead, and js/gallery.js keeps working exactly as
 * before on top of it (it re-renders after its own fetch, which is what makes
 * the filters and the lightbox work).
 *
 * HOW
 * ---
 * Reads the rows with the public anon key (RLS already allows public SELECT;
 * no service-role key is used or needed) and injects the cards between
 *   <!-- prerender:start --> and <!-- prerender:end -->
 * markers inside each page's [data-gallery] container.
 *
 * FAIL-SAFE BY DESIGN
 * -------------------
 * A build step that can fail is a build step that can take the site down, so
 * every failure path here is non-fatal: no credentials, network error, empty
 * table, missing or duplicated markers — the script logs and exits 0, leaving
 * the page exactly as committed (empty container, client-side rendering). It
 * never throws and never writes a partially built page.
 *
 * Usage:
 *   node scripts/prerender-gallery.js            # in place (what Vercel runs)
 *   node scripts/prerender-gallery.js --out DIR  # write pages into DIR instead
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const START = '<!-- prerender:start -->';
const END = '<!-- prerender:end -->';
/* Same stagger js/gallery.js uses, so the static layout matches the hydrated
   one instead of reflowing when the script takes over. */
const MASONRY_RATIOS = ['3/4', '4/5', '1/1', '4/3', '2/3', '1/1', '5/6'];

/* Which page gets which slice of the photos. `filter` mirrors the page's
   default active filter button; `max` mirrors data-max. */
const TARGETS = [
  { file: 'index.html', filter: null, max: 6 },
  { file: 'gallery.html', filter: null, max: null },
  { file: 'transformation.html', filter: 'transformations', max: null },
  { file: 'achievements.html', filter: 'achievements', max: null },
  { file: 'powerlifting.html', filter: 'powerlifting', max: null }
];

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : null;
}

function readSettings() {
  // Env first (Vercel), then the generated config.json (build-config.js runs
  // first in the build command), so a local `npm run build` works too.
  let cfg = {};
  try {
    cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'config.json'), 'utf8'));
  } catch (e) {
    cfg = {};
  }
  return {
    url: (process.env.SUPABASE_URL || cfg.SUPABASE_URL || '').replace(/\/+$/, ''),
    key: process.env.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY || '',
    table: process.env.TABLE_NAME || cfg.TABLE_NAME || 'photos'
  };
}

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function api(url, key, query) {
  const res = await fetch(url + '/rest/v1/' + query, {
    headers: { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/json' },
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error('HTTP ' + res.status + ' ' + body.slice(0, 200));
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/* The browser orders by display_order when the column exists and by created_at
   otherwise (js/gallery.js). Ask the same way so the static list is in the same
   order the owner arranged. */
async function fetchPhotos({ url, key, table }) {
  const columns = 'id,image_url,label,category,note,created_at';
  if (!url || !key) return null;

  try {
    return await api(url, key, table + '?select=' + columns + ',display_order'
      + '&order=display_order.asc.nullslast,created_at.desc');
  } catch (e) {
    if (e.status !== 400 && e.status !== 404) throw e;
    // 42703 / PGRST204 — migration 004 has not been run. Fall back to the
    // created-at order the gallery uses in that case.
    return api(url, key, table + '?select=' + columns + '&order=created_at.desc');
  }
}

function sortPhotos(rows) {
  // Mirrors GalleryData._sortItems: display_order ascending, stable, so rows
  // that still carry the default 0 keep the created-at order from the query.
  return rows.slice().sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));
}

function card(item, index, indent) {
  const pad = ' '.repeat(indent);
  const src = String(item.image_url || '').trim();
  // A row without an image gets no static card: the placeholder squares are a
  // JS nicety, not content worth putting in the HTML.
  if (!src) return '';
  const alt = item.label ? esc(item.label) : 'Photo from Ramesh Polisetty';
  return [
    pad + '<div class="gitem" style="--ar:' + MASONRY_RATIOS[index % MASONRY_RATIOS.length] + '">',
    pad + '  <img src="' + esc(src) + '" alt="' + alt + '" loading="lazy" decoding="async" />',
    pad + '  <span class="cat">' + esc(item.category) + '</span>',
    pad + '  <div class="cap">' + esc(item.label) + '</div>',
    pad + '</div>'
  ].join('\n');
}

function inject(html, markup) {
  const starts = html.split(START).length - 1;
  const ends = html.split(END).length - 1;
  if (starts !== 1 || ends !== 1) {
    return { html, skipped: 'expected exactly 1 marker pair, found ' + starts + '/' + ends };
  }
  const re = new RegExp(START + '[\\s\\S]*?' + END);
  const body = markup ? '\n' + markup + '\n' : '\n';
  return { html: html.replace(re, START + body + END), skipped: null };
}

async function main() {
  const outDir = argValue('--out');
  const settings = readSettings();

  let rows;
  try {
    rows = await fetchPhotos(settings);
  } catch (e) {
    console.warn('[prerender] could not read photos (' + (e.message || e) + ') — leaving the galleries to client-side rendering.');
    return;
  }
  if (!rows) {
    console.log('[prerender] no Supabase credentials in this build — galleries stay client-side rendered.');
    return;
  }

  const photos = sortPhotos(rows);
  console.log('[prerender] ' + photos.length + ' photo row(s) from ' + settings.table);

  for (const target of TARGETS) {
    const file = path.join(outDir ? path.resolve(outDir) : ROOT, target.file);
    let html;
    try {
      html = fs.readFileSync(file, 'utf8');
    } catch (e) {
      console.warn('[prerender] ' + target.file + ': not readable — skipped.');
      continue;
    }

    const selected = (target.filter ? photos.filter((p) => p.category === target.filter) : photos)
      .slice(0, target.max == null ? undefined : target.max);
    const markup = selected.map((item, i) => card(item, i, 8)).filter(Boolean).join('\n');

    const result = inject(html, markup);
    if (result.skipped) {
      console.warn('[prerender] ' + target.file + ': ' + result.skipped + ' — skipped.');
      continue;
    }
    if (result.html === html) {
      console.log('[prerender] ' + target.file + ': already up to date.');
      continue;
    }
    fs.writeFileSync(file, result.html);
    console.log('[prerender] ' + target.file + ': ' + selected.length + ' card(s) written'
      + (target.filter ? ' (category "' + target.filter + '")' : '')
      + (target.max == null ? '' : ', max ' + target.max));
  }
}

main().catch((e) => {
  // Never fail the build over a prerender problem.
  console.warn('[prerender] unexpected error, leaving pages untouched:', e && e.message ? e.message : e);
});
