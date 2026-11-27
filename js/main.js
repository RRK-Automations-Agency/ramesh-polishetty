/* ============================================================
   RAMESH POLISETTY — shared page behaviour
   Loaded on every public page.
   ============================================================ */

const $  = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => [...(c || document).querySelectorAll(s)];

/* ---------- load config.json (for WhatsApp number etc.) ---------- */
let SITE_CONFIG = { whatsappNumber: "919963526973", phoneNumber: "+91 9963526973" };

/* A build that never received the real number ships a placeholder such as
   919000000000. Sending visitors to a dead line is worse than ignoring the
   setting, so only accept a plausible number. */
function isRealWhatsAppNumber(value) {
  const digits = String(value == null ? "" : value).replace(/\D/g, "");
  return /^\d{10,15}$/.test(digits) && !/0{6,}/.test(digits);
}

/* Take the numbers out of a config.json payload. Kept separate so the shared
   loader (js/supabase-config.js) and the direct fetch below feed the same
   checks. */
function applySiteConfig(data) {
  if (!data) return;
  if (isRealWhatsAppNumber(data.WHATSAPP_NUMBER)) {
    SITE_CONFIG.whatsappNumber = String(data.WHATSAPP_NUMBER).replace(/\D/g, "");
  } else if (data.WHATSAPP_NUMBER) {
    console.warn('Ignoring placeholder WHATSAPP_NUMBER (set the real one in the deployment env):', data.WHATSAPP_NUMBER);
  }
  SITE_CONFIG.phoneNumber = data.PHONE_NUMBER || SITE_CONFIG.phoneNumber;
}

async function loadSiteConfig() {
  try {
    // Pages that load js/supabase-config.js already fetch this same file for
    // the Supabase URL and key (and that fetch is served no-store, so a second
    // one is a full extra round trip). Reuse it when it is available.
    if (typeof window.loadConfig === 'function') {
      await window.loadConfig();
      const shared = window.SUPABASE_CONFIG || {};
      applySiteConfig({ WHATSAPP_NUMBER: shared.whatsappNumber, PHONE_NUMBER: shared.phoneNumber });
      return;
    }

    const res = await fetch('/config/config.json');
    if (res.ok) applySiteConfig(await res.json());
  } catch (e) {
    // config.json not found, use defaults
  }
}

/* ---------- navbar shadow on scroll ---------- */
const header = $("#site-header");
if (header) {
  // Passive: this listener never calls preventDefault(), and saying so lets the
  // browser start scrolling without waiting on the main thread.
  window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 10), { passive: true });
}

/* ---------- mobile menu ---------- */
const burger = $("#burger"), navLinks = $("#nav-links");
if (burger && navLinks) {
  burger.addEventListener("click", () => {
    burger.classList.toggle("open");
    navLinks.classList.toggle("open");
  });
  navLinks.addEventListener("click", (e) => {
    if (e.target.tagName === "A") { burger.classList.remove("open"); navLinks.classList.remove("open"); }
  });
}

/* ---------- active nav link (from <body data-page="...">) ---------- */
const currentPage = document.body.dataset.page;
if (currentPage) {
  $$(".nav-links a").forEach((a) => {
    if (a.getAttribute("href") === currentPage + ".html") a.classList.add("active");
  });
}

/* ---------- reveal on scroll ---------- */
const revealIO = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); revealIO.unobserve(en.target); }
  });
}, { threshold: 0.12 });
$$(".reveal").forEach((el) => revealIO.observe(el));

/* ---------- footer year ---------- */
$$("#year").forEach((el) => (el.textContent = new Date().getFullYear()));

/* ---------- contact inquiry form -> WhatsApp ---------- */
const talkForm = $("#talk-form");
if (talkForm) {
  talkForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name  = ($("#f-name")  || {}).value || "";
    const phone = ($("#f-phone") || {}).value || "";
    const goal  = ($("#f-goal")  || {}).value || "";
    const msg   = ($("#f-msg")   || {}).value || "";
    if (!name.trim() || !phone.trim()) { alert("Please add your name and phone number."); return; }
    const text = encodeURIComponent(
      "Hi Ramesh, I'm " + name.trim() + ".\nGoal: " + goal + "\nPhone: " + phone.trim() + (msg.trim() ? "\nNote: " + msg.trim() : "")
    );
    window.open("https://wa.me/" + SITE_CONFIG.whatsappNumber + "?text=" + text, "_blank");
  });
}

/* ---------- init ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  await loadSiteConfig();
});
