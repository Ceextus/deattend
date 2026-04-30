-- ============================================================================
-- 001_init_schema.sql
-- Choir Attendance, Punctuality & Eligibility System — Initial Schema
-- ============================================================================
--
-- OBJECTS CREATED:
--
--   EXTENSIONS (2):
--     uuid-ossp, pgcrypto
--
--   TABLES (5):
--     profiles, members, sessions, attendance, audit_logs
--
--   INDEXES (9):
--     idx_attendance_member_id, idx_attendance_session_id,
--     idx_attendance_check_in_time, idx_sessions_session_date,
--     idx_sessions_session_type, idx_audit_logs_performed_by,
--     idx_audit_logs_target_record_id, idx_members_section,
--     idx_members_is_active
--
--   VIEWS (2):
--     v_member_stats, v_rankings
--
--   FUNCTIONS (4):
--     fn_calc_eligibility(date, date),
--     fn_calculate_punctuality_status(timestamptz, time, date),
--     fn_audit_attendance_changes()        — trigger function
--     fn_prevent_attendance_edit_by_admin() — trigger function
--
--   TRIGGERS (2):
--     trg_audit_attendance_changes   ON attendance
--     trg_prevent_attendance_edit_by_admin ON attendance
--
--   RLS POLICIES (16):
--     profiles  — 3 policies
--     members   — 4 policies
--     sessions  — 4 policies
--     attendance — 4 policies
--     audit_logs — 1 policy (all writes blocked)
--
--   HELPER FUNCTION (1):
--     auth_user_role()
--
-- ============================================================================


-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. profiles — links to Supabase auth.users, stores role info
CREATE TABLE profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text        NOT NULL,
  role       text        NOT NULL CHECK (role IN ('admin', 'super_admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. members — choir members who are tracked but never log in
CREATE TABLE members (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  section    text        NOT NULL CHECK (section IN ('Soprano', 'Alto', 'Tenor', 'Bass')),
  photo_url  text,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. sessions — each rehearsal or service event
CREATE TABLE sessions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  session_date date        NOT NULL,
  start_time   time        NOT NULL,
  session_type text        NOT NULL CHECK (session_type IN ('Rehearsal', 'Service')),
  is_closed    boolean     NOT NULL DEFAULT false,
  created_by   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 4. attendance — one row per member per session
CREATE TABLE attendance (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id           uuid        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  session_id          uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  checked_in_by       uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  check_in_time       timestamptz NOT NULL DEFAULT now(),
  delay_minutes       integer     NOT NULL DEFAULT 0,
  punctuality_status  text        NOT NULL CHECK (punctuality_status IN ('Punctual', 'Late', 'Very Late')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, session_id)
);

-- 5. audit_logs — immutable, written only by triggers
CREATE TABLE audit_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type      text        NOT NULL,
  performed_by     uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  target_record_id uuid        NOT NULL,
  table_name       text        NOT NULL,
  old_value        jsonb,
  new_value        jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);


-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_attendance_member_id      ON attendance (member_id);
CREATE INDEX idx_attendance_session_id     ON attendance (session_id);
CREATE INDEX idx_attendance_check_in_time  ON attendance (check_in_time);
CREATE INDEX idx_sessions_session_date     ON sessions (session_date);
CREATE INDEX idx_sessions_session_type     ON sessions (session_type);
CREATE INDEX idx_audit_logs_performed_by   ON audit_logs (performed_by);
CREATE INDEX idx_audit_logs_target_record_id ON audit_logs (target_record_id);
CREATE INDEX idx_members_section           ON members (section);
CREATE INDEX idx_members_is_active         ON members (is_active);


-- ============================================================================
-- VIEWS
-- ============================================================================

-- v_member_stats: per-member attendance and punctuality statistics
-- Counts only closed Rehearsal sessions
CREATE OR REPLACE VIEW v_member_stats AS
WITH closed_rehearsals AS (
  SELECT id
  FROM sessions
  WHERE session_type = 'Rehearsal'
    AND is_closed = true
),
total AS (
  SELECT COUNT(*) AS total_sessions FROM closed_rehearsals
),
member_attendance AS (
  SELECT
    m.id            AS member_id,
    m.name          AS member_name,
    m.section,
    COUNT(a.id)     AS sessions_attended,
    COUNT(a.id) FILTER (WHERE a.punctuality_status = 'Punctual')   AS punctual_count,
    COUNT(a.id) FILTER (WHERE a.punctuality_status = 'Late')       AS late_count,
    COUNT(a.id) FILTER (WHERE a.punctuality_status = 'Very Late')  AS very_late_count,
    COALESCE(ROUND(AVG(a.delay_minutes)::numeric, 1), 0)           AS avg_delay_minutes
  FROM members m
  LEFT JOIN attendance a
    ON a.member_id = m.id
    AND a.session_id IN (SELECT id FROM closed_rehearsals)
  WHERE m.is_active = true
  GROUP BY m.id, m.name, m.section
)
SELECT
  ma.member_id,
  ma.member_name,
  ma.section,
  t.total_sessions::int,
  ma.sessions_attended::int,
  CASE
    WHEN t.total_sessions = 0 THEN 100.0
    ELSE ROUND((ma.sessions_attended::numeric / t.total_sessions) * 100, 1)
  END AS attendance_pct,
  ma.punctual_count::int,
  ma.late_count::int,
  ma.very_late_count::int,
  CASE
    WHEN ma.sessions_attended = 0 THEN 0.0
    ELSE ROUND((ma.punctual_count::numeric / ma.sessions_attended) * 100, 1)
  END AS punctuality_pct,
  ma.avg_delay_minutes
FROM member_attendance ma
CROSS JOIN total t;


-- v_rankings: adds rank columns on top of v_member_stats
CREATE OR REPLACE VIEW v_rankings AS
SELECT
  vs.*,
  RANK() OVER (ORDER BY vs.attendance_pct DESC)                              AS attendance_rank,
  RANK() OVER (ORDER BY vs.punctuality_pct DESC, vs.avg_delay_minutes ASC)   AS punctuality_rank
FROM v_member_stats vs;


-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- fn_calc_eligibility: compute eligibility for a date range
CREATE OR REPLACE FUNCTION fn_calc_eligibility(p_start date, p_end date)
RETURNS TABLE (
  member_id       uuid,
  member_name     text,
  section         text,
  sessions_attended int,
  total_sessions  int,
  attendance_pct  numeric,
  is_eligible     boolean
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH range_sessions AS (
    SELECT s.id
    FROM sessions s
    WHERE s.session_type = 'Rehearsal'
      AND s.is_closed = true
      AND s.session_date BETWEEN p_start AND p_end
  ),
  total AS (
    SELECT COUNT(*)::int AS cnt FROM range_sessions
  ),
  member_counts AS (
    SELECT
      m.id                         AS m_id,
      m.name                       AS m_name,
      m.section                    AS m_section,
      COUNT(a.id)::int             AS attended
    FROM members m
    LEFT JOIN attendance a
      ON a.member_id = m.id
      AND a.session_id IN (SELECT rs.id FROM range_sessions rs)
    WHERE m.is_active = true
    GROUP BY m.id, m.name, m.section
  )
  SELECT
    mc.m_id,
    mc.m_name,
    mc.m_section,
    mc.attended,
    t.cnt,
    CASE
      WHEN t.cnt = 0 THEN 100.0
      ELSE ROUND((mc.attended::numeric / t.cnt) * 100, 1)
    END,
    CASE
      WHEN t.cnt = 0  THEN true                                    -- no sessions → everyone eligible
      WHEN t.cnt = 1  THEN mc.attended >= 1                        -- must attend the only session
      WHEN t.cnt = 2  THEN mc.attended >= 2                        -- must attend both
      WHEN t.cnt >= 3 THEN ROUND((mc.attended::numeric / t.cnt) * 100, 1) >= 66
      ELSE true
    END
  FROM member_counts mc
  CROSS JOIN total t;
END;
$$;


-- fn_calculate_punctuality_status: determines punctuality from timestamps
CREATE OR REPLACE FUNCTION fn_calculate_punctuality_status(
  p_check_in     timestamptz,
  p_session_start time,
  p_session_date  date
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_session_start timestamptz;
  v_delay_minutes numeric;
BEGIN
  -- Combine session date and start time into a timestamptz (assume UTC)
  v_session_start := (p_session_date || ' ' || p_session_start)::timestamptz;

  -- Calculate delay in minutes
  v_delay_minutes := EXTRACT(EPOCH FROM (p_check_in - v_session_start)) / 60.0;

  -- Determine status
  IF v_delay_minutes <= 0 THEN
    RETURN 'Punctual';          -- arrived early or exactly on time
  ELSIF v_delay_minutes <= 10 THEN
    RETURN 'Punctual';          -- within 10 minutes grace window
  ELSIF v_delay_minutes <= 30 THEN
    RETURN 'Late';              -- 11–30 minutes late
  ELSE
    RETURN 'Very Late';         -- more than 30 minutes late
  END IF;
END;
$$;


-- Trigger function: audit attendance changes
CREATE OR REPLACE FUNCTION fn_audit_attendance_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action   text;
  v_user_id  uuid;
  v_new_json jsonb;
BEGIN
  -- Determine action type
  IF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE_ATTENDANCE';
    v_new_json := row_to_json(NEW)::jsonb;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE_ATTENDANCE';
    v_new_json := NULL;
  END IF;

  -- Read current user id from app setting (set by the application layer)
  v_user_id := NULLIF(current_setting('app.current_user_id', true), '')::uuid;

  INSERT INTO audit_logs (
    action_type,
    performed_by,
    target_record_id,
    table_name,
    old_value,
    new_value
  ) VALUES (
    v_action,
    v_user_id,
    OLD.id,
    'attendance',
    row_to_json(OLD)::jsonb,
    v_new_json
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;


-- Trigger function: prevent admin from editing attendance
CREATE OR REPLACE FUNCTION fn_prevent_attendance_edit_by_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_role    text;
BEGIN
  -- Read current user id from app setting
  v_user_id := NULLIF(current_setting('app.current_user_id', true), '')::uuid;

  -- If no user context is set, block the operation
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user context set — attendance edits require app.current_user_id';
  END IF;

  -- Look up the user's role
  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'User profile not found for id %', v_user_id;
  END IF;

  IF v_role = 'admin' THEN
    RAISE EXCEPTION 'Admins cannot edit attendance records. Only super_admin may modify attendance.';
  END IF;

  -- super_admin passes through
  RETURN NEW;
END;
$$;


-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Audit trail for attendance modifications
CREATE TRIGGER trg_audit_attendance_changes
  AFTER UPDATE OR DELETE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_attendance_changes();

-- Block admin from editing attendance (only super_admin allowed)
CREATE TRIGGER trg_prevent_attendance_edit_by_admin
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION fn_prevent_attendance_edit_by_admin();


-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Helper function: returns the current authenticated user's role
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Enable RLS on all tables
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- profiles policies
-- ---------------------------------------------------------------------------

-- Any authenticated user can read all profiles
CREATE POLICY profiles_select ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own profile during signup
CREATE POLICY profiles_insert ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update only their own profile
CREATE POLICY profiles_update ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ---------------------------------------------------------------------------
-- members policies
-- ---------------------------------------------------------------------------

-- Any authenticated user can read members
CREATE POLICY members_select ON members
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admin or super_admin can insert members
CREATE POLICY members_insert ON members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_role() IN ('admin', 'super_admin'));

-- Only admin or super_admin can update members
CREATE POLICY members_update ON members
  FOR UPDATE
  TO authenticated
  USING (auth_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (auth_user_role() IN ('admin', 'super_admin'));

-- Only super_admin can delete members
CREATE POLICY members_delete ON members
  FOR DELETE
  TO authenticated
  USING (auth_user_role() = 'super_admin');


-- ---------------------------------------------------------------------------
-- sessions policies
-- ---------------------------------------------------------------------------

-- Any authenticated user can read sessions
CREATE POLICY sessions_select ON sessions
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admin or super_admin can insert sessions
CREATE POLICY sessions_insert ON sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_role() IN ('admin', 'super_admin'));

-- Only admin or super_admin can update sessions
CREATE POLICY sessions_update ON sessions
  FOR UPDATE
  TO authenticated
  USING (auth_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (auth_user_role() IN ('admin', 'super_admin'));

-- Only super_admin can delete sessions
CREATE POLICY sessions_delete ON sessions
  FOR DELETE
  TO authenticated
  USING (auth_user_role() = 'super_admin');


-- ---------------------------------------------------------------------------
-- attendance policies
-- ---------------------------------------------------------------------------

-- Any authenticated user can read attendance
CREATE POLICY attendance_select ON attendance
  FOR SELECT
  TO authenticated
  USING (true);

-- Admin or super_admin can insert attendance (must be the one checking in)
CREATE POLICY attendance_insert ON attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_user_role() IN ('admin', 'super_admin')
    AND checked_in_by = auth.uid()
  );

-- Only super_admin can update attendance
CREATE POLICY attendance_update ON attendance
  FOR UPDATE
  TO authenticated
  USING (auth_user_role() = 'super_admin')
  WITH CHECK (auth_user_role() = 'super_admin');

-- Only super_admin can delete attendance
CREATE POLICY attendance_delete ON attendance
  FOR DELETE
  TO authenticated
  USING (auth_user_role() = 'super_admin');


-- ---------------------------------------------------------------------------
-- audit_logs policies
-- ---------------------------------------------------------------------------

-- Only super_admin can read audit logs
CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT
  TO authenticated
  USING (auth_user_role() = 'super_admin');

-- No one can insert, update, or delete audit logs via the API
-- (triggers use SECURITY DEFINER to bypass RLS)
-- We achieve this by enabling RLS and providing no INSERT/UPDATE/DELETE policies.
-- Any attempt to INSERT/UPDATE/DELETE through the API will be denied.


-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
