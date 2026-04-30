'use server';

// eligibility.js: Server actions for computing and exporting member eligibility

import { createClient } from '@/lib/supabase/server';
import { groupBySection } from '@/lib/utils';
import { SECTIONS } from '@/lib/config';

/**
 * Calls the Postgres fn_calc_eligibility function and returns results grouped by section.
 * @param {Object} params
 * @param {string} params.startDate - Start date YYYY-MM-DD
 * @param {string} params.endDate - End date YYYY-MM-DD
 * @returns {{ data: Object|null, error: string|null }}
 */
export async function getEligibilityList({ startDate, endDate }) {
  try {
    if (!startDate || !endDate) return { data: null, error: 'Start date and end date are required' };

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('fn_calc_eligibility', {
      p_start: startDate,
      p_end: endDate,
    });

    if (error) return { data: null, error: error.message };

    // Map DB column names to JS-friendly names and group by section
    const members = data.map((row) => ({
      memberId: row.member_id,
      memberName: row.member_name,
      section: row.section,
      sessionsAttended: row.sessions_attended,
      totalSessions: row.total_sessions,
      attendancePct: row.attendance_pct,
      isEligible: row.is_eligible,
    }));

    const grouped = groupBySection(members);
    return { data: grouped, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Computes eligibility summary statistics including totals and per-section breakdown.
 * @param {Object} params
 * @param {string} params.startDate - Start date YYYY-MM-DD
 * @param {string} params.endDate - End date YYYY-MM-DD
 * @returns {{ data: { summary, bySection }|null, error: string|null }}
 */
export async function getEligibilityStats({ startDate, endDate }) {
  try {
    if (!startDate || !endDate) return { data: null, error: 'Start date and end date are required' };

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('fn_calc_eligibility', {
      p_start: startDate,
      p_end: endDate,
    });

    if (error) return { data: null, error: error.message };

    const totalMembers = data.length;
    const eligibleCount = data.filter((r) => r.is_eligible).length;
    const notEligibleCount = totalMembers - eligibleCount;
    const eligiblePct = totalMembers > 0 ? Math.round((eligibleCount / totalMembers) * 100) : 0;

    // Per-section breakdown
    const bySection = {};
    SECTIONS.forEach((section) => {
      const sectionMembers = data.filter((r) => r.section === section);
      const sectionEligible = sectionMembers.filter((r) => r.is_eligible).length;
      bySection[section] = {
        total: sectionMembers.length,
        eligible: sectionEligible,
        notEligible: sectionMembers.length - sectionEligible,
      };
    });

    return {
      data: {
        summary: { totalMembers, eligibleCount, notEligibleCount, eligiblePct },
        bySection,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Generates a CSV string from the eligibility data for client-side download.
 * @param {Object} params
 * @param {string} params.startDate - Start date YYYY-MM-DD
 * @param {string} params.endDate - End date YYYY-MM-DD
 * @returns {{ data: { csv, filename }|null, error: string|null }}
 */
export async function exportEligibilityCSV({ startDate, endDate }) {
  try {
    if (!startDate || !endDate) return { data: null, error: 'Start date and end date are required' };

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('fn_calc_eligibility', {
      p_start: startDate,
      p_end: endDate,
    });

    if (error) return { data: null, error: error.message };

    // Build CSV
    const headers = 'Name,Section,Sessions Attended,Total Sessions,Attendance %,Status';
    const rows = data.map((r) =>
      [
        `"${r.member_name}"`,
        r.section,
        r.sessions_attended,
        r.total_sessions,
        r.attendance_pct,
        r.is_eligible ? 'Eligible' : 'Not Eligible',
      ].join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const filename = `eligibility_${startDate}_to_${endDate}.csv`;

    return { data: { csv, filename }, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}
