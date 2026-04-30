'use client';

// useSession.js: Custom hooks for fetching session details and session lists

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Fetches a single session by ID including creator's full name.
 * Skips fetch if sessionId is null or undefined.
 * @param {string|null} sessionId - UUID of the session
 * @returns {{ session: Object|null, loading: boolean, error: string|null, refetch: Function }}
 */
export function useSession(sessionId) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSession = useCallback(async () => {
    if (!sessionId) {
      setSession(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('sessions')
        .select('*, profiles:created_by(full_name)')
        .eq('id', sessionId)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setSession(null);
      } else {
        setSession({
          ...data,
          created_by_name: data.profiles?.full_name || null,
          profiles: undefined,
        });
      }
    } catch (err) {
      setError(err.message);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return { session, loading, error, refetch: fetchSession };
}

/**
 * Fetches all sessions with optional filters for type and closed status.
 * Ordered by session_date DESC.
 * @param {Object} options
 * @param {string} [options.type] - Filter by session_type
 * @param {boolean} [options.isClosed] - Filter by is_closed
 * @returns {{ sessions: Array, loading: boolean, error: string|null, refetch: Function }}
 */
export function useSessions({ type, isClosed } = {}) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      let query = supabase
        .from('sessions')
        .select('*, profiles:created_by(full_name)');

      if (type) query = query.eq('session_type', type);
      if (typeof isClosed === 'boolean') query = query.eq('is_closed', isClosed);
      query = query.order('session_date', { ascending: false });

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        setSessions([]);
      } else {
        const mapped = (data || []).map((s) => ({
          ...s,
          created_by_name: s.profiles?.full_name || null,
          profiles: undefined,
        }));
        setSessions(mapped);
      }
    } catch (err) {
      setError(err.message);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [type, isClosed]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return { sessions, loading, error, refetch: fetchSessions };
}

// Default export for backward compatibility
export default useSession;
