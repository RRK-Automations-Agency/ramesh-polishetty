# Supabase Setup Guide for Ramesh Polisetty Website

## Overview
This website uses Supabase for cloud photo storage. Photos can be managed directly from the admin panel and are stored securely in the cloud.

## Setup Steps

### 1. Create a Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project

### 2. Get Your Credentials
1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy your **Project URL** and **anon/public key**

### 3. Set Up Authentication
1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Enable **Email** provider (should be enabled by default)
3. Go to **Authentication** → **Users**
4. Click **Add user**
5. Create an admin user:
   - Email: `admin@rameshpolisetty.com` (or your preferred email)
   - Password: Choose a strong password
   - Email Confirm: **Auto-confirm** (for easier setup)
6. Click **Create user**

### 4. Create Storage Bucket
1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Name it `photos`
4. Make it **Public** (so images can be viewed)
5. Click **Create bucket**

### 6. Create Database Table
1. Go to **SQL Editor** in your Supabase dashboard
2. Run this SQL:

```sql
CREATE TABLE photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  note TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public read access" ON photos
  FOR SELECT USING (true);

-- Create policy for authenticated insert (only logged-in users can insert)
CREATE POLICY "Authenticated insert" ON photos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policy for authenticated update (only logged-in users can update)
CREATE POLICY "Authenticated update" ON photos
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create policy for authenticated delete (only logged-in users can delete)
CREATE POLICY "Authenticated delete" ON photos
  FOR DELETE USING (auth.role() = 'authenticated');
```

### 7. Configure the Website
1. Open `js/supabase-config.js`
2. Replace `YOUR_SUPABASE_URL` with your Project URL
3. Replace `YOUR_SUPABASE_ANON_KEY` with your anon key

### 8. Test the Setup
1. Open `admin.html` in your browser
2. Log in with your admin email and password
3. Upload a photo
4. Check your Supabase dashboard to see if it appears in Storage and the Database
5. Verify that unauthenticated users cannot access the admin panel

## Features

### Admin Panel
- **Upload photos** directly from the admin panel
- **Choose categories**: Transformations, Achievements, Powerlifting, Coach, Clients
- **Add labels and notes** to each photo
- **Delete photos** from the admin panel

### Gallery Pages
- **Transformation page**: Shows transformation photos
- **Achievements page**: Shows achievement photos
- **Powerlifting page**: Shows powerlifting photos
- **Main gallery**: Shows all photos with category filters

### Photo Management
- Photos are stored in Supabase Storage (cloud)
- Metadata is stored in Supabase Database
- LocalStorage is used as backup for offline access
- Photos are automatically resized and compressed before upload

## Troubleshooting

### Photos not uploading
1. Check browser console for errors
2. Verify your Supabase credentials are correct
3. Ensure the `photos` bucket exists and is public
4. Check that the database table was created correctly

### Gallery not loading
1. Check if Supabase is initialized (look for errors in console)
2. Verify the database table has the correct schema
3. Check Row Level Security policies

### localStorage backup
If Supabase is not configured, the website falls back to localStorage:
- Photos are stored in the browser
- Storage limit is ~5MB
- Photos are lost when browser data is cleared

## Security Features

### Authentication
- **Supabase Auth**: Backend authentication with email/password
- **No hardcoded passwords**: Passwords are not stored in client-side code
- **Rate limiting**: Prevents brute force attacks (5 attempts, 15-minute lockout)
- **Session timeout**: Sessions expire after 24 hours
- **Secure session management**: Uses sessionStorage with automatic cleanup

### Access Control
- **Row Level Security**: Database-level access control
- **Authenticated operations**: Only logged-in users can insert/update/delete photos
- **Public read access**: Gallery photos are publicly viewable
- **Admin-only access**: Admin panel requires authentication

### Best Practices
- Use a strong, unique password for the admin account
- Enable email confirmation for new users in production
- Regularly review user access in Supabase dashboard
- Monitor authentication logs for suspicious activity
- Consider adding IP whitelisting for extra security

## Security Notes
- The anon key is safe to use in client-side code
- Row Level Security protects your data
- Authentication is handled by Supabase Auth (backend)
- You can add more restrictive policies as needed
- For production, consider adding additional security measures

## Cost
- Supabase free tier includes:
  - 1GB storage
  - 50,000 monthly active users
  - 500MB bandwidth
- This is more than enough for a fitness coach website
