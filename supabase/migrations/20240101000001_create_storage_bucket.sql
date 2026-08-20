-- ============================================================
-- RAMESH POLISETTY — Storage Bucket Migration
-- Creates the photos storage bucket with proper policies
-- ============================================================

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true,  -- Public bucket so images can be viewed
  52428800,  -- 50MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Storage policy: Public read access (anyone can view photos)
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');

-- Storage policy: Authenticated upload (only logged-in users can upload)
CREATE POLICY "Authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'photos'
    AND auth.role() = 'authenticated'
  );

-- Storage policy: Authenticated update (only logged-in users can update)
CREATE POLICY "Authenticated update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'photos'
    AND auth.role() = 'authenticated'
  );

-- Storage policy: Authenticated delete (only logged-in users can delete)
CREATE POLICY "Authenticated delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'photos'
    AND auth.role() = 'authenticated'
  );

-- Storage policy: Admin full access (admins can do everything)
CREATE POLICY "Admin full access" ON storage.objects
  USING (
    bucket_id = 'photos'
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.email = 'admin@rameshpolisetty.com'
        OR (auth.users.raw_user_meta_data->>'role')::text = 'admin'
      )
    )
  );
