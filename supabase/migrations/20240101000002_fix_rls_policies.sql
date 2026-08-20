-- ============================================================
-- FIX RLS POLICIES — Remove auth.users subquery that causes
-- "permission denied for table users" error
-- ============================================================

-- Drop the problematic admin policy that queries auth.users
DROP POLICY IF EXISTS "Admin full access" ON photos;

-- Drop the old restrictive policies
DROP POLICY IF EXISTS "Authenticated insert" ON photos;
DROP POLICY IF EXISTS "Authenticated update" ON photos;
DROP POLICY IF EXISTS "Authenticated delete" ON photos;

-- Create simple policies: any authenticated user can do everything
CREATE POLICY "Authenticated full access" ON photos
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Fix storage policies too
DROP POLICY IF EXISTS "Admin full access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete" ON storage.objects;

-- Storage: any authenticated user can upload/update/delete
CREATE POLICY "Authenticated storage full access" ON storage.objects
  FOR ALL
  USING (bucket_id = 'photos' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');
