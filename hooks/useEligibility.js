'use client';

// useEligibility.js: Custom hook for fetching and calculating eligibility data

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { groupBySection } from '@/lib/utils';
import { SECTIONS } from '@/lib/config';

/**
 * Fetches eligibility data using the fn_calc_eligibility Postgres function.
 * Only fetches when BOTH startDate and endDate are provided.
 * @param {Object} params
 * @param {string} [params.startDate] - Start date YYYY-MM-DD
 * @param {string} [params.endDate] - End date YYYY-MM-DD
 * @returns {Object} { eligibilityList, grouped, stats, loading, error, refetch }
 */
export function useEligibility({ startDate, endDate }) {
  const [eligibilityList, setEligibilityList] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEligibility = useCallback(async () => {
    // If dates aren't provided yet, clear state and don't fetch
    if (!startDate || !endDate) {
      setEligibilityList([]);
      setGrouped({});
      setStats(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase.rpc('fn_calc_eligibility', {
        p_start: startDate,
        p_end: endDate,
      });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      // Map DB column names to JS-friendly names
      const members = (data || []).map((row) => ({
        memberId: row.member_id,
        memberName: row.member_name,
        section: row.section,
        sessionsAttended: row.sessions_attended,
        totalSessions: row.total_sessions,
        attendancePct: row.attendance_pct,
        isEligible: row.is_eligible,
      }));

      setEligibilityList(members);

      // Group by section
      setGrouped(groupBySection(members));

      // Calculate summary stats
      const totalMembers = members.length;
      const eligibleCount = members.filter((m) => m.isEligible).length;
      const notEligibleCount = totalMembers - eligibleCount;
      const eligiblePct = totalMembers > 0 ? Math.round((eligibleCount / totalMembers) * 100) : 0;

      setStats({
        totalMembers,
        eligibleCount,
        notEligibleCount,
        eligiblePct,
      });
    } catch (err) {
      setError(err.message);
      setEligibilityList([]);
      setGrouped({});
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchEligibility();
  }, [fetchEligibility]);

  return { eligibilityList, grouped, stats, loading, error, refetch: fetchEligibility };
}

// Default export
export default useEligibility;
