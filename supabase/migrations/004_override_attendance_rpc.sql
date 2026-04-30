-- ============================================================================
-- 004_override_attendance_rpc.sql
-- RPC function to override attendance status with user context set atomically
-- ============================================================================
--
-- The Supabase JS service-role client uses PostgREST, which pools connections.
-- Session-level GUCs set via a separate RPC call (`set_config`) don't persist
-- across subsequent REST requests. This function sets `app.current_user_id`
-- and performs the UPDATE within a single function call so the BEFORE UPDATE
-- trigger (`fn_prevent_attendance_edit_by_admin`) can read the user context.
-- ============================================================================

CREATE OR REPLACE FUNCTION rpc_override_attendance(
  p_attendance_id uuid,
  p_new_status    text,
  p_user_id       uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_record jsonb;
  v_new_record jsonb;
BEGIN
  -- Set user context so the BEFORE UPDATE trigger can verify super_admin role
  PERFORM set_config('app.current_user_id', p_user_id::text, true);

  -- Capture old record
  SELECT row_to_json(a)::jsonb INTO v_old_record
  FROM attendance a
  WHERE a.id = p_attendance_id;

  IF v_old_record IS NULL THEN
    RAISE EXCEPTION 'Attendance record not found: %', p_attendance_id;
  END IF;

  -- Perform the update (this fires the BEFORE UPDATE trigger which checks role)
  UPDATE attendance
  SET punctuality_status = p_new_status
  WHERE id = p_attendance_id;

  -- Capture updated record
  SELECT row_to_json(a)::jsonb INTO v_new_record
  FROM attendance a
  WHERE a.id = p_attendance_id;

  RETURN jsonb_build_object(
    'old', v_old_record,
    'new', v_new_record
  );
END;
$$;
