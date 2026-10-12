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

async function loadSiteConfig() {
  try {
    const res = await fetch('/config/config.json');
    if (res.ok) {
      const data = await res.json();
      if (isRealWhatsAppNumber(data.WHATSAPP_NUMBER)) {
        SITE_CONFIG.whatsappNumber = String(data.WHATSAPP_NUMBER).replace(/\D/g, "");
      } else if (data.WHATSAPP_NUMBER) {
        console.warn('Ignoring placeholder WHATSAPP_NUMBER (set the real one in the deployment env):', data.WHATSAPP_NUMBER);
      }
      SITE_CONFIG.phoneNumber = data.PHONE_NUMBER || SITE_CONFIG.phoneNumber;
    }
  } catch (e) {
    // config.json not found, use defaults
  }
}

/* ---------- navbar shadow on scroll ---------- */
const header = $("#site-header");
if (header) {
  window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 10));
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
