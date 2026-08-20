-- ============================================================
-- RAMESH POLISETTY — Seed Data
-- Creates initial admin user and sample data
-- ============================================================

-- Note: In production, create the admin user via Supabase Auth UI or API
-- This seed file is for development purposes only

-- Insert sample photos (for development/testing)
INSERT INTO photos (image_url, category, label, note, file_name) VALUES
  ('', 'transformations', 'Transformation — Fat loss', '6 months journey', NULL),
  ('', 'transformations', 'Transformation — Muscle gain', '4 months of dedicated training', NULL),
  ('', 'transformations', 'Transformation — Complete makeover', '12 months transformation', NULL),
  ('', 'achievements', 'Achievement — Competition win', 'First place in local competition', NULL),
  ('', 'achievements', 'Achievement — Personal record', 'New deadlift PR', NULL),
  ('', 'powerlifting', 'Powerlifting — Deadlift session', 'Heavy deadlift training', NULL),
  ('', 'powerlifting', 'Powerlifting — Squat form', 'Perfect squat technique', NULL),
  ('', 'coach', 'Ramesh — In the gym', 'Training session', NULL),
  ('', 'coach', 'Ramesh — Coaching client', '1-on-1 coaching', NULL),
  ('', 'clients', 'Client — Progress check', 'Monthly progress photos', NULL),
  ('', 'clients', 'Client — Goal achieved', 'Transformed in 6 months', NULL)
ON CONFLICT DO NOTHING;

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = user_id
    AND (
      email = 'admin@rameshpolisetty.com'
      OR (raw_user_meta_data->>'role')::text = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT raw_user_meta_data->>'role' INTO user_role
  FROM auth.users
  WHERE id = user_id;
  
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
