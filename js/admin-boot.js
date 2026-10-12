/* ============================================================
   RAMESH POLISETTY — admin panel bootstrap
   Config + Supabase init and the connection badge.

   This lives in its own file (rather than an inline <script> in
   admin.html) so the Content-Security-Policy in vercel.json can
   forbid inline scripts: script-src is 'self' + the Supabase CDN
   only, with no 'unsafe-inline'.
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  const badge = document.getElementById('auth-badge');
  if (badge) {
    badge.className = 'auth-badge offline';
    badge.innerHTML = '\uD83D\uDCBE Connecting...';
  }

  try {
    if (window.loadConfig) await window.loadConfig();
  } catch (e) { console.error('Config load error:', e); }

  try {
    if (window.initSupabase) await window.initSupabase();
  } catch (e) { console.error('Supabase init error:', e); }

  if (badge) {
    const isOnline = window.isConfigValid && window.isConfigValid();
    if (isOnline) {
      badge.className = 'auth-badge cloud';
      badge.innerHTML = '\u2601\uFE0F <strong>Supabase Connected</strong>';
    } else {
      badge.className = 'auth-badge offline';
      badge.innerHTML = '\u274C <strong>Supabase Not Configured</strong>';
    }
  }
});
