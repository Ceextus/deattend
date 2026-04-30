'use server';

// sessions.js: Server actions for creating, updating, and closing attendance sessions

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SESSION_TYPES, AUDIT_ACTIONS } from '@/lib/config';

/**
 * Fetches all sessions with optional filtering. Joins creator's full_name.
 * Ordered by session_date DESC.
 */
export async function getSessions({ type, isClosed } = {}) {
  try {
    const supabase = await createClient();
    let query = supabase.from('sessions').select('*, profiles:created_by(full_name)');

    if (type) query = query.eq('session_type', type);
    if (typeof isClosed === 'boolean') query = query.eq('is_closed', isClosed);
    query = query.order('session_date', { ascending: false });

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };

    const sessions = data.map((s) => ({
      ...s,
      created_by_name: s.profiles?.full_name || null,
      profiles: undefined,
    }));
    return { data: sessions, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Fetches a single session by ID with creator profile info.
 */
export async function getSessionById(sessionId) {
  try {
    if (!sessionId) return { data: null, error: 'Session ID is required' };
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('sessions')
      .select('*, profiles:created_by(full_name)')
      .eq('id', sessionId)
      .single();

    if (error) return { data: null, error: error.message };
    return {
      data: { ...data, created_by_name: data.profiles?.full_name || null, profiles: undefined },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Creates a new session. Sets created_by to the authenticated user.
 */
export async function createSession({ name, sessionDate, startTime, sessionType }) {
  try {
    if (!name?.trim()) return { data: null, error: 'Session name is required' };
    if (!sessionDate) return { data: null, error: 'Session date is required' };
    if (!startTime) return { data: null, error: 'Start time is required' };
    if (!sessionType || !SESSION_TYPES.includes(sessionType)) {
      return { data: null, error: `Session type must be one of: ${SESSION_TYPES.join(', ')}` };
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { data: null, error: 'Authentication required' };

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        name: name.trim(),
        session_date: sessionDate,
        start_time: startTime,
        session_type: sessionType,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    revalidatePath('/sessions');
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Closes an open session so no more check-ins can be recorded.
 */
export async function closeSession(sessionId) {
  try {
    if (!sessionId) return { data: null, error: 'Session ID is required' };
    const supabase = await createClient();

    const { data: session, error: fetchError } = await supabase
      .from('sessions').select('id, is_closed').eq('id', sessionId).single();
    if (fetchError) return { data: null, error: fetchError.message };
    if (session.is_closed) return { data: null, error: 'Session is already closed' };

    const { data, error } = await supabase
      .from('sessions').update({ is_closed: true }).eq('id', sessionId).select().single();
    if (error) return { data: null, error: error.message };

    revalidatePath('/sessions');
    revalidatePath(`/sessions/${sessionId}`);
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * SUPER ADMIN ONLY — updates a session's start time. Affects punctuality retroactively.
 * Logs to audit_logs with ADJUST_TIMESTAMP action type.
 */
export async function updateSessionStartTime(sessionId, newStartTime) {
  try {
    if (!sessionId) return { data: null, error: 'Session ID is required' };
    if (!newStartTime) return { data: null, error: 'New start time is required' };

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { data: null, error: 'Authentication required' };

    const adminClient = createAdminClient();

    const { data: oldSession, error: fetchError } = await adminClient
      .from('sessions').select('*').eq('id', sessionId).single();
    if (fetchError) return { data: null, error: fetchError.message };

    const { data, error } = await adminClient
      .from('sessions').update({ start_time: newStartTime }).eq('id', sessionId).select().single();
    if (error) return { data: null, error: error.message };

    await adminClient.from('audit_logs').insert({
      action_type: AUDIT_ACTIONS.ADJUST_TIMESTAMP,
      performed_by: user.id,
      target_record_id: sessionId,
      table_name: 'sessions',
      old_value: { start_time: oldSession.start_time },
      new_value: { start_time: newStartTime },
    });

    revalidatePath(`/sessions/${sessionId}`);
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}
