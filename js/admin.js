/* ============================================================
   RAMESH POLISETTY — admin panel
   Secure login gate + photo upload manager.
   Uses Supabase Auth for authentication (no hardcoded passwords).
   ============================================================ */

/* ---------- DOM helpers (main.js not loaded on admin page) ---------- */
const $  = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => [...(c || document).querySelectorAll(s)];

/* ---------- login gate ---------- */
function isLoggedIn() { return window.Auth && window.Auth.isLoggedIn(); }
function setLoggedIn(v) {
  if (!v && window.Auth) window.Auth.logout();
}

/* ---------- image processing: resize + compress before saving ---------- */
function processImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(null);
      img.onload = () => {
        const MAX = 1280;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---------- storage info (Supabase) ---------- */
function updateMeter() {
  const label = $("#meter-label");
  if (label) label.textContent = "Photos are stored in Supabase cloud storage — no local limits.";
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

/* ---------- sanitize HTML to prevent XSS ---------- */
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- admin list ---------- */
async function renderList() {
  const items = await GalleryData.load();
  const list = $("#admin-list");
  list.innerHTML = "";
  if (!items.length) {
    list.innerHTML = '<p class="note-hint" style="grid-column:1/-1;">No photos yet. Add your first one above.</p>';
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
      '<button class="del" title="Delete">✕</button>';
    el.querySelector(".del").addEventListener("click", async () => {
      if (!confirm('Delete "' + escapeHTML(item.label) + '"?')) return;
      
      const status = $("#upload-status");
      
      // Try Supabase delete first
      if (window.getSupabaseClient && window.getSupabaseClient()) {
        const result = await GalleryData.deleteFromSupabase(item);
        if (result.error) {
          alert('Delete failed: ' + result.error);
          return;
        }
      }
      
      renderList();
      if (status) {
        status.textContent = 'Photo deleted successfully.';
        status.style.color = 'var(--success)';
      }
    });
    list.appendChild(el);
  });
}

/* ---------- upload (Supabase only) ---------- */
async function handleUpload(files) {
  const label = $("#a-label").value.trim() || "Transformation photo";
  const cat   = $("#a-cat").value;
  const note  = $("#a-note").value.trim();
  if (!files.length) { alert("Choose at least one photo."); return; }

  const status = $("#upload-status");

  // Check Supabase is available
  if (!window.getSupabaseClient || !window.getSupabaseClient()) {
    status.textContent = "Supabase is not configured. Please check config/config.json.";
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

  status.textContent = added + " photo(s) uploaded to Supabase cloud!";
  status.style.color = "var(--success)";

  renderList();
  $("#a-label").value = ""; $("#a-note").value = ""; $("#a-files").value = "";
}

/* ---------- views ---------- */
async function showPanel() {
  $("#login-view").style.display = "none";
  $("#panel-view").style.display = "block";
  await renderList();
  updateMeter();
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
          
          if (result.message) {
            err.textContent += " " + result.message;
          }
          
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

  const logout = $("#logout");
  if (logout) logout.addEventListener("click", () => { setLoggedIn(false); location.reload(); });

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

  const uploadForm = $("#upload-form");
  if (uploadForm) {
    uploadForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleUpload($("#a-files").files);
    });
    const zone = $(".upload-zone");
    const fileInput = $("#a-files");
    
    if (zone) {
      zone.addEventListener("click", () => fileInput.click());
      zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("drag"); });
      zone.addEventListener("dragleave", () => zone.classList.remove("drag"));
      zone.addEventListener("drop", (e) => {
        e.preventDefault(); zone.classList.remove("drag");
        if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
      });
    }
  }
});
