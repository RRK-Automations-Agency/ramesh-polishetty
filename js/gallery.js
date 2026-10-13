/* ============================================================
   RAMESH POLISETTY — gallery + lightbox
   Reads photos from Supabase, with a local cache fallback.
   Loaded on pages that contain a [data-gallery] element.

   Photo order: every row may carry a numeric `display_order` that the
   admin panel writes (see js/admin.js). Smaller numbers come first;
   rows that still carry the default 0 keep their old created-at
   ordering.

   The column is optional. PostgREST rejects ANY request that names a
   column the database does not have — 42703 for reads ("column
   photos.display_order does not exist") and PGRST204 for writes ("Could
   not find the 'display_order' column of 'photos' in the schema cache")
   — so a database that has not run migration 004 must never be asked
   about it. GalleryData.hasOrderColumn() probes the column once per page
   load and every read/write goes through it, falling back to created-at
   order when the column is absent.
   ============================================================ */

/* ---------- the optional ordering column ---------- */
const ORDER_COLUMN = 'display_order';

/* Both PostgREST shapes of "this database has no display_order column":
   
     { code: '42703',   message: 'column photos.display_order does not exist' }              (read)
     { code: 'PGRST204', message: "Could not find the 'display_order' column of 'photos'" }   (write)

   The codes are stable, the wording is not, so trust the code first and
   only fall back to the message. Matching text alone is what broke this
   before: the old check looked for a *quoted* "display_order" that
   PostgREST never sends, so the fallback never ran. */
function isMissingOrderColumn(error) {
  const code = (error && error.code) || '';
  if (code === '42703' || code === 'PGRST204') return true;
  const msg = (error && (error.message || error.details)) || String(error || '');
  return /display_order/i.test(msg) && /(does not exist|schema cache)/i.test(msg);
}

/* Local cache key for photo items */
const GalleryData = {

  /* Map a raw DB row onto the shape every caller expects, including any
     new columns the admin tools add (e.g. display_order). Keep the
     normalisation in one place so new fields are handled uniformly across
     the admin list, the gallery and the lightbox. */
  _normalizeItem(row) {
    return {
      id:        row.id,
      src:       row.image_url,
      cat:       row.category || '',
      label:     row.label || '',
      note:      row.note || '',
      file_name: row.file_name || null,
      order:     (row.display_order != null) ? Number(row.display_order) : 0,
      // Kept so the admin panel can put everything back into upload-date
      // order after a lot of manual dragging.
      created_at: row.created_at || null,
    };
  },

  KEY: "rp_gallery_items",

  /* Default placeholder cards so the gallery is never empty.
     Shown until real photos are available. */
  DEFAULTS: [
    { id: "d1", src: "", cat: "transformations", label: "Transformation — Fat loss",  note: "" },
    { id: "d2", src: "", cat: "transformations", label: "Transformation — Muscle gain", note: "" },
    { id: "d3", src: "", cat: "transformations", label: "Transformation — 6-month journey", note: "" },
    { id: "d4", src: "", cat: "achievements", label: "Achievement — Competition win", note: "" },
    { id: "d5", src: "", cat: "powerlifting", label: "Powerlifting — Deadlift PR", note: "" },
    { id: "d6", src: "", cat: "coach", label: "Ramesh — In the gym", note: "" },
    { id: "d7", src: "", cat: "clients", label: "Client — Progress check", note: "" },
    { id: "d8", src: "", cat: "clients", label: "Client — Goal achieved", note: "" }
  ],

  /* Exposed so js/admin.js maps errors the same way. */
  isMissingOrderColumn,

  /* Cached answer to "does this database have display_order?" — null means
     not asked yet. One cheap limit-1 read answers it for the whole page
     load, so an un-migrated database costs exactly one 400 and then every
     later read/write stays clean. */
  _orderColumn: null,

  async hasOrderColumn() {
    if (this._orderColumn !== null) return this._orderColumn;

    const client = window.getSupabaseClient && window.getSupabaseClient();
    if (!client) { this._orderColumn = false; return false; }

    const { error } = await client
      .from(window.SUPABASE_CONFIG.tableName)
      .select(ORDER_COLUMN)
      .limit(1);

    this._orderColumn = !error;
    if (error && isMissingOrderColumn(error)) {
      console.warn('display_order is not in this database yet — using created-at order. '
        + 'Run supabase/migrations/20240101000004_add_display_order.sql to enable a custom order.');
    } else if (error) {
      console.warn('display_order probe failed:', error.message || error);
    }
    return this._orderColumn;
  },

  /* Photos are ordered by display_order first, then newest first, and the
     sort is redone client side so an installed-without-the-column database
     still ends up in a sensible sequence. Array#sort is stable, so rows
     that share the same order value keep the created-at order the database
     returned. */
  _sortItems(items) {
    return items.slice().sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  },

  async load() {
    // Load from Supabase cloud storage
    if (window.getSupabaseClient && window.getSupabaseClient()) {
      try {
        const client = window.getSupabaseClient();
        const table = window.SUPABASE_CONFIG.tableName;

        // Ask before ordering: on a database without the column, naming it
        // in the query fails the whole read and the gallery goes empty.
        const hasOrder = await this.hasOrderColumn();
        const base = client.from(table).select('*');
        const { data, error } = await (hasOrder
          ? base.order(ORDER_COLUMN, { ascending: true, nullsFirst: false }).order('created_at', { ascending: false })
          : base.order('created_at', { ascending: false }));

        if (error) {
          // The probe said the column exists but this database disagrees —
          // a stale PostgREST schema cache right after the migration ran.
          // Retry once without it so the photos still show up.
          if (isMissingOrderColumn(error)) {
            this._orderColumn = false;
            const { data: fb, error: fbErr } = await client
              .from(table)
              .select('*')
              .order('created_at', { ascending: false });
            if (!fbErr && fb) return fb.map((row) => this._normalizeItem(row));
            if (fbErr) console.error('Supabase load failed:', fbErr.message || fbErr);
            return this.DEFAULTS.map((d) => ({ ...d }));
          }

          console.warn('Supabase query error (table may not exist yet):', error.message);
          return this.DEFAULTS.map((d) => ({ ...d }));
        }

        // Table exists but is empty — the gallery shows its "nothing here
        // yet" note rather than fake placeholder cards.
        if (!data) return [];
        return this._sortItems(data.map((row) => this._normalizeItem(row)));
      } catch (e) {
        console.error('Supabase load failed:', e.message || e);
        return this.DEFAULTS.map((d) => ({ ...d }));
      }
    }

    // Supabase not configured
    console.warn('Supabase not configured — cannot load photos.');
    return this.DEFAULTS.map((d) => ({ ...d }));
  },

  /* Photos are managed via Supabase directly.
     This method is kept for compatibility but is no longer the primary
     storage — the gallery always re-reads from Supabase on load. */
  save(items) {
    try { localStorage.setItem(this.KEY, JSON.stringify(items)); return true; }
    catch (e) { return false; }
  },

  usage() {
    return { used: 0, total: Infinity };
  },

  // Upload photo to Supabase Storage
  async uploadToSupabase(file, metadata) {
    if (!window.getSupabaseClient || !window.getSupabaseClient()) {
      return { error: 'Supabase not configured' };
    }

    const client = window.getSupabaseClient();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${file.name.split('.').pop()}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await client.storage
      .from(window.SUPABASE_CONFIG.bucketName)
      .upload(fileName, file);

    if (uploadError) return { error: uploadError.message };

    // Get public URL
    const { data: urlData } = client.storage
      .from(window.SUPABASE_CONFIG.bucketName)
      .getPublicUrl(fileName);

    // Save metadata to database. display_order is written only when the
    // caller supplied one AND this database has the column — an insert that
    // mentions a missing column is rejected with PGRST204, which is what
    // broke uploading. Ask first, then include it.
    const row = {
      image_url: urlData.publicUrl,
      category: metadata.cat,
      label: metadata.label,
      note: metadata.note,
      file_name: fileName
    };
    if (metadata.order != null && await this.hasOrderColumn()) {
      row.display_order = metadata.order;
    }

    const { data: dbData, error: dbError } = await client
      .from(window.SUPABASE_CONFIG.tableName)
      .insert(row)
      .select();

    if (dbError) {
      if (isMissingOrderColumn(dbError)) {
        return { error: 'This database has no photo-order column yet, so the photo was not saved. '
          + 'Run supabase/migrations/20240101000004_add_display_order.sql in the Supabase SQL editor and try again.' };
      }
      return { error: dbError.message };
    }

    return { data: dbData[0] };
  },

  // Delete photo from Supabase (storage + database)
  async deleteFromSupabase(item) {
    if (!window.getSupabaseClient || !window.getSupabaseClient()) {
      return { error: 'Supabase not configured' };
    }

    const client = window.getSupabaseClient();

    // Delete from storage if file_name exists
    if (item.file_name) {
      const { error: storageError } = await client.storage
        .from(window.SUPABASE_CONFIG.bucketName)
        .remove([item.file_name]);
      if (storageError) console.warn('Storage delete warning:', storageError.message);
    }

    // Delete from database
    const { error: dbError } = await client
      .from(window.SUPABASE_CONFIG.tableName)
      .delete()
      .eq('id', item.id);

    if (dbError) return { error: dbError.message };
    return { success: true };
  }
};

/* ---------- sanitize HTML to prevent XSS ---------- */
function escHTML(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/* ---------- card rendering ---------- */
/* Masonry rhythm: placeholders get a varied aspect ratio so the
   staggered layout looks intentional even before real photos exist. */
const MASONRY_RATIOS = ["3/4", "4/5", "1/1", "4/3", "2/3", "1/1", "5/6"];
function renderCards(container, items) {
  container.innerHTML = "";
  if (!items.length) {
    container.innerHTML = '<p class="note-hint" style="grid-column:1/-1;">No photos here yet — new ones are on the way.</p>';
    return;
  }
  items.forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "gitem";
    card.style.setProperty("--ar", MASONRY_RATIOS[i % MASONRY_RATIOS.length]);
    card.innerHTML =
      (item.src
        ? '<img src="' + escHTML(item.src) + '" alt="' + escHTML(item.label) + '" loading="lazy"/>'
        : '<div class="ph"><div><div class="pico">📸</div><small>Coming soon</small></div></div>') +
      '<span class="cat">' + escHTML(item.cat) + '</span>' +
      '<div class="cap">' + escHTML(item.label) + '</div>';
    card.addEventListener("click", () => openLightbox(container.__items, i));
    container.appendChild(card);
  });
}

/* ---------- filters ---------- */
function bindFilters(bar, container) {
  if (!bar || !container) return;
  bar.querySelectorAll(".filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      bar.querySelectorAll(".filter").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const f = btn.dataset.filter;
      container.__items = (f === "all") ? container.__all : container.__all.filter((i) => i.cat === f);
      renderCards(container, container.__items);
    });
  });
}

/* ---------- lightbox ---------- */
let lbEl = null, curList = [], curIdx = 0;

function ensureLb() {
  if (lbEl) return;
  lbEl = document.createElement("div");
  lbEl.className = "lb";
  lbEl.setAttribute("role", "dialog");
  lbEl.setAttribute("aria-modal", "true");
  lbEl.innerHTML =
    '<div class="lb-box">' +
      '<button class="lb-close" aria-label="Close">✕</button>' +
      '<div class="lb-media"></div>' +
      '<div class="lb-cap"></div>' +
      '<button class="lb-btn lb-prev" aria-label="Previous">‹</button>' +
      '<button class="lb-btn lb-next" aria-label="Next">›</button>' +
      '<div class="lb-count"></div>' +
    "</div>";
  document.body.appendChild(lbEl);

  const close = () => { lbEl.classList.remove("open"); document.body.style.overflow = ""; };
  lbEl.querySelector(".lb-close").addEventListener("click", close);
  lbEl.querySelector(".lb-prev").addEventListener("click", () => stepLb(-1));
  lbEl.querySelector(".lb-next").addEventListener("click", () => stepLb(1));
  lbEl.addEventListener("click", (e) => { if (e.target === lbEl) close(); });
  document.addEventListener("keydown", (e) => {
    if (!lbEl.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") stepLb(-1);
    if (e.key === "ArrowRight") stepLb(1);
  });
}

function openLightbox(list, i) {
  ensureLb();
  curList = list;
  curIdx = i;
  showLb();
}

function showLb() {
  const item = curList[curIdx];
  if (!item) return;
  const media = lbEl.querySelector(".lb-media");
  const cap   = lbEl.querySelector(".lb-cap");
  const count = lbEl.querySelector(".lb-count");
  media.innerHTML = item.src
    ? '<img src="' + escHTML(item.src) + '" alt="' + escHTML(item.label) + '"/>'
    : '<div class="ph"><div><div class="pico">📸</div><p>Photo coming soon</p></div></div>';
  cap.innerHTML = escHTML(item.label) + '<small>' + escHTML(item.cat) + '</small>';
  count.textContent = (curIdx + 1) + " / " + curList.length;
  lbEl.classList.add("open");
  document.body.style.overflow = "hidden";
}

function stepLb(d) { curIdx = (curIdx + d + curList.length) % curList.length; showLb(); }

/* ---------- auto-init on any [data-gallery] element ---------- */
async function initGallery(container) {
  if (!container || container.dataset.done) return;
  container.dataset.done = "1";

  const max = parseInt(container.dataset.max || "", 10);

  // Show loading state
  container.innerHTML = '<p class="note-hint" style="grid-column:1/-1;">Loading photos...</p>';

  const all = await GalleryData.load();
  const items = isNaN(max) ? all : all.slice(0, max);

  container.__all = all;

  if (container.dataset.filters) {
    const bar = document.querySelector(container.dataset.filters);
    const activeBtn = bar ? bar.querySelector(".filter.active") : null;
    const activeFilter = activeBtn ? activeBtn.dataset.filter : null;
    if (activeFilter && activeFilter !== "all") {
      container.__items = all.filter((i) => i.cat === activeFilter);
    } else {
      container.__items = items;
    }
    renderCards(container, container.__items);
    bindFilters(bar, container);
  } else {
    container.__items = items;
    renderCards(container, container.__items);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize Supabase if available
  if (window.loadConfig) await window.loadConfig();
  if (window.initSupabase) await window.initSupabase();

  document.querySelectorAll("[data-gallery]").forEach(initGallery);
});

/* expose shared data for other scripts */
window.GalleryData = GalleryData;
