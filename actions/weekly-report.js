'use server';

// weekly-report.js: Server action for fetching weekly attendance data with eligibility

import { createClient } from '@/lib/supabase/server';
import { SECTIONS } from '@/lib/config';

/**
 * Fetches the weekly attendance report for a given Monday–Sunday range.
 * Returns:
 *   - sessions: array of rehearsal sessions that week
 *   - members: all active members with per-session attendance and eligibility
 *   - stats: summary counts
 *
 * @param {Object} params
 * @param {string} params.startDate - Monday of the week (YYYY-MM-DD)
 * @param {string} params.endDate   - Sunday of the week (YYYY-MM-DD)
 * @returns {{ data: Object|null, error: string|null }}
 */
export async function getWeeklyReport({ startDate, endDate }) {
  try {
    if (!startDate || !endDate) {
      return { data: null, error: 'Start date and end date are required' };
    }

    const supabase = await createClient();

    // 1. Fetch all Rehearsal sessions in the date range
    const { data: sessions, error: sessErr } = await supabase
      .from('sessions')
      .select('id, name, session_date, start_time, is_closed')
      .eq('session_type', 'Rehearsal')
      .gte('session_date', startDate)
      .lte('session_date', endDate)
      .order('session_date', { ascending: true });

    if (sessErr) return { data: null, error: sessErr.message };

    // 2. Fetch all active members
    const { data: members, error: memErr } = await supabase
      .from('members')
      .select('id, name, section')
      .eq('is_active', true)
      .order('section', { ascending: true })
      .order('name', { ascending: true });

    if (memErr) return { data: null, error: memErr.message };

    // If no sessions, return members with empty attendance
    if (sessions.length === 0) {
      const memberRows = members.map((m) => ({
        memberId: m.id,
        memberName: m.name,
        section: m.section,
        attendance: {},           // sessionId -> boolean
        sessionsAttended: 0,
        totalSessions: 0,
        isEligible: true,         // no sessions = everyone eligible
      }));

      return {
        data: {
          sessions: [],
          members: memberRows,
          grouped: groupMembersBySection(memberRows),
          stats: {
            totalSessions: 0,
            totalMembers: members.length,
            eligibleCount: members.length,
            notEligibleCount: 0,
          },
        },
        error: null,
      };
    }

    // 3. Fetch all attendance records for these sessions
    const sessionIds = sessions.map((s) => s.id);
    const { data: attendanceRows, error: attErr } = await supabase
      .from('attendance')
      .select('member_id, session_id, punctuality_status')
      .in('session_id', sessionIds);

    if (attErr) return { data: null, error: attErr.message };

    // Build a lookup: memberId -> Set of sessionIds they attended
    const attendanceLookup = {};
    for (const row of attendanceRows) {
      if (!attendanceLookup[row.member_id]) {
        attendanceLookup[row.member_id] = new Set();
      }
      attendanceLookup[row.member_id].add(row.session_id);
    }

    // 4. Build member rows with attendance matrix and eligibility
    const totalSessions = sessions.length;
    // Eligibility threshold: must attend at least ceil(2/3 * totalSessions)
    const requiredSessions = Math.ceil((2 / 3) * totalSessions);

    const memberRows = members.map((m) => {
      const memberSessions = attendanceLookup[m.id] || new Set();
      const attendance = {};
      for (const s of sessions) {
        attendance[s.id] = memberSessions.has(s.id);
      }
      const sessionsAttended = memberSessions.size;
      const isEligible = sessionsAttended >= requiredSessions;

      return {
        memberId: m.id,
        memberName: m.name,
        section: m.section,
        attendance,
        sessionsAttended,
        totalSessions,
        isEligible,
      };
    });

    const eligibleCount = memberRows.filter((m) => m.isEligible).length;

    // 5. Group by section
    const grouped = groupMembersBySection(memberRows);

    return {
      data: {
        sessions: sessions.map((s) => ({
          id: s.id,
          name: s.name,
          sessionDate: s.session_date,
          startTime: s.start_time,
          isClosed: s.is_closed,
        })),
        members: memberRows,
        grouped,
        stats: {
          totalSessions,
          totalMembers: members.length,
          eligibleCount,
          notEligibleCount: members.length - eligibleCount,
          requiredSessions,
        },
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Groups member rows by their section, preserving SECTIONS order.
 */
function groupMembersBySection(memberRows) {
  const grouped = {};
  SECTIONS.forEach((section) => {
    grouped[section] = [];
  });
  memberRows.forEach((m) => {
    if (grouped[m.section]) {
      grouped[m.section].push(m);
    }
  });
  return grouped;
}
