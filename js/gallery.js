/* ============================================================
   RAMESH POLISETTY — gallery + lightbox
   Reads photos saved by the admin panel (localStorage + Supabase fallback).
   Loaded on pages that contain a [data-gallery] element.
   ============================================================ */

/* Storage key shared with the admin panel */
const GalleryData = {
  KEY: "rp_gallery_items",

  /* Default placeholder cards so the gallery is never empty.
     Replace with real photos from the admin panel. */
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

  async load() {
    // Load from Supabase cloud storage
    if (window.getSupabaseClient && window.getSupabaseClient()) {
      try {
        const client = window.getSupabaseClient();
        const { data, error } = await client
          .from(window.SUPABASE_CONFIG.tableName)
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.warn('Supabase query error (table may not exist yet):', error.message);
          return this.DEFAULTS.map((d) => ({ ...d }));
        }
        
        if (data && data.length > 0) {
          return data.map(item => ({
            id: item.id,
            src: item.image_url,
            cat: item.category,
            label: item.label,
            note: item.note || ''
          }));
        }
        
        // Table exists but empty
        return [];
      } catch (e) {
        console.error('Supabase load failed:', e.message || e);
        return this.DEFAULTS.map((d) => ({ ...d }));
      }
    }
    
    // Supabase not configured
    console.warn('Supabase not configured — cannot load photos.');
    return this.DEFAULTS.map((d) => ({ ...d }));
  },

  async save(items) {
    // Photos are managed via Supabase directly
    // This method is kept for compatibility but is no longer the primary storage
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
    
    // Save metadata to database
    const { data: dbData, error: dbError } = await client
      .from(window.SUPABASE_CONFIG.tableName)
      .insert({
        image_url: urlData.publicUrl,
        category: metadata.cat,
        label: metadata.label,
        note: metadata.note,
        file_name: fileName
      })
      .select();
    
    if (dbError) return { error: dbError.message };
    
    return { data: dbData[0] };
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
    container.innerHTML = '<p class="note-hint" style="grid-column:1/-1;">No photos here yet. Ramesh can add some from the admin panel.</p>';
    return;
  }
  items.forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "gitem";
    card.style.setProperty("--ar", MASONRY_RATIOS[i % MASONRY_RATIOS.length]);
    card.innerHTML =
      (item.src
        ? '<img src="' + escHTML(item.src) + '" alt="' + escHTML(item.label) + '" loading="lazy"/>'
        : '<div class="ph"><div><div class="pico">📸</div><small>Add photo</small></div></div>') +
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
  container.__items = items;
  renderCards(container, items);

  if (container.dataset.filters) {
    bindFilters(document.querySelector(container.dataset.filters), container);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize Supabase if available
  if (window.loadConfig) await window.loadConfig();
  if (window.initSupabase) await window.initSupabase();

  document.querySelectorAll("[data-gallery]").forEach(initGallery);
});

/* expose for the admin panel */
window.GalleryData = GalleryData;
