Self-hosted webfonts
====================

These are the latin-subset WOFF2 files that the site previously loaded from
fonts.gstatic.com through the Google Fonts CSS API. They are served from this
folder so the pages do not need third-party DNS/TLS on the critical path.

Files
-----
oswald-latin.woff2   21472 B   Oswald, variable (wght 400-700), latin subset
poppins-400.woff2     7884 B   Poppins Regular
poppins-500.woff2     7748 B   Poppins Medium
poppins-600.woff2     8000 B   Poppins SemiBold
poppins-700.woff2     7816 B   Poppins Bold

Declared in css/fonts.css with the same unicode-range and font-display: swap
values Google used, so rendering is unchanged.

Provenance
----------
Fetched 2026-10-15 from:
  https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap
(the @font-face src URLs inside that stylesheet, requested with a desktop
Chrome user-agent so the WOFF2 files were returned).

Note: Google served the *same* file for all four Oswald weights (it is a
variable font), so there is one Oswald file rather than four.

Neither family includes a real 800 weight. The stylesheet asks for 800 on a few
headings; the browser clamps to the heaviest available face (700), which is
exactly what happened with the Google-hosted version too.

How to refresh
--------------
Re-request the CSS URL above with a modern user-agent, download the latin
`url(...)` for each family/weight into this folder, and update the file names
and byte sizes here if they change. Bump the `?vN` query string on
`css/fonts.css` in the HTML pages so visitors do not keep the old files.
