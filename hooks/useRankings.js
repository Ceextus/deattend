'use client';

// useRankings.js: Custom hooks for fetching attendance rankings from the v_rankings view

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Fetches all rankings and derives top performers (most punctual, most consistent, most late).
 * @returns {Object} { rankings, topPunctual, topConsistent, mostLate, loading, error, refetch }
 */
export function useRankings() {
  const [rankings, setRankings] = useState([]);
  const [topPunctual, setTopPunctual] = useState(null);
  const [topConsistent, setTopConsistent] = useState(null);
  const [mostLate, setMostLate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('v_rankings')
        .select('*')
        .order('attendance_rank', { ascending: true });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const rows = data || [];
      setRankings(rows);

      if (rows.length > 0) {
        // Derive top performers from the returned array
        // Find highest punctuality_pct (handle ties by taking first)
        const highestPunctual = [...rows].sort((a, b) => b.punctuality_pct - a.punctuality_pct)[0];
        setTopPunctual(highestPunctual?.punctuality_pct > 0 ? highestPunctual : null);

        // Find highest attendance_pct (handle ties by taking first)
        const highestConsistent = [...rows].sort((a, b) => b.attendance_pct - a.attendance_pct)[0];
        setTopConsistent(highestConsistent?.attendance_pct > 0 ? highestConsistent : null);

        // Find highest combined late count
        const highestLate = [...rows].sort(
          (a, b) => b.late_count + b.very_late_count - (a.late_count + a.very_late_count)
        )[0];
        setMostLate(highestLate && (highestLate.late_count > 0 || highestLate.very_late_count > 0) ? highestLate : null);
      } else {
        setTopPunctual(null);
        setTopConsistent(null);
        setMostLate(null);
      }
    } catch (err) {
      setError(err.message);
      setRankings([]);
      setTopPunctual(null);
      setTopConsistent(null);
      setMostLate(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  return { rankings, topPunctual, topConsistent, mostLate, loading, error, refetch: fetchRankings };
}

/**
 * Fetches rankings filtered by a specific voice section.
 * Only fetches when the section is provided.
 * @param {string|null} section - Voice section to filter by
 * @returns {Object} { rankings, loading, error }
 */
export function useRankingsBySection(section) {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!section) {
      setRankings([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchRankings = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('v_rankings')
          .select('*')
          .eq('section', section)
          .order('attendance_rank', { ascending: true });

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        setRankings(data || []);
      } catch (err) {
        setError(err.message);
        setRankings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [section]);

  return { rankings, loading, error };
}

export default useRankings;
