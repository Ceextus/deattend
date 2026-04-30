-- =============================================================================
-- SEED SCRIPT: Create initial Super Admin and Admin users
-- Run this in the Supabase SQL Editor AFTER running the migration.
-- =============================================================================

-- ⚠️  IMPORTANT: You must first create these users via Supabase Auth.
--    Go to: Dashboard → Authentication → Users → Add user
--    Create two users with email/password, then paste their UUIDs below.

-- STEP 1: Replace these UUIDs with the actual UUIDs from Supabase Auth
-- You can find them in Dashboard → Authentication → Users → click the user → copy ID

-- Super Admin profile
INSERT INTO public.profiles (id, full_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',  -- ← REPLACE with real auth.users UUID
  'Super Admin',                             -- ← REPLACE with real name
  'super_admin'
)
ON CONFLICT (id) DO UPDATE SET role = 'super_admin', full_name = EXCLUDED.full_name;

-- Admin (Attendance Officer) profile
INSERT INTO public.profiles (id, full_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000002',  -- ← REPLACE with real auth.users UUID
  'Sarah Jenkins',                           -- ← REPLACE with real name
  'admin'
)
ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = EXCLUDED.full_name;

-- STEP 2: Seed some test members (optional)
INSERT INTO public.members (name, section) VALUES
  ('Adaeze Okafor', 'Soprano'),
  ('Blessing Nwosu', 'Soprano'),
  ('Chioma Eze', 'Soprano'),
  ('Faith Adeyemi', 'Alto'),
  ('Grace Obi', 'Alto'),
  ('Hannah Bello', 'Alto'),
  ('Isaac Ogundipe', 'Tenor'),
  ('Michael Chang', 'Tenor'),
  ('John Ajayi', 'Tenor'),
  ('David Okonkwo', 'Bass'),
  ('Peter Nnamdi', 'Bass'),
  ('Samuel Adekunle', 'Bass')
ON CONFLICT DO NOTHING;

-- Verify
SELECT id, full_name, role FROM public.profiles;
SELECT id, name, section, is_active FROM public.members ORDER BY section, name;
