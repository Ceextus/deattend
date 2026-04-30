'use client';

// useAttendance.js: Custom hooks for attendance data with Supabase Realtime subscription

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { calcAttendancePct } from '@/lib/utils';
import { PUNCTUALITY_STATUSES } from '@/lib/config';

/**
 * Fetches attendance records for a session and subscribes to Realtime INSERT events.
 * New check-ins appear instantly without refetching. Cleans up subscription on unmount.
 * @param {string|null} sessionId - UUID of the session
 * @returns {{ attendanceList: Array, loading: boolean, error: string|null, checkedInCount: number }}
 */
export function useAttendance(sessionId) {
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const supabaseRef = useRef(null);

  useEffect(() => {
    if (!sessionId) {
      setAttendanceList([]);
      setLoading(false);
      setError(null);
      return;
    }

    let channel = null;
    const supabase = createClient();
    supabaseRef.current = supabase;

    // Initial fetch
    const fetchAttendance = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('attendance')
          .select('*, members:member_id(name, section, photo_url), profiles:checked_in_by(full_name)')
          .eq('session_id', sessionId)
          .order('check_in_time', { ascending: true });

        if (fetchError) {
          setError(fetchError.message);
          setAttendanceList([]);
        } else {
          const mapped = (data || []).map(mapAttendanceRow);
          setAttendanceList(mapped);
        }
      } catch (err) {
        setError(err.message);
        setAttendanceList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();

    // Subscribe to Realtime events (INSERT, DELETE, UPDATE) on attendance for this session
    channel = supabase
      .channel(`attendance:session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          // Fetch the full record with joins for the newly inserted row
          const { data } = await supabase
            .from('attendance')
            .select('*, members:member_id(name, section, photo_url), profiles:checked_in_by(full_name)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            // Guard against duplicates (e.g. optimistic update already added this)
            setAttendanceList((prev) => {
              if (prev.some((a) => a.id === data.id)) return prev;
              return [...prev, mapAttendanceRow(data)];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'attendance',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setAttendanceList((prev) => prev.filter((a) => a.id !== payload.old.id));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attendance',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('attendance')
            .select('*, members:member_id(name, section, photo_url), profiles:checked_in_by(full_name)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setAttendanceList((prev) =>
              prev.map((a) => (a.id === payload.new.id ? mapAttendanceRow(data) : a))
            );
          }
        }
      )
      .subscribe();

    // Cleanup: unsubscribe on unmount or sessionId change
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [sessionId]);

  /**
   * Optimistically add a new attendance record to the local list.
   * Fetches full joined data from Supabase to get member name/section/photo.
   * Falls back to a minimal record if the fetch fails.
   */
  const addRecord = useCallback(async (record) => {
    if (!record?.id) return;

    // Skip if already in the list
    setAttendanceList((prev) => {
      if (prev.some((a) => a.id === record.id)) return prev;
      // Immediately add a minimal version for instant UI feedback
      return [...prev, mapAttendanceRow(record)];
    });

    // Then fetch the full joined record to get member name, section, photo, etc.
    const supabase = supabaseRef.current;
    if (!supabase) return;

    try {
      const { data } = await supabase
        .from('attendance')
        .select('*, members:member_id(name, section, photo_url), profiles:checked_in_by(full_name)')
        .eq('id', record.id)
        .single();

      if (data) {
        setAttendanceList((prev) =>
          prev.map((a) => (a.id === record.id ? mapAttendanceRow(data) : a))
        );
      }
    } catch {
      // Minimal record already added, ignore fetch error
    }
  }, []);

  return {
    attendanceList,
    loading,
    error,
    checkedInCount: attendanceList.length,
    addRecord,
  };
}

/**
 * Fetches all attendance records for a member with session info and calculates stats.
 * @param {string|null} memberId - UUID of the member
 * @returns {{ attendanceHistory: Array, loading: boolean, error: string|null, stats: Object }}
 */
export function useMemberAttendance(memberId) {
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalSessions: 0,
    attended: 0,
    attendancePct: 0,
    punctualCount: 0,
    lateCount: 0,
    veryLateCount: 0,
  });

  useEffect(() => {
    if (!memberId) {
      setAttendanceHistory([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        // Fetch attendance with session info
        const { data, error: fetchError } = await supabase
          .from('attendance')
          .select('*, sessions:session_id(name, session_date, start_time, session_type)')
          .eq('member_id', memberId)
          .order('created_at', { ascending: false });

        if (fetchError) {
          setError(fetchError.message);
          setAttendanceHistory([]);
          return;
        }

        const rows = (data || []).map((a) => ({
          ...a,
          session_name: a.sessions?.name || null,
          session_date: a.sessions?.session_date || null,
          session_start_time: a.sessions?.start_time || null,
          session_type: a.sessions?.session_type || null,
          sessions: undefined,
        }));

        setAttendanceHistory(rows);

        // Fetch total closed Rehearsal sessions for attendance percentage
        const { count } = await supabase
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .eq('session_type', 'Rehearsal')
          .eq('is_closed', true);

        const totalSessions = count || 0;
        const attended = rows.length;
        const punctualCount = rows.filter((r) => r.punctuality_status === PUNCTUALITY_STATUSES.PUNCTUAL).length;
        const lateCount = rows.filter((r) => r.punctuality_status === PUNCTUALITY_STATUSES.LATE).length;
        const veryLateCount = rows.filter((r) => r.punctuality_status === PUNCTUALITY_STATUSES.VERY_LATE).length;

        setStats({
          totalSessions,
          attended,
          attendancePct: calcAttendancePct(attended, totalSessions),
          punctualCount,
          lateCount,
          veryLateCount,
        });
      } catch (err) {
        setError(err.message);
        setAttendanceHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [memberId]);

  return { attendanceHistory, loading, error, stats };
}

/**
 * Maps a raw attendance row with joined data into a flat, friendly shape.
 */
function mapAttendanceRow(row) {
  return {
    ...row,
    member_name: row.members?.name || null,
    member_section: row.members?.section || null,
    member_photo_url: row.members?.photo_url || null,
    checked_in_by_name: row.profiles?.full_name || null,
    members: undefined,
    profiles: undefined,
  };
}

// Default export
export default useAttendance;
