'use server';

// audit.js: Server actions for querying audit trail — super admin only

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * SUPER ADMIN ONLY — fetches paginated audit logs with optional filtering.
 * Joins the performer's profile full_name. Ordered by created_at DESC.
 * @param {Object} options
 * @param {number} [options.limit=50] - Max rows to return
 * @param {number} [options.offset=0] - Rows to skip for pagination
 * @param {string} [options.targetRecordId] - Filter by specific target record
 * @returns {{ data: Array|null, error: string|null }}
 */
export async function getAuditLogs({ limit = 50, offset = 0, targetRecordId } = {}) {
  try {
    // Verify authentication via regular client
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { data: null, error: 'Authentication required' };

    // Verify super_admin role
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'super_admin') {
      return { data: null, error: 'Unauthorized — super admin access required' };
    }

    const adminClient = createAdminClient();
    let query = adminClient
      .from('audit_logs')
      .select('*, profiles:performed_by(full_name)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (targetRecordId) {
      query = query.eq('target_record_id', targetRecordId);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };

    const logs = data.map((log) => ({
      ...log,
      performed_by_name: log.profiles?.full_name || null,
      profiles: undefined,
    }));

    return { data: logs, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * SUPER ADMIN ONLY — fetches all audit logs related to a specific member.
 * Finds all attendance records for the member, then queries audit_logs
 * for any entries targeting those attendance record IDs.
 * @param {string} memberId - UUID of the member
 * @returns {{ data: Array|null, error: string|null }}
 */
export async function getAuditLogsByMember(memberId) {
  try {
    if (!memberId) return { data: null, error: 'Member ID is required' };

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { data: null, error: 'Authentication required' };

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'super_admin') {
      return { data: null, error: 'Unauthorized — super admin access required' };
    }

    const adminClient = createAdminClient();

    // Get all attendance record IDs for this member
    const { data: attendanceRows, error: attError } = await adminClient
      .from('attendance').select('id').eq('member_id', memberId);
    if (attError) return { data: null, error: attError.message };

    if (!attendanceRows.length) return { data: [], error: null };

    const attendanceIds = attendanceRows.map((a) => a.id);

    // Fetch audit logs for those attendance records
    const { data, error } = await adminClient
      .from('audit_logs')
      .select('*, profiles:performed_by(full_name)')
      .in('target_record_id', attendanceIds)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };

    const logs = data.map((log) => ({
      ...log,
      performed_by_name: log.profiles?.full_name || null,
      profiles: undefined,
    }));

    return { data: logs, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}
