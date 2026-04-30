'use server';

// attendance.js: Server actions for recording, updating, and deleting attendance check-ins

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PUNCTUALITY_STATUSES, AUDIT_ACTIONS } from '@/lib/config';
import { calcDelayMinutes, getPunctualityStatus } from '@/lib/utils';

/**
 * Fetches all attendance rows for a session. Joins member and checker profile info.
 * Ordered by check_in_time ASC.
 */
export async function getAttendanceBySession(sessionId) {
  try {
    if (!sessionId) return { data: null, error: 'Session ID is required' };
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('attendance')
      .select('*, members:member_id(name, section), profiles:checked_in_by(full_name)')
      .eq('session_id', sessionId)
      .order('check_in_time', { ascending: true });

    if (error) return { data: null, error: error.message };

    const rows = data.map((a) => ({
      ...a,
      member_name: a.members?.name || null,
      member_section: a.members?.section || null,
      checked_in_by_name: a.profiles?.full_name || null,
      members: undefined,
      profiles: undefined,
    }));
    return { data: rows, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Fetches all attendance rows for a member. Joins session info.
 * Ordered by session_date DESC.
 */
export async function getAttendanceByMember(memberId) {
  try {
    if (!memberId) return { data: null, error: 'Member ID is required' };
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('attendance')
      .select('*, sessions:session_id(name, session_date, start_time, session_type)')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };

    const rows = data.map((a) => ({
      ...a,
      session_name: a.sessions?.name || null,
      session_date: a.sessions?.session_date || null,
      session_start_time: a.sessions?.start_time || null,
      session_type: a.sessions?.session_type || null,
      sessions: undefined,
    }));
    return { data: rows, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Core check-in action. Validates session is open and member is active,
 * calculates delay and punctuality, then inserts attendance row.
 */
export async function checkInMember({ memberId, sessionId }) {
  try {
    if (!memberId) return { data: null, error: 'Member ID is required' };
    if (!sessionId) return { data: null, error: 'Session ID is required' };

    const supabase = await createClient();

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { data: null, error: 'Authentication required' };

    // Verify session exists and is open
    const { data: session, error: sessionError } = await supabase
      .from('sessions').select('id, is_closed, start_time, session_date')
      .eq('id', sessionId).single();
    if (sessionError) return { data: null, error: 'Session not found' };
    if (session.is_closed) return { data: null, error: 'Session is closed — check-ins are no longer accepted' };

    // Verify member exists and is active
    const { data: member, error: memberError } = await supabase
      .from('members').select('id, is_active').eq('id', memberId).single();
    if (memberError) return { data: null, error: 'Member not found' };
    if (!member.is_active) return { data: null, error: 'Member is inactive' };

    // Check for duplicate check-in
    const { data: existing } = await supabase
      .from('attendance').select('id')
      .eq('member_id', memberId).eq('session_id', sessionId).maybeSingle();
    if (existing) return { data: null, error: 'Member already checked in' };

    // Calculate punctuality
    const now = new Date().toISOString();
    const delayMinutes = calcDelayMinutes(now, session.session_date, session.start_time);
    const punctualityStatus = getPunctualityStatus(delayMinutes);

    const { data, error } = await supabase
      .from('attendance')
      .insert({
        member_id: memberId,
        session_id: sessionId,
        checked_in_by: user.id,
        check_in_time: now,
        delay_minutes: delayMinutes,
        punctuality_status: punctualityStatus,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath(`/sessions/${sessionId}/checkin`);
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Marks a member with a specific non-present status (Absent, Excused).
 * Similar to checkInMember but without calculating delays.
 */
export async function markMemberStatus({ memberId, sessionId, status }) {
  try {
    if (!memberId) return { data: null, error: 'Member ID is required' };
    if (!sessionId) return { data: null, error: 'Session ID is required' };
    if (!['Absent', 'Excused'].includes(status)) return { data: null, error: 'Invalid status' };

    const supabase = await createClient();

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { data: null, error: 'Authentication required' };

    // Verify session exists and is open
    const { data: session, error: sessionError } = await supabase
      .from('sessions').select('id, is_closed')
      .eq('id', sessionId).single();
    if (sessionError) return { data: null, error: 'Session not found' };
    if (session.is_closed) return { data: null, error: 'Session is closed — check-ins are no longer accepted' };

    // Verify member exists and is active
    const { data: member, error: memberError } = await supabase
      .from('members').select('id, is_active').eq('id', memberId).single();
    if (memberError) return { data: null, error: 'Member not found' };
    if (!member.is_active) return { data: null, error: 'Member is inactive' };

    // Check for duplicate check-in
    const { data: existing } = await supabase
      .from('attendance').select('id')
      .eq('member_id', memberId).eq('session_id', sessionId).maybeSingle();
    if (existing) return { data: null, error: 'Member already has an attendance record for this session' };

    const { data, error } = await supabase
      .from('attendance')
      .insert({
        member_id: memberId,
        session_id: sessionId,
        checked_in_by: user.id,
        check_in_time: new Date().toISOString(), // Use current time for the record creation
        delay_minutes: 0, // Not applicable for Absent/Excused
        punctuality_status: status,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath(`/sessions/${sessionId}/checkin`);
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * SUPER ADMIN ONLY — updates an attendance record's check-in time and/or status.
 * Recalculates delay if checkInTime changes. Audit log handled by DB trigger.
 */
export async function updateAttendanceRecord(attendanceId, { checkInTime, punctualityStatus }) {
  try {
    if (!attendanceId) return { data: null, error: 'Attendance ID is required' };

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { data: null, error: 'Authentication required' };

    const adminClient = createAdminClient();

    // Set the user context for the audit trigger
    await adminClient.rpc('set_config', {
      setting: 'app.current_user_id',
      value: user.id,
    });

    const updates = {};

    if (checkInTime) {
      updates.check_in_time = checkInTime;

      // Fetch the attendance + session to recalculate delay
      const { data: att } = await adminClient
        .from('attendance').select('session_id').eq('id', attendanceId).single();
      if (att) {
        const { data: sess } = await adminClient
          .from('sessions').select('session_date, start_time').eq('id', att.session_id).single();
        if (sess) {
          updates.delay_minutes = calcDelayMinutes(checkInTime, sess.session_date, sess.start_time);
          updates.punctuality_status = getPunctualityStatus(updates.delay_minutes);
        }
      }
    }

    if (punctualityStatus && !checkInTime) {
      updates.punctuality_status = punctualityStatus;
    }

    const { data, error } = await adminClient
      .from('attendance').update(updates).eq('id', attendanceId).select().single();
    if (error) return { data: null, error: error.message };

    revalidatePath('/reports');
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * SUPER ADMIN ONLY — deletes an attendance record. Audit log handled by DB trigger.
 */
export async function deleteAttendanceRecord(attendanceId) {
  try {
    if (!attendanceId) return { data: null, error: 'Attendance ID is required' };

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { data: null, error: 'Authentication required' };

    const adminClient = createAdminClient();

    await adminClient.rpc('set_config', {
      setting: 'app.current_user_id',
      value: user.id,
    });

    const { error } = await adminClient
      .from('attendance').delete().eq('id', attendanceId);
    if (error) return { data: null, error: error.message };

    return { data: { deleted: true }, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * SUPER ADMIN ONLY — overrides a member's punctuality status with a reason.
 * Manually inserts an OVERRIDE_STATUS audit log entry.
 */
export async function overrideAttendanceStatus(attendanceId, { punctualityStatus, reason }) {
  try {
    if (!attendanceId) return { data: null, error: 'Attendance ID is required' };

    const validStatuses = [...Object.values(PUNCTUALITY_STATUSES), 'Absent', 'Excused'];
    if (!punctualityStatus || !validStatuses.includes(punctualityStatus)) {
      return { data: null, error: `Status must be one of: ${validStatuses.join(', ')}` };
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { data: null, error: 'Authentication required' };

    const adminClient = createAdminClient();

    // Use the atomic RPC that sets user context + updates in one call
    // This avoids the PostgREST connection pooling issue where set_config
    // doesn't persist across separate REST requests
    const { data: result, error: rpcError } = await adminClient.rpc('rpc_override_attendance', {
      p_attendance_id: attendanceId,
      p_new_status: punctualityStatus,
      p_user_id: user.id,
    });

    if (rpcError) return { data: null, error: rpcError.message };

    const oldStatus = result?.old?.punctuality_status;
    const sessionId = result?.old?.session_id;

    // Manual audit log for the override with reason
    await adminClient.from('audit_logs').insert({
      action_type: AUDIT_ACTIONS.OVERRIDE_STATUS,
      performed_by: user.id,
      target_record_id: attendanceId,
      table_name: 'attendance',
      old_value: { punctuality_status: oldStatus },
      new_value: { punctuality_status: punctualityStatus, reason: reason || null },
    });

    revalidatePath('/reports');
    if (sessionId) {
      revalidatePath(`/sessions/${sessionId}`);
      revalidatePath(`/sessions/${sessionId}/checkin`);
    }
    return { data: result?.new || {}, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}
