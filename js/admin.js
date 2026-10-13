/* ============================================================
   RAMESH POLISETTY — admin panel
   Secure login gate + photo manager with dashboard, edit, search.
   Uses Supabase Auth for authentication (no hardcoded passwords).
   ============================================================ */

/* ---------- DOM helpers ---------- */
const $  = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => [...(c || document).querySelectorAll(s)];

/* ---------- login gate ---------- */
function isLoggedIn() { return window.Auth && window.Auth.isLoggedIn(); }
function setLoggedIn(v) {
  if (!v && window.Auth) window.Auth.logout();
}

/* ---------- sanitize HTML to prevent XSS ---------- */
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- update supabase status ---------- */
function updateSupabaseStatus() {
  const statusEl = $("#supabase-status");
  if (!statusEl) return;
  
  if (!window.getSupabaseStatus) {
    statusEl.textContent = "Checking Supabase...";
    return;
  }
  
  const status = window.getSupabaseStatus();
  statusEl.textContent = status.message;
  
  if (status.status === 'online') {
    statusEl.style.borderColor = 'var(--success)';
    statusEl.style.color = 'var(--success)';
  } else if (status.status === 'offline') {
    statusEl.style.borderColor = 'var(--line-2)';
    statusEl.style.color = 'var(--muted)';
  } else {
    statusEl.style.borderColor = 'var(--warning)';
    statusEl.style.color = 'var(--warning)';
  }
}

/* ---------- dashboard stats ---------- */
async function updateDashboardStats() {
  const items = await GalleryData.load();
  
  const stats = {
    total: items.length,
    transformations: items.filter(i => i.cat === 'transformations').length,
    achievements: items.filter(i => i.cat === 'achievements').length,
    powerlifting: items.filter(i => i.cat === 'powerlifting').length,
    coach: items.filter(i => i.cat === 'coach').length,
    clients: items.filter(i => i.cat === 'clients').length
  };
  
  const statTotal = $('#stat-total');
  if (statTotal) statTotal.textContent = stats.total;
  
  const statTransformations = $('#stat-transformations');
  if (statTransformations) statTransformations.textContent = stats.transformations;
  
  const statAchievements = $('#stat-achievements');
  if (statAchievements) statAchievements.textContent = stats.achievements;
  
  const statPowerlifting = $('#stat-powerlifting');
  if (statPowerlifting) statPowerlifting.textContent = stats.powerlifting;
  
  const statCoach = $('#stat-coach');
  if (statCoach) statCoach.textContent = stats.coach;
  
  const statClients = $('#stat-clients');
  if (statClients) statClients.textContent = stats.clients;
}

/* ---------- search functionality ---------- */
let allItems = [];

function filterItems(query) {
  if (!query || !query.trim()) return allItems;
  const q = query.toLowerCase().trim();
  return allItems.filter(item =>
    (item.label && item.label.toLowerCase().includes(q)) ||
    (item.cat && item.cat.toLowerCase().includes(q)) ||
    (item.note && item.note.toLowerCase().includes(q))
  );
}

/* ---------- admin list ---------- */
async function renderList(searchQuery) {
  allItems = await GalleryData.load();
  const items = searchQuery ? filterItems(searchQuery) : allItems;
  const list = $("#admin-list");
  const count = $("#list-count");
  if (count) {
    count.textContent = searchQuery
      ? items.length + " of " + allItems.length
      : allItems.length + (allItems.length === 1 ? " photo" : " photos");
  }
  list.innerHTML = "";
  
  if (!items.length) {
    list.innerHTML = '<p class="note-hint" style="grid-column:1/-1;">' +
      (searchQuery
        ? 'No photos match that search. Clear the search box to see everything again.'
        : 'No photos yet. Use the form above: type a title, pick a category, then choose the photo.') +
      '</p>';
    return;
  }
  
  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "admin-item";
    el.draggable = "true";
    el.dataset.id = item.id;
    el.dataset.order = String(item.order ?? 0);
    // Show the position in the full list, not in the search results, so the
    // number always matches where the photo sits on the website.
    const rank = allItems.findIndex((x) => x.id === item.id) + 1;
    el.innerHTML =
      '<button class="admin-item-rank" type="button" title="Set an exact position on the website">#' + rank + '</button>' +
      (item.src
        ? '<img src="' + escapeHTML(item.src) + '" alt="' + escapeHTML(item.label) + '" loading="lazy"/>'
        : '<div class="a-ph">📸</div>') +
      '<div class="a-meta"><b>' + escapeHTML(item.label) + '</b><span>' + escapeHTML(item.cat) + '</span>' +
      (item.note ? '<p>' + escapeHTML(item.note) + '</p>' : '') + '</div>' +
      '<div class="admin-item-actions">' +
      '<button class="edit" title="Edit">✎</button>' +
      '<button class="del" title="Delete">✕</button>' +
      '</div>';
    
    // Edit button
    el.querySelector(".edit").addEventListener("click", () => openEditModal(item));

    // The #number badge opens the "set an exact position" dialog.
    el.querySelector(".admin-item-rank").addEventListener("click", () => openOrderEditor(item));


    // Delete button with confirmation
    el.querySelector(".del").addEventListener("click", async () => {
      const confirmed = confirm('Remove "' + item.label + '" from the website?\n\nIt disappears from the gallery right away. This cannot be undone.');
      if (!confirmed) return;
      
      const status = $("#upload-status");
      
      if (window.getSupabaseClient && window.getSupabaseClient()) {
        const result = await GalleryData.deleteFromSupabase(item);
        if (result.error) {
          if (status) {
            status.textContent = 'Delete failed: ' + result.error;
            status.style.color = 'var(--danger)';
          }
          return;
        }
      }
      
      renderList($("#admin-search") ? $("#admin-search").value : '');
      updateDashboardStats();
      if (status) {
        status.textContent = 'Photo removed from the website.';
        status.style.color = 'var(--success)';
        setTimeout(() => { status.textContent = ''; }, 3000);
      }
    });
    
    list.appendChild(el);
  });

  /* ---------- drag to arrange (desktop-icon style) ----------

     Dragging a card opens an empty slot that follows the pointer: hover the
     left half of a card to open a space before it, the right half to open a
     space after it, and the other cards shift around that space exactly like
     icons moved on a desktop. Letting go drops the card into the slot and
     saves the sequence. Everything works from ids, so it still makes sense
     while a search filter is on. */
  let dragCard = null;
  let dropSlot = null;

  const cards = () => $$("#admin-list .admin-item:not(.drop-slot)");

  function openSlot(card, after) {
    if (!dropSlot) {
      dropSlot = document.createElement("div");
      dropSlot.className = "admin-item drop-slot";
      dropSlot.setAttribute("aria-hidden", "true");
      dropSlot.innerHTML = '<span class="drop-slot-label">Drop here</span>';
      // Match the card being dragged so the space that opens up is exactly
      // the size of the photo that will fill it.
      const h = (dragCard && dragCard.getBoundingClientRect) ? dragCard.getBoundingClientRect().height : 0;
      if (h > 0) dropSlot.style.minHeight = Math.round(h) + "px";
    }
    card.insertAdjacentElement(after ? "afterend" : "beforebegin", dropSlot);
  }

  /* Finish a drag: the card takes the slot's place, and the resulting order
     is returned (or null when the card was not moved anywhere). */
  function closeDrag() {
    const card = dragCard;
    const slot = dropSlot;
    dragCard = null;
    dropSlot = null;
    cards().forEach((c) => c.classList.remove("dragging", "drag-over"));
    if (!card || !slot || !slot.parentNode) return null;
    slot.parentNode.insertBefore(card, slot);
    slot.remove();
    return orderFromIds(card.dataset.id, cards().map((el) => el.dataset.id));
  }

  cards().forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      dragCard = card;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", card.dataset.id);
    });

    card.addEventListener("dragover", (e) => {
      if (!dragCard || dragCard === card) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const rect = card.getBoundingClientRect();
      const after = (e.clientX - rect.left) > rect.width / 2;
      openSlot(card, after);
      cards().forEach((c) => c.classList.toggle("drag-over", c === card));
    });

    card.addEventListener("dragleave", () => card.classList.remove("drag-over"));

    // dragend always fires — after a drop and when a drag is cancelled — so
    // the save happens here, in one place, whatever the browser does.
    card.addEventListener("dragend", async () => {
      const moved = closeDrag();
      if (!moved) return;
      await applyOrder(moved, moved.findIndex((x) => x.id === card.dataset.id) + 1);
    });
  });
}

/* Turn the order the cards are in on screen into the order to save. The list
   can be filtered by the search box, so the dragged card's new neighbours —
   not raw screen positions — are mapped back onto the full sequence: it lands
   directly above the photo it now sits in front of, and keeps that relative
   place in every filtered view. */
function orderFromIds(draggedId, visibleIds) {
  const item = allItems.find((x) => x.id === draggedId);
  if (!item) return null;

  const i = visibleIds.indexOf(draggedId);
  const beforeId = i >= 0 ? visibleIds[i + 1] || null : null;  // the card now below it
  const afterId  = i > 0 ? visibleIds[i - 1] : null;           // the card now above it

  const rest = allItems.filter((x) => x.id !== draggedId);
  let at = rest.length;

  if (beforeId) {
    const k = rest.findIndex((x) => x.id === beforeId);
    if (k >= 0) at = k;
  } else if (afterId) {
    const k = rest.findIndex((x) => x.id === afterId);
    if (k >= 0) at = k + 1;
  }

  const next = [...rest];
  next.splice(at, 0, item);
  return next;
}

/* ---------- saving a new order ----------

   The order the admin sees is ONE flat sequence for the whole gallery. Each
   category page on the website filters that same sequence, so a photo keeps
   its position relative to the other photos in its category.

   Two ways to store that sequence, picked automatically:

   1. `display_order` — the dedicated column from migration 004. Only the rows
      whose number changed are written.
   2. `created_at` — the fallback used while that migration has not been
      applied. The gallery sorts by this column, so the position is encoded
      into it: position 1 carries the NEWEST timestamp. Moving one photo then
      writes ONE row (a time between its two new neighbours) instead of
      renumbering the list, and the whole list is only rewritten when a gap is
      too small to split or the list is re-sorted wholesale.

   Applying migration 004 switches everything to method 1; the timestamps stay
   behind as the tie-breaker for rows that still carry display_order = 0. */
const ORDER_GAP_MS = 1000;   // spacing used when the list is rewritten
const MIN_GAP_MS   = 2000;   // smallest gap a single move may try to split

const UPDATE_REFUSED_HINT = 'The database refused the change — no row was updated. '
  + 'Check that the account you are signed in with is listed in the admin allowlist (public.admins).';

/* One short note after the first save through created_at, so the mechanism is
   never a surprise: shown once, then cleared. */
let orderStorageNote = '';

const asMs = (item) => (item.created_at ? new Date(item.created_at).getTime() : NaN);

async function persistOrder(list) {
  if (!list.length) return { saved: 0, error: null };

  const usesColumn = (typeof GalleryData.hasOrderColumn === 'function')
    ? await GalleryData.hasOrderColumn()
    : true;

  if (usesColumn) {
    const updates = [];
    list.forEach((item, idx) => {
      const next = idx + 1;
      if ((Number(item.order) || 0) !== next) {
        updates.push({ id: item.id, order: next });
      }
    });

    if (!updates.length) return { saved: 0, error: null };

    const error = await saveOrderUpdates(updates);
    if (error) return { saved: 0, error };

    // Keep the in-memory copy in step so the next move starts from the
    // sequence the admin is actually looking at.
    list.forEach((item, idx) => { item.order = idx + 1; });
    return { saved: updates.length, error: null };
  }

  const result = await persistDateOrder(list);
  if (!result.error && result.saved) {
    orderStorageNote = ' The order is kept in the photos\' upload-date field until migration'
      + ' 20240101000004_add_display_order.sql is applied.';
  }
  return result;
}

/* The one photo that changed place, when exactly one did — the drag case.
   { same: true } when nothing moved, { item, index } for a single move, or
   null when the list was reshuffled wholesale (a re-sort, or a photo dropped
   far away). */
function soleMovedItem(desired, current) {
  if (desired.length === current.length && desired.every((item, i) => item.id === current[i].id)) {
    return { same: true };
  }

  for (let i = 0; i < desired.length; i++) {
    const id = desired[i].id;
    const rest = desired.filter((x) => x.id !== id).map((x) => x.id).join(',');
    const now  = current.filter((x) => x.id !== id).map((x) => x.id).join(',');
    if (rest === now) return { item: desired[i], index: i };
  }
  return null;
}

/* Write timestamps in small parallel batches. PostgREST does not report an
   UPDATE that matched no row as an error — it answers with an empty list —
   so ask for the updated row back and treat an empty answer as a refusal. */
async function writeTimestamps(client, rows) {
  const table = window.SUPABASE_CONFIG.tableName;
  let written = 0;

  for (let i = 0; i < rows.length; i += 6) {
    const batch = rows.slice(i, i + 6);
    const results = await Promise.all(batch.map((row) =>
      client.from(table)
        .update({ created_at: new Date(row.at).toISOString() })
        .eq('id', row.id)
        .select('id')));

    const refused = results.find((r) => r.error || !r.data || !r.data.length);
    if (refused) {
      return { written, error: refused.error ? refused.error.message : UPDATE_REFUSED_HINT };
    }
    written += batch.length;
  }

  return { written, error: null };
}

/* Renumber the whole sequence: position 1 gets the newest timestamp and every
   photo below it one second older. Used when the order changes wholesale or
   when a gap has become too small to split any further. */
async function rewriteTimestamps(client, list) {
  const base = Date.now();
  const rows = list.map((item, idx) => ({ id: item.id, at: base - idx * ORDER_GAP_MS }));

  const { written, error } = await writeTimestamps(client, rows);
  if (error) return { saved: 0, error };

  list.forEach((item, idx) => { item.created_at = new Date(rows[idx].at).toISOString(); });
  return { saved: written, error: null };
}

/* Store the order in created_at — the path used while display_order does not
   exist. One write per drag; see the block comment above. */
async function persistDateOrder(list) {
  if (!window.getSupabaseClient || !window.getSupabaseClient()) {
    return { saved: 0, error: 'Supabase is not configured.' };
  }
  const client = window.getSupabaseClient();

  const current = [...list].sort((a, b) => asMs(b) - asMs(a));
  const moved = list.some((i) => isNaN(asMs(i))) ? null : soleMovedItem(list, current);

  if (moved && moved.same) return { saved: 0, error: null };
  if (!moved) return rewriteTimestamps(client, list);

  const { item, index } = moved;
  const above = list[index - 1];                // the photo it now follows (newer)
  const below = list[index + 1];                // the photo it now precedes (older)
  const hi = above ? asMs(above) : null;
  const lo = below ? asMs(below) : null;

  let at;
  if (hi == null && lo == null) return rewriteTimestamps(client, list);
  if (hi == null) at = lo + ORDER_GAP_MS;       // dropped at the top
  else if (lo == null) at = hi - ORDER_GAP_MS;  // dropped at the bottom
  else if (hi - lo < MIN_GAP_MS) return rewriteTimestamps(client, list);
  else at = Math.round((hi + lo) / 2);          // between its two new neighbours

  const { written, error } = await writeTimestamps(client, [{ id: item.id, at }]);
  if (error) return { saved: 0, error };

  item.created_at = new Date(at).toISOString();
  return { saved: written, error: null };
}

/* A missing display_order column means migration 004 has not been applied to
   this database yet. Explain that plainly instead of showing the raw
   Postgres error, because the fix is one paste into the Supabase SQL editor. */
const MISSING_ORDER_COLUMN_HINT = 'This database is missing the photo-order column, so photos cannot be reordered yet. '
  + 'Run supabase/migrations/20240101000004_add_display_order.sql in the Supabase SQL editor, then reload this page.';

/* js/gallery.js owns the detection (PostgREST codes 42703 / PGRST204); this
   fallback keeps the panel correct even if a browser still holds a cached
   copy of the older gallery.js. */
function isMissingOrderColumnError(error) {
  if (window.GalleryData && typeof window.GalleryData.isMissingOrderColumn === 'function') {
    return window.GalleryData.isMissingOrderColumn(error);
  }
  const code = (error && error.code) || '';
  if (code === '42703' || code === 'PGRST204') return true;
  const msg = (error && error.message) ? error.message : String(error || '');
  return /display_order/.test(msg) && /(does not exist|schema cache)/i.test(msg);
}

function orderSaveHint(error) {
  const msg = (error && error.message) ? error.message : String(error || '');
  if (isMissingOrderColumnError(error)) return MISSING_ORDER_COLUMN_HINT;
  return msg;
}

/* Shared save + re-render + status line for every reorder action. */
async function applyOrder(list, position) {
  allItems = list;
  const status = $("#upload-status");
  const { saved, error } = await persistOrder(list);

  if (error) {
    if (status) {
      status.textContent = "Could not save the new order: " + orderSaveHint(error);
      status.style.color = "var(--danger)";
    }
  } else if (status) {
    status.textContent = saved
      ? "Photo is now at position " + position + " on the website." + orderStorageNote
      : "That photo is already at position " + position + ".";
    orderStorageNote = '';
    status.style.color = saved ? "var(--success)" : "var(--muted)";
    setTimeout(() => { status.textContent = ""; }, 3000);
  }

  renderList($("#admin-search") ? $("#admin-search").value : "");
}

/* Move a photo to an exact position (1 = first). Used by the #number badge. */
async function moveItemToPosition(id, requested) {
  const list = [...allItems];
  const from = list.findIndex((x) => x.id === id);
  if (from < 0) return { error: "That photo is no longer in the list. Reload the page." };

  const to = Math.min(Math.max(requested, 1), list.length) - 1;
  const [moved] = list.splice(from, 1);
  list.splice(to, 0, moved);

  allItems = list;
  const { error } = await persistOrder(list);
  if (error) return { error };
  return { position: to + 1 };
}

/* Bulk persist order changes: one small request per changed row. Returns the
   first error message, or null when every row saved. `.select('id')` matters —
   an UPDATE that matches no row is not an error for PostgREST, it just comes
   back empty, which would look like a successful save. */
async function saveOrderUpdates(updates) {
  if (!updates.length) return null;
  if (!window.getSupabaseClient || !window.getSupabaseClient()) {
    return 'Supabase is not configured.';
  }
  const client = window.getSupabaseClient();
  let firstError = null;

  for (const u of updates) {
    const { data, error } = await client
      .from(window.SUPABASE_CONFIG.tableName)
      .update({ display_order: u.order })
      .eq('id', u.id)
      .select('id');
    if (error && !firstError) firstError = error.message;
    else if (!firstError && (!data || !data.length)) firstError = UPDATE_REFUSED_HINT;
  }

  return firstError;
}

/* ---------- edit modal ---------- */
function openEditModal(item) {
  const modal = $('#edit-modal');
  if (!modal) return;
  
  $('#edit-id').value = item.id;
  $('#edit-file-name').value = item.file_name || '';
  $('#edit-label').value = item.label || '';
  $('#edit-cat').value = item.cat || 'transformations';
  $('#edit-note').value = item.note || '';
  const orderField = $('#edit-order');
  if (orderField) {
    const pos = allItems.findIndex((x) => x.id === item.id) + 1;
    orderField.value = String(pos > 0 ? pos : (Number(item.order) || 1));
  }
  $('#edit-status').textContent = '';
  
  modal.style.display = 'flex';
}

function closeEditModal() {
  const modal = $('#edit-modal');
  if (modal) modal.style.display = 'none';
}

async function handleEditSave(e) {
  e.preventDefault();
  
  const id = $('#edit-id').value;
  const label = $('#edit-label').value.trim();
  const cat = $('#edit-cat').value;
  const note  = $('#edit-note').value.trim();
  // The position field is optional: an empty box means "leave it where it is".
  const orderField = $('#edit-order');
  const order = (orderField && orderField.value.trim() !== '')
    ? Math.max(1, parseInt(orderField.value, 10) || 1)
    : null;
  const status = $('#edit-status');

  if (!label) {
    status.textContent = 'Label is required.';
    status.style.color = 'var(--danger)';
    return;
  }
  
  if (!window.getSupabaseClient || !window.getSupabaseClient()) {
    status.textContent = 'Supabase is not configured.';
    status.style.color = 'var(--danger)';
    return;
  }
  
  const saveBtn = $('#edit-save');
  if (saveBtn) { saveBtn.textContent = 'Saving...'; saveBtn.disabled = true; }
  
  try {
    const client = window.getSupabaseClient();
    const updates = { label, category: cat, note };
    const { error } = await client
      .from(window.SUPABASE_CONFIG.tableName)
      .update(updates)
      .eq('id', id);

    if (error) {
      status.textContent = 'Update failed: ' + error.message;
      status.style.color = 'var(--danger)';
      return;
    }

    // A changed position is applied as a real move, so the list is renumbered
    // and no gaps or duplicate numbers are left behind.
    let movedTo = null;
    if (order != null) {
      const currentIdx = allItems.findIndex((x) => x.id === id);
      if (currentIdx >= 0 && currentIdx !== order - 1) {
        const move = await moveItemToPosition(id, order);
        if (move.error) {
          status.textContent = 'Details saved, but the new position could not be saved: ' + orderSaveHint(move.error);
          status.style.color = 'var(--danger)';
          return;
        }
        movedTo = move.position;
      }
    }

    status.textContent = movedTo
      ? 'Saved — this photo is now at position ' + movedTo + '.'
      : 'Saved successfully!';
    status.style.color = 'var(--success)';
    
    setTimeout(() => {
      closeEditModal();
      renderList($("#admin-search") ? $("#admin-search").value : '');
      updateDashboardStats();
    }, 800);
  } catch (err) {
    status.textContent = 'An error occurred. Please try again.';
    status.style.color = 'var(--danger)';
  } finally {
    if (saveBtn) { saveBtn.textContent = 'Save Changes'; saveBtn.disabled = false; }
  }
}

/* ---------- position dialog (admin list) ---------- */

/* The #number badge on a card opens this: type a position, press Reorder and
   the photo jumps there. Numbers are 1-based, matching what the admin sees. */
function openOrderEditor(item) {
  const modal = $('#order-modal');
  if (!modal) return;

  const pos = allItems.findIndex((x) => x.id === item.id) + 1;
  const shown = pos > 0 ? pos : (Number(item.order) || 1);

  $('#order-id').value = item.id;
  $('#order-current').textContent = String(shown);
  $('#order-input').value = String(shown);
  $('#order-input').max = String(allItems.length || 1);
  // Note: #order-label is its own element. Writing text into a parent that
  // *contains* the position element would delete it from the DOM.
  $('#order-label').textContent = '"' + item.label + '"';
  $('#order-cat').textContent = item.cat;
  $('#order-status').textContent = '';
  modal.style.display = 'flex';

  const input = $('#order-input');
  if (input) { input.focus(); input.select(); }
}

function closeOrderEditor() {
  const modal = $('#order-modal');
  if (modal) modal.style.display = 'none';
}

async function handleOrderSave(e) {
  e.preventDefault();
  const id = $('#order-id').value;
  const raw = $('#order-input').value.trim();
  const requested = parseInt(raw, 10);
  const statusEl = $('#order-status');

  if (!id || !raw || isNaN(requested) || requested < 1) {
    statusEl.textContent = 'Please enter a whole number starting at 1.';
    statusEl.style.color = 'var(--danger)';
    return;
  }

  const saveBtn = $('#order-save');
  if (saveBtn) { saveBtn.textContent = 'Saving…'; saveBtn.disabled = true; }

  try {
    const result = await moveItemToPosition(id, requested);
    if (result.error) {
      statusEl.textContent = 'Could not save: ' + orderSaveHint(result.error);
      statusEl.style.color = 'var(--danger)';
      return;
    }

    statusEl.textContent = 'Now at position ' + result.position + '.';
    statusEl.style.color = 'var(--success)';
    setTimeout(() => {
      closeOrderEditor();
      renderList($("#admin-search") ? $("#admin-search").value : '');
    }, 700);
  } catch (err) {
    statusEl.textContent = 'An error occurred. Please try again.';
    statusEl.style.color = 'var(--danger)';
  } finally {
    if (saveBtn) { saveBtn.textContent = 'Reorder'; saveBtn.disabled = false; }
  }
}

/* ---------- helpers ---------- */

/* Where a freshly uploaded photo lands: right after every photo that is
   already on the website, so nothing jumps ahead of the existing order.
   The admin can drag it anywhere afterwards. */
function nextPosition() {
  const max = allItems.reduce((acc, i) => Math.max(acc, Number(i.order) || 0), 0);
  return max + 1;
}

/* ---------- upload (Supabase only) ---------- */
async function handleUpload(files) {
  const label = $("#a-label").value.trim();
  const cat   = $("#a-cat").value;
  const note  = $("#a-note").value.trim();
  const status = $("#upload-status");

  if (!files.length) {
    if (status) {
      status.textContent = "Choose a photo first — step 4 below.";
      status.style.color = "var(--danger)";
    }
    return;
  }

  // A missing title used to be saved as "Transformation photo", which is
  // useless once several photos are named the same — ask instead of guessing.
  if (!label) {
    if (status) {
      status.textContent = "Type a photo title in step 1 first — then press \"Upload the selected photo\".";
      status.style.color = "var(--danger)";
    }
    const titleField = $("#a-label");
    if (titleField) titleField.focus();
    return;
  }

  if (!window.getSupabaseClient || !window.getSupabaseClient()) {
    status.textContent = "Supabase is not configured.";
    status.style.color = "var(--danger)";
    return;
  }

  status.textContent = "Uploading " + files.length + " photo(s) to Supabase…";
  status.style.color = "var(--muted)";

  // Make sure the list is loaded before working out where the new photos go.
  if (!allItems.length) allItems = await GalleryData.load();
  let nextPos = nextPosition();

  let added = 0;
  for (const file of files) {
    status.textContent = `Uploading ${added + 1} of ${files.length}…`;
    const result = await GalleryData.uploadToSupabase(file, { cat, label, note, order: nextPos++ });
      if (result.error) {
      status.textContent = `Upload failed: ${result.error}`;
      status.style.color = "var(--danger)";
      return;
    }
    added++;
  }

  const orderReady = (typeof GalleryData.hasOrderColumn === 'function')
    ? await GalleryData.hasOrderColumn()
    : true;
  status.textContent = added + " photo(s) uploaded successfully!"
    + (orderReady ? " Drag the new card into place to decide where it appears." : " It is at the top of the list — drag it into place to decide where it appears.");
  status.style.color = "var(--success)";

  renderList($("#admin-search") ? $("#admin-search").value : '');
  updateDashboardStats();
  $("#a-label").value = ""; $("#a-note").value = ""; $("#a-files").value = "";
}

/* ---------- reorder shortcuts ---------- */

/* Put the whole list back into a date sequence: direction 1 = newest first,
   -1 = oldest first. Handy once the manual order has been shuffled a lot. */
async function resetOrderByDate(direction) {
  if (!allItems.length) return;

  const list = [...allItems].sort((a, b) => {
    // Newest/oldest first is the order the site used before manual ordering,
    // so it also rescues a database where display_order is still all zeros.
    const ta = String(a.created_at || '');
    const tb = String(b.created_at || '');
    return direction === 1 ? tb.localeCompare(ta) : ta.localeCompare(tb);
  });

  allItems = list;
  const status = $("#upload-status");
  const { error } = await persistOrder(list);

  if (status) {
    if (error) {
      status.textContent = "Could not save the new order: " + orderSaveHint(error);
      status.style.color = "var(--danger)";
    } else {
      status.textContent = "All " + list.length + " photos are now in " +
        (direction === 1 ? 'newest' : 'oldest') + " first order.";
      status.style.color = "var(--success)";
      setTimeout(() => { status.textContent = ""; }, 3000);
    }
  }

  renderList($("#admin-search") ? $("#admin-search").value : "");
}

/* ---------- views ---------- */
async function showPanel() {
  $("#login-view").style.display = "none";
  $("#panel-view").style.display = "block";
  await renderList();
  updateDashboardStats();
  updateSupabaseStatus();
}

/* ---------- wire up ---------- */
document.addEventListener("DOMContentLoaded", () => {
  updateSupabaseStatus();

  if (isLoggedIn()) showPanel();

  // Check rate limit status
  if (window.Auth) {
    const lockout = window.Auth.isLockedOut();
    if (lockout.locked) {
      const rateLimitBox = $("#rate-limit-box");
      const lockoutTimer = $("#lockout-timer");
      if (rateLimitBox) {
        rateLimitBox.classList.add("visible");
        lockoutTimer.textContent = `Try again in ${lockout.remaining} minutes`;
        
        const timerInterval = setInterval(() => {
          const newLockout = window.Auth.isLockedOut();
          if (!newLockout.locked) {
            rateLimitBox.classList.remove("visible");
            clearInterval(timerInterval);
          } else {
            lockoutTimer.textContent = `Try again in ${newLockout.remaining} minutes`;
          }
        }, 60000);
      }
    }
  }

  // Login form
  const loginForm = $("#login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = $("#login-err");
      const email = $("#login-email").value.trim();
      const password = $("#login-pass").value;
      
      err.textContent = "";
      err.className = "err";
      
      if (!email || !password) {
        err.textContent = "Please enter both email and password.";
        return;
      }
      
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Authenticating...";
      submitBtn.disabled = true;
      
      try {
        const result = await window.Auth.login(email, password);
        
        if (result.success) {
          err.textContent = "Login successful! Loading panel...";
          err.className = "err success";
          setTimeout(() => showPanel(), 800);
        } else {
          err.textContent = result.error;
          err.className = "err";
          $("#login-pass").value = "";
          $("#login-pass").focus();
        }
      } catch (error) {
        console.error('Login error:', error);
        err.textContent = "An error occurred. Please try again.";
        err.className = "err";
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // Show / hide the password while typing (easier for non-technical users)
  const showPass = $("#show-pass");
  const passField = $("#login-pass");
  if (showPass && passField) {
    showPass.addEventListener("change", () => {
      passField.type = showPass.checked ? "text" : "password";
    });
  }

  // Logout
  const logout = $("#logout");
  if (logout) logout.addEventListener("click", () => { setLoggedIn(false); location.reload(); });

  // Forgot password
  const forgotPassword = $("#forgot-password");
  if (forgotPassword) {
    forgotPassword.addEventListener("click", async (e) => {
      e.preventDefault();
      const email = prompt("Enter your admin email address:");
      if (email) {
        if (window.Auth) {
          const result = await window.Auth.resetPassword(email);
          if (result.success) {
            alert("Password reset email sent. Check your inbox.");
          } else {
            alert("Error: " + result.error);
          }
        } else {
          alert("Authentication system not configured.");
        }
      }
    });
  }

  // Upload form
  const uploadForm = $("#upload-form");
  if (uploadForm) {
    uploadForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleUpload($("#a-files").files);
    });
    const zone = $(".upload-zone");
    const fileInput = $("#a-files");
    
    if (zone) {
      zone.addEventListener("click", (e) => {
        e.preventDefault();
        fileInput.click();
      });
      zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("drag"); });
      zone.addEventListener("dragleave", () => zone.classList.remove("drag"));
      zone.addEventListener("drop", (e) => {
        e.preventDefault(); zone.classList.remove("drag");
        if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
      });
      zone.setAttribute("tabindex", "0");
      zone.setAttribute("role", "button");
      zone.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          fileInput.click();
        }
      });
    }

    // Picking a photo with the file dialog must upload it right away —
    // dragging & dropping already did, choosing a file did not.
    if (fileInput) {
      fileInput.addEventListener("change", () => {
        if (fileInput.files && fileInput.files.length) handleUpload(fileInput.files);
      });
    }
  }

  // Search
  const searchInput = $("#admin-search");
  const searchClear = $("#search-clear");
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        renderList(searchInput.value);
        if (searchClear) searchClear.style.display = searchInput.value ? 'inline-flex' : 'none';
      }, 300);
    });
  }
  if (searchClear) {
    searchClear.addEventListener("click", () => {
      const searchInput = $("#admin-search");
      if (searchInput) searchInput.value = '';
      searchClear.style.display = 'none';
      renderList('');
    });
  }

  // Edit modal
  const editForm = $("#edit-form");
  if (editForm) editForm.addEventListener("submit", handleEditSave);
  
  const editClose = $("#edit-close");
  if (editClose) editClose.addEventListener("click", closeEditModal);
  
  const editCancel = $("#edit-cancel");
  if (editCancel) editCancel.addEventListener("click", closeEditModal);
  
  // Close modal on backdrop click
  const editModal = $("#edit-modal");
  if (editModal) {
    editModal.addEventListener("click", (e) => {
      if (e.target === editModal) closeEditModal();
    });
  }
  
  // Close modal on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeEditModal();
      closeOrderEditor();
    }
  });
  
  // Position dialog
  const orderForm = $('#order-form');
  if (orderForm) orderForm.addEventListener('submit', handleOrderSave);
  const orderClose = $('#order-close');
  if (orderClose) orderClose.addEventListener('click', closeOrderEditor);
  const orderCancel = $('#order-cancel');
  if (orderCancel) orderCancel.addEventListener('click', closeOrderEditor);
  const orderModal = $('#order-modal');
  if (orderModal) {
    orderModal.addEventListener('click', (e) => {
      if (e.target === orderModal) closeOrderEditor();
    });
  }

  // Reset the whole list back to a date order
  const newestBtn = $('#order-newest');
  if (newestBtn) newestBtn.addEventListener('click', () => resetOrderByDate(1));
  const oldestBtn = $('#order-oldest');
  if (oldestBtn) oldestBtn.addEventListener('click', () => resetOrderByDate(-1));
});
