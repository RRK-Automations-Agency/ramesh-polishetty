# 🚀 Quick Start Guide — Ramesh Polisetty Website

## Prerequisites

- [Node.js](https://nodejs.org/) (for Supabase CLI)
- A [Supabase](https://supabase.com) account (free tier works)

---

## Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

## Step 2: Login to Supabase

```bash
supabase login
```

A browser window will open. Login and authorize the CLI.

## Step 3: Create a Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **New Project**
3. Name: `ramesh-polisetty`
4. Database Password: (choose a strong password)
5. Region: Choose closest to your users
6. Click **Create new project**

## Step 4: Get Your Project ID

1. Go to **Settings** → **General**
2. Copy your **Project ID** (looks like `ndsgszwtmwwiecnqpvhh`)

## Step 5: Link Your Project

```bash
supabase link --project-ref YOUR_PROJECT_ID
```

## Step 6: Deploy Database

```bash
supabase db push
```

This creates the `photos` table with proper security rules.

## Step 7: Create Storage Bucket

**⚠️ Important: This must be done in the Dashboard (CLI doesn't support it)**

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Go to **Storage** in the sidebar
4. Click **New bucket**
5. Name: `photos`
6. Public: **Yes** ✅
7. File size limit: 50 MB
8. Allowed MIME types: `image/*`
9. Click **Create bucket**

## Step 8: Create Admin User

**⚠️ Important: This must be done in the Dashboard (CLI doesn't support auth signup)**

1. Go to **Authentication** → **Users**
2. Click **Add user**
3. Email: `admin@rameshpolisetty.com` (or your preferred email)
4. Password: (choose a strong password)
5. **Email Confirm**: Auto-confirm ✅
6. Click **Create User**

## Step 9: Get Your API Keys

1. Go to **Settings** → **API**
2. Copy your **Project URL** (e.g., `https://ndsgszwtmwwiecnqpvhh.supabase.co`)
3. Copy your **anon public** key (long JWT string)

## Step 10: Configure Your Website

Copy the example config and fill in your credentials:

```bash
cp config/config.example.json config/config.json
```

Edit `config/config.json`:

```json
{
  "SUPABASE_URL": "https://YOUR_PROJECT_ID.supabase.co",
  "SUPABASE_ANON_KEY": "YOUR_ANON_KEY_HERE",
  "BUCKET_NAME": "photos",
  "TABLE_NAME": "photos",
  "WHATSAPP_NUMBER": "91XXXXXXXXXX"
}
```

**Note:** Replace `WHATSAPP_NUMBER` with your WhatsApp number (country code + number, no spaces or +)

## Step 11: Test It!

1. Open `admin.html` in your browser
2. Login with your admin email and password
3. Upload a photo
4. Check it appears in the gallery!

---

## 🎯 Quick Commands Reference

| Command | Description |
|---------|-------------|
| `supabase login` | Login to Supabase CLI |
| `supabase link --project-ref ID` | Link to your project |
| `supabase db push` | Deploy database migrations |
| `supabase status` | Check connection status |
| `supabase db diff` | See pending changes |

---

## 🔧 Windows Setup (PowerShell)

Run the automated setup script:

```powershell
.\setup-supabase.ps1
```

This will guide you through all the steps interactively.

---

## 📁 File Structure

```
ramesh/
├── admin.html          # Admin panel (login required)
├── config/
│   ├── config.json         # Your Supabase credentials (DO NOT COMMIT)
│   └── config.example.json # Example config template

├── index.html          # Main page
├── gallery.html        # Photo gallery
├── transformation.html # Transformation photos
├── achievements.html   # Achievement photos
├── powerlifting.html   # Powerlifting photos
├── css/
│   └── styles.css      # Styles
├── js/
│   ├── supabase-config.js  # Loads config.json
│   ├── auth.js         # Authentication module
│   ├── gallery.js      # Gallery logic
│   └── admin.js        # Admin panel logic
├── supabase/
│   ├── config.toml     # Supabase project config
│   ├── migrations/     # Database migrations
│   └── seed.sql        # Sample data
├── .gitignore          # Protects sensitive files
├── robots.txt          # Prevents search engine indexing
└── .htaccess           # Security headers
```

---

## 🆘 Troubleshooting

### "config.json not found"
- Make sure you created `config.json` with your credentials
- Check the file is in the root directory

### "Invalid credentials" on login
- Make sure you created the user in Supabase Dashboard
- Check you're using the correct email/password
- Verify email confirmations are disabled or user is confirmed

### Photos not uploading
- Check the storage bucket `photos` exists and is public
- Verify your anon key has storage permissions
- Check browser console for errors

### "Supabase library not loaded"
- Check your internet connection
- The Supabase JS library loads from CDN

---

## 🔒 Security Notes

- `config.json` is in `.gitignore` — never commit it
- Row Level Security is enabled on the database
- Admin authentication is handled by Supabase Auth
- Photos are stored in Supabase Storage with public read access
- The admin panel is not linked from public pages

---

## 📚 Additional Documentation

- [SUPABASE_CLI_GUIDE.md](SUPABASE_CLI_GUIDE.md) — Detailed CLI guide
- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) — Full setup instructions
