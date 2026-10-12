-- ============================================================
-- SECURE RLS POLICIES — Admin allowlist, admin-only writes
-- Public read for the gallery, admin-only mutations.
--
-- WHY THIS FILE CHANGED
-- Migration 002 granted *every* authenticated user full access to
-- photos and storage. An earlier revision of this file narrowed that
-- to "users whose JWT says role = admin", reading the role from
-- auth.jwt() -> 'user_metadata' ->> 'role'. That is NOT safe:
-- raw_user_meta_data is writable by the user themselves, so anyone
-- could run supabase.auth.updateUser({ data: { role: 'admin' } })
-- and promote themselves.
--
-- Admin membership therefore lives in a table that only the database
-- owner (SQL editor / dashboard / service role) can write to:
-- public.admins. Policies check it through public.is_admin().
-- ============================================================

-- ------------------------------------------------------------
-- 1. Admin allowlist
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admins (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  note       TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- An admin may read their own row. There are deliberately NO insert /
-- update / delete policies: this table is only editable from the
-- Supabase dashboard, the SQL editor or a service-role key.
DROP POLICY IF EXISTS "Admins read own row" ON public.admins;
CREATE POLICY "Admins read own row" ON public.admins
  FOR SELECT
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 2. is_admin() — the single source of truth for both the RLS
--    policies below and the client-side admin panel.
-- ------------------------------------------------------------
-- Parameter is named user_id so this REPLACEs the helper of the same name in
-- seed.sql (CREATE OR REPLACE refuses to rename an input parameter). $1 is used
-- instead of the name because `admins.user_id` would make it ambiguous.
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = $1);
$$;

REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated;

-- ------------------------------------------------------------
-- 3. photos — public read, admin-only writes
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated full access" ON public.photos;
DROP POLICY IF EXISTS "Authenticated insert" ON public.photos;
DROP POLICY IF EXISTS "Authenticated update" ON public.photos;
DROP POLICY IF EXISTS "Authenticated delete" ON public.photos;
DROP POLICY IF EXISTS "Admin full access" ON public.photos;
DROP POLICY IF EXISTS "Public read access" ON public.photos;
DROP POLICY IF EXISTS "Admin insert" ON public.photos;
DROP POLICY IF EXISTS "Admin update" ON public.photos;
DROP POLICY IF EXISTS "Admin delete" ON public.photos;

-- Anyone can view the gallery.
CREATE POLICY "Public read access" ON public.photos
  FOR SELECT USING (true);

-- Only allowlisted admins can mutate.
CREATE POLICY "Admin insert" ON public.photos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin update" ON public.photos
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete" ON public.photos
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------
-- 4. Storage — public read, admin-only writes
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated storage full access" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Admin full access" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin update storage" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete storage" ON storage.objects;

CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');

CREATE POLICY "Admin upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos' AND public.is_admin());

CREATE POLICY "Admin update storage" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'photos' AND public.is_admin())
  WITH CHECK (bucket_id = 'photos' AND public.is_admin());

CREATE POLICY "Admin delete storage" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'photos' AND public.is_admin());

-- ------------------------------------------------------------
-- 5. Grant yourself admin access  ← DO THIS, or /admin.html will
--    load but every upload / edit / delete will be refused.
--
--    Replace the email below with the address you log in with.
--    If that user does not exist yet, create it first via
--    Dashboard → Authentication → Users → Add user, then re-run
--    this INSERT. It inserts nothing when the email does not
--    match, so it is safe to run as-is.
-- ------------------------------------------------------------
INSERT INTO public.admins (user_id, email, note)
SELECT id, email, 'site owner'
FROM auth.users
WHERE email = 'admin@example.com'   -- TODO: your admin email here
ON CONFLICT (user_id) DO NOTHING;

-- Verify (should list your admin row):
--   SELECT email, created_at FROM public.admins ORDER BY created_at;
--
-- Also do this once, so nobody can create their own account:
--   Dashboard → Authentication → Sign In / Providers → Email
--   → turn OFF "Allow new users to sign up".
