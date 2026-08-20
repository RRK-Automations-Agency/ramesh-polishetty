# Ramesh Polisetty — Fitness Coach Website

A complete fitness coaching website with photo gallery, admin panel, and Supabase integration.

## 🚀 Quick Start

1. **Open `index.html`** in your browser to view the site
2. **Setup Supabase** (optional) — see [docs/QUICK_START.md](docs/QUICK_START.md)
3. **Access admin panel** — navigate to `admin.html`

## 📁 Project Structure

```
ramesh/
├── index.html              # Home page
├── admin.html              # Admin panel (login required)
├── 404.html                # Error page
│
├── pages/
│   ├── about.html          # About the coach
│   ├── programs.html       # Programs & pricing
│   ├── transformation.html # Transformation photos
│   ├── achievements.html   # Achievement photos
│   ├── powerlifting.html   # Powerlifting photos
│   ├── gallery.html        # Full photo gallery
│   ├── nutrition.html      # Nutrition plans
│   ├── clients.html        # Client testimonials
│   └── contact.html        # Contact form
│
├── css/
│   └── styles.css          # Global stylesheet
│
├── js/
│   ├── main.js             # Shared page behavior
│   ├── auth.js             # Authentication module
│   ├── admin.js            # Admin panel logic
│   ├── gallery.js          # Gallery & lightbox
│   └── supabase-config.js  # Supabase initialization
│
├── config/
│   ├── config.json         # ⚠️ API keys (DO NOT COMMIT)
│   └── config.example.json # Example config template
│
├── photos/                 # Local photos (gitignored)
│
├── supabase/               # Database migrations
│   ├── config.toml
│   ├── migrations/
│   └── seed.sql
│
├── docs/                   # Documentation
│   ├── QUICK_START.md      # Setup guide
│   ├── SUPABASE_CLI_GUIDE.md
│   └── SUPABASE_SETUP.md
│
├── scripts/                # Setup scripts
│   ├── setup-supabase.ps1  # Windows PowerShell
│   └── setup-supabase.sh   # macOS/Linux
│
└── .gitignore              # Protects sensitive files
```

## 🔧 Configuration

### config/config.json

```json
{
  "SUPABASE_URL": "https://your-project.supabase.co",
  "SUPABASE_ANON_KEY": "your-anon-key",
  "BUCKET_NAME": "photos",
  "TABLE_NAME": "photos",
  "WHATSAPP_NUMBER": "91XXXXXXXXXX"
}
```

**⚠️ Never commit `config.json` to git — it contains API keys!**

## 🛡️ Security

- Admin panel requires Supabase Auth login
- API keys stored in `config/config.json` (gitignored)
- Rate limiting on login attempts
- Row Level Security on database
- No hardcoded secrets in source code

## 📱 Responsive Design

- **Desktop** (>900px): Full navigation, 3-column gallery
- **Tablet** (640-900px): 2-column gallery, stacked forms
- **Mobile** (<640px): Single column, hamburger menu

## 🚀 Deployment

### GitHub Pages

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### Netlify / Vercel

1. Connect your GitHub repo
2. Build command: (none — static site)
3. Publish directory: `/` (root)

### Custom Server

1. Upload all files except `config/config.json`
2. Create `config/config.json` on server with your credentials
3. Ensure `supabase/` folder is accessible

## 📚 Documentation

- [Quick Start Guide](docs/QUICK_START.md)
- [Supabase CLI Guide](docs/SUPABASE_CLI_GUIDE.md)
- [Supabase Setup](docs/SUPABASE_SETUP.md)

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Supabase (Auth, Database, Storage)
- **Fonts**: Oswald + Poppins (Google Fonts)
- **Icons**: Emoji (no icon library needed)

## 📄 License

© 2024 Ramesh Polisetty. All rights reserved.
