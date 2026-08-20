# Deploy to Vercel — Complete Guide

## Prerequisites
- [Vercel account](https://vercel.com/signup) (free tier works)
- [Supabase project](https://supabase.com) with your credentials
- Git repository (GitHub/GitLab/Bitbucket)

---

## Step 1: Push to GitHub

```bash
cd ramesh
git init
git add .
git commit -m "Production-ready site"
git remote add origin https://github.com/YOUR_USERNAME/ramesh-polisetty.git
git push -u origin main
```

**Important:** `config/config.json` is in `.gitignore` and will NOT be pushed. This is correct — we'll use Vercel environment variables instead.

---

## Step 2: Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your GitHub repo
4. Framework Preset: **"Other"** (static site)
5. Click **"Deploy"** (it will work even without env vars initially)

---

## Step 3: Add Environment Variables

Go to your project → **Settings** → **Environment Variables**

Add these variables (copy values from your `config/config.json`):

| Name | Value | Environment |
|------|-------|-------------|
| `SUPABASE_URL` | `https://ndsgszwtmwwiecnqpvhh.supabase.co` | Production, Preview |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` (your full anon key) | Production, Preview |
| `BUCKET_NAME` | `photos` | Production, Preview |
| `TABLE_NAME` | `photos` | Production, Preview |
| `WHATSAPP_NUMBER` | `919000000000` (your real number) | Production, Preview |

**How to find your Supabase keys:**
1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project → **Settings** (gear icon) → **API**
3. Copy **Project URL** and **anon public** key

---

## Step 4: Redeploy

After adding env vars:
1. Go to **Deployments** tab
2. Click the **⋮** menu on latest deployment
3. Click **"Redeploy"**
4. This triggers the build script which generates `config/config.json` from your env vars

---

## Step 5: Create Storage Bucket

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project → **Storage** in sidebar
3. Click **"New bucket"**
4. Name: `photos`
5. Public: **Yes** ✅
6. Click **"Create bucket"**

---

## Step 6: Create Admin User

1. Go to **Authentication** → **Users**
2. Click **"Add user"**
3. Email: `admin@rameshpolisetty.com` (or your email)
4. Password: (choose a strong password)
5. Email Confirm: **Auto-confirm** ✅
6. Click **"Create User"**

---

## Step 7: Verify Deployment

1. Open your Vercel URL (e.g., `https://ramesh-polisetty.vercel.app`)
2. Check all pages load correctly
3. Test admin panel: go to `/admin.html`
4. Login with your admin credentials
5. Upload a photo and verify it appears in gallery

---

## Step 8: Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Enter your domain (e.g., `rameshpolisetty.com`)
3. Follow DNS configuration instructions
4. Wait for SSL certificate (automatic)

---

## Security Checklist

After deployment, verify these work:

| Check | Status |
|-------|--------|
| Admin panel requires login | ✅ |
| No API keys in source code | ✅ |
| `.gitignore` protects config files | ✅ |
| Security headers present | ✅ |
| robots.txt blocks admin page | ✅ |
| Rate limiting works (5 attempts) | ✅ |
| XSS protection in admin panel | ✅ |
| Image compression before upload | ✅ |

---

## Troubleshooting

### "Config not found" error
- Make sure env vars are set in Vercel dashboard
- Redeploy after adding env vars

### Photos not uploading
- Check Supabase storage bucket exists and is public
- Verify anon key has storage permissions

### Admin panel won't load
- Check console for errors
- Verify Supabase URL and key are correct

### Slow loading
- Check network tab for failed requests
- Verify Supabase project is active

---

## Files Deployed

```
├── index.html          ← Homepage
├── about.html          ← About page
├── programs.html       ← Programs & pricing
├── transformation.html ← Transformation gallery
├── achievements.html   ← Achievement gallery
├── powerlifting.html   ← Powerlifting gallery
├── gallery.html        ← Full photo gallery
├── nutrition.html      ← Nutrition plans
├── clients.html        ← Client testimonials
├── contact.html        ← Contact form
├── admin.html          ← Admin panel (protected)
├── 404.html            ← Error page
├── vercel.json         ← Vercel config
├── package.json        ← Build script
├── css/styles.css      ← Styles
├── js/main.js          ← Shared behavior
├── js/auth.js          ← Authentication
├── js/admin.js         ← Admin panel
├── js/gallery.js       ← Gallery & lightbox
├── js/supabase-config.js ← Supabase init
├── scripts/build-config.js ← Env var builder
└── supabase/           ← Database migrations
```

**NOT deployed (gitignored):**
- `config/config.json` — Generated from env vars
- `photos/` — Large files, use Supabase Storage
- `node_modules/` — Dependencies
- `.env` — Secrets

---

## Cost

**Free tier includes:**
- 100GB bandwidth/month
- Unlimited static sites
- Automatic SSL
- Custom domains

**Supabase free tier includes:**
- 500MB database
- 1GB storage
- 50,000 monthly active users

This is more than enough for a fitness coach website.

---

## Need Help?

Common issues:
1. **Env vars not working** → Redeploy after adding them
2. **Build fails** → Check `package.json` exists
3. **404 on admin** → Check `vercel.json` rewrites
4. **CORS errors** → Add domain to Supabase allowed origins
