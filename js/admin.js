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
    el.innerHTML =
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
  const note = $('#edit-note').value.trim();
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
    const { error } = await client
      .from(window.SUPABASE_CONFIG.tableName)
      .update({ label, category: cat, note })
      .eq('id', id);
    
    if (error) {
      status.textContent = 'Update failed: ' + error.message;
      status.style.color = 'var(--danger)';
      return;
    }
    
    status.textContent = 'Saved successfully!';
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

/* ---------- upload (Supabase only) ---------- */
async function handleUpload(files) {
  const label = $("#a-label").value.trim() || "Transformation photo";
  const cat   = $("#a-cat").value;
  const note  = $("#a-note").value.trim();
  if (!files.length) { alert("Choose at least one photo."); return; }

  const status = $("#upload-status");

  if (!window.getSupabaseClient || !window.getSupabaseClient()) {
    status.textContent = "Supabase is not configured.";
    status.style.color = "var(--danger)";
    return;
  }

  status.textContent = "Uploading " + files.length + " photo(s) to Supabase…";
  status.style.color = "var(--muted)";

  let added = 0;
  for (const file of files) {
    status.textContent = `Uploading ${added + 1} of ${files.length}…`;
    const result = await GalleryData.uploadToSupabase(file, { cat, label, note });
    if (result.error) {
      status.textContent = `Upload failed: ${result.error}`;
      status.style.color = "var(--danger)";
      return;
    }
    added++;
  }

  status.textContent = added + " photo(s) uploaded successfully!";
  status.style.color = "var(--success)";

  renderList($("#admin-search") ? $("#admin-search").value : '');
  updateDashboardStats();
  $("#a-label").value = ""; $("#a-note").value = ""; $("#a-files").value = "";
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
    if (e.key === "Escape") closeEditModal();
  });
});
