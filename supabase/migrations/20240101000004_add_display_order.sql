-- ============================================================
-- RAMESH POLISETTY — display order for photos
-- Adds a numeric display_order so the admin can define the order in
-- which photos appear on the gallery pages. Offline (local-only)
-- installs are unaffected: the column simply does not exist and the
-- JS falls back to created-at order.
--
-- Apply once in the Supabase SQL editor, in filename order after
-- 20240101000003, like the other migrations.
-- ============================================================

-- Guard: skip entirely if the column is already present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'photos'
      AND column_name = 'display_order'
  ) THEN
    ALTER TABLE public.photos ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
  END IF;
END
$$;

-- Make updates cheap and keep the admin list + gallery reads fast.
CREATE INDEX IF NOT EXISTS idx_photos_display_order ON public.photos(display_order);
CREATE INDEX IF NOT EXISTS idx_photos_category_display_order ON public.photos(category, display_order);

-- Nothing else to do: the existing "Admin update" RLS policy already covers
-- every column of public.photos, so allowlisted admins can write the new one.

-- Verify (should return the new column, type integer, default 0):
--   SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'photos' AND column_name = 'display_order';
