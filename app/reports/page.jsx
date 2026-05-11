'use client';

// page.jsx: Reports & Rankings page with period filter, proper rankings, and PDF export

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SECTIONS } from '@/lib/config';
import { Download, Filter, Printer, Calendar } from 'lucide-react';

const sectionBadgeColors = {
  Soprano: 'bg-[#EFF6FF] text-[#2563EB]',
  Alto: 'bg-[#F0FDFA] text-[#0D9488]',
  Tenor: 'bg-[#FAF5FF] text-[#9333EA]',
  Bass: 'bg-[#F1F5F9] text-[#475569]',
};

/** Get first day of month N months ago */
function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  return d.toISOString().split('T')[0];
}

const PERIOD_OPTIONS = [
  { key: 'month', label: 'This Month', start: () => monthsAgo(0) },
  { key: '3months', label: 'Last 3 Months', start: () => monthsAgo(2) },
  { key: '6months', label: 'Last 6 Months', start: () => monthsAgo(5) },
  { key: 'year', label: 'This Year', start: () => `${new Date().getFullYear()}-01-01` },
  { key: 'all', label: 'All Time', start: () => '2000-01-01' },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('');
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = PERIOD_OPTIONS.find(p => p.key === period)?.start() || '2000-01-01';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      // Fetch closed rehearsal sessions in the period
      const { data: sess, error: sErr } = await supabase
        .from('sessions')
        .select('id, session_date')
        .eq('session_type', 'Rehearsal')
        .eq('is_closed', true)
        .gte('session_date', startDate)
        .lte('session_date', endDate)
        .order('session_date', { ascending: true });
      if (sErr) throw new Error(sErr.message);
      setSessions(sess || []);

      // Fetch active members
      const { data: mems, error: mErr } = await supabase
        .from('members')
        .select('id, name, section')
        .eq('is_active', true);
      if (mErr) throw new Error(mErr.message);
      setMembers(mems || []);

      // Fetch attendance for those sessions
      if (sess && sess.length > 0) {
        const sessionIds = sess.map(s => s.id);
        const { data: att, error: aErr } = await supabase
          .from('attendance')
          .select('member_id, session_id, punctuality_status, delay_minutes')
          .in('session_id', sessionIds);
        if (aErr) throw new Error(aErr.message);
        setAttendance(att || []);
      } else {
        setAttendance([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Compute rankings
  const rankings = useMemo(() => {
    const totalSessions = sessions.length;
    if (totalSessions === 0 || members.length === 0) return [];

    // Build per-member stats
    const memberStats = members.map(m => {
      const mAtt = attendance.filter(a => a.member_id === m.id);
      const attended = mAtt.length;
      const punctual = mAtt.filter(a => a.punctuality_status === 'Punctual').length;
      const late = mAtt.filter(a => a.punctuality_status === 'Late').length;
      const veryLate = mAtt.filter(a => a.punctuality_status === 'Very Late').length;
      const absent = totalSessions - attended;
      const avgDelay = attended > 0 ? Math.round(mAtt.reduce((sum, a) => sum + (a.delay_minutes || 0), 0) / attended) : 0;
      const attendancePct = Math.round((attended / totalSessions) * 100);
      const punctualityPct = attended > 0 ? Math.round((punctual / attended) * 100) : 0;

      return {
        memberId: m.id,
        memberName: m.name,
        section: m.section,
        totalSessions, attended, absent,
        punctual, late, veryLate,
        avgDelay, attendancePct, punctualityPct,
      };
    });

    // Sort by attendance % DESC, then punctuality % DESC, then avg delay ASC, then name ASC
    memberStats.sort((a, b) => {
      if (b.attendancePct !== a.attendancePct) return b.attendancePct - a.attendancePct;
      if (b.punctualityPct !== a.punctualityPct) return b.punctualityPct - a.punctualityPct;
      if (a.avgDelay !== b.avgDelay) return a.avgDelay - b.avgDelay;
      return a.memberName.localeCompare(b.memberName);
    });

    // Assign sequential rank (no ties)
    return memberStats.map((m, i) => ({ ...m, rank: i + 1 }));
  }, [sessions, attendance, members]);

  // Apply section filter
  const filtered = sectionFilter ? rankings.filter(r => r.section === sectionFilter) : rankings;

  // Derived top performers
  const topPunctual = rankings.length > 0 ? [...rankings].sort((a, b) => b.punctualityPct - a.punctualityPct || a.avgDelay - b.avgDelay)[0] : null;
  const mostAbsent = rankings.length > 0 ? [...rankings].sort((a, b) => b.absent - a.absent || a.memberName.localeCompare(b.memberName))[0] : null;
  const mostLate = rankings.length > 0 ? [...rankings].sort((a, b) => (b.late + b.veryLate) - (a.late + a.veryLate))[0] : null;

  const periodLabel = PERIOD_OPTIONS.find(p => p.key === period)?.label || 'All Time';

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    const headers = 'Rank,Name,Section,Attended,Absent,Attendance %,Punctual,Late,Very Late,Punctuality %,Avg Delay (min)';
    const rows = filtered.map(r =>
      [r.rank, `"${r.memberName}"`, r.section, r.attended, r.absent, r.attendancePct, r.punctual, r.late, r.veryLate, r.punctualityPct, r.avgDelay].join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${period}_${sectionFilter || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold text-[#1E293B] tracking-tight mb-1">Reports & Rankings</h1>
          <p className="text-[#64748B] text-sm">Member attendance performance for the selected period.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Period selector */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm bg-white">
              <Calendar size={16} />
              {periodLabel}
            </button>
            <select
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              {PERIOD_OPTIONS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>

          {/* Section filter */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm bg-white">
              <Filter size={16} />
              {sectionFilter || 'All Sections'}
            </button>
            <select
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
            >
              <option value="">All Sections</option>
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <button onClick={handleExportCSV} disabled={loading || filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm bg-white disabled:opacity-50">
            <Download size={16} /> CSV
          </button>
          <button onClick={handlePrint} disabled={loading || filtered.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-[#1E3A8A] transition-all shadow-sm disabled:opacity-50">
            <Printer size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <div className="text-center border-b-2 border-gray-900 pb-4 mb-3">
          <h1 className="text-2xl font-extrabold text-gray-900">St Francis Xavier Choir — Attendance Report</h1>
          <p className="text-sm text-gray-600 mt-1 font-semibold">{periodLabel} · {sectionFilter || 'All Sections'}</p>
          <p className="text-xs text-gray-400 mt-1">Generated {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Top Performers */}
      {!loading && rankings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 no-print">
          {topPunctual && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden z-0">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#EFF6FF] rounded-full -z-10" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Most Punctual ⏱️</p>
              <p className="text-xl font-bold text-gray-900 line-clamp-1">{topPunctual.memberName}</p>
              <div className="flex items-center justify-between mt-3">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${sectionBadgeColors[topPunctual.section]}`}>{topPunctual.section}</span>
                <span className="text-lg font-extrabold text-[#2563EB]">{topPunctual.punctualityPct}%</span>
              </div>
            </div>
          )}
          {mostAbsent && mostAbsent.absent > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden z-0">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#FEF2F2] rounded-full -z-10" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Most Absent 📉</p>
              <p className="text-xl font-bold text-gray-900 line-clamp-1">{mostAbsent.memberName}</p>
              <div className="flex items-center justify-between mt-3">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${sectionBadgeColors[mostAbsent.section]}`}>{mostAbsent.section}</span>
                <span className="text-lg font-extrabold text-red-500">{mostAbsent.absent}×</span>
              </div>
            </div>
          )}
          {mostLate && (mostLate.late + mostLate.veryLate) > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden z-0">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#FFF7ED] rounded-full -z-10" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Most Late ⚠️</p>
              <p className="text-xl font-bold text-gray-900 line-clamp-1">{mostLate.memberName}</p>
              <div className="flex items-center justify-between mt-3">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${sectionBadgeColors[mostLate.section]}`}>{mostLate.section}</span>
                <span className="text-lg font-extrabold text-[#EA580C]">{mostLate.late + mostLate.veryLate}×</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rankings Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500 bg-white rounded-2xl border border-red-100">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">No ranking data available for this period.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:shadow-none print:rounded-none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 print:bg-gray-100">
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-14">#</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Member</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Section</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Present</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Absent</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Att. %</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Punctual</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Late</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">V.Late</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Avg Delay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 print:divide-gray-200">
                {filtered.map((r, idx) => {
                  const initials = r.memberName?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?';
                  let rankStyle = 'text-gray-400 font-bold';
                  if (r.rank === 1) rankStyle = 'w-7 h-7 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold text-xs';
                  else if (r.rank === 2) rankStyle = 'w-7 h-7 rounded-full bg-[#F1F5F9] text-[#475569] flex items-center justify-center font-bold text-xs';
                  else if (r.rank === 3) rankStyle = 'w-7 h-7 rounded-full bg-[#FFEDD5] text-[#C2410C] flex items-center justify-center font-bold text-xs';

                  return (
                    <tr key={r.memberId} className={`hover:bg-gray-50/80 transition-colors ${idx % 2 !== 0 ? 'bg-gray-50/30' : ''}`}>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          {r.rank <= 3 ? <span className={rankStyle}>{r.rank}</span> : <span className={rankStyle}>{r.rank}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#1E293B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 no-print">{initials}</div>
                          <span className="font-semibold text-gray-900 whitespace-nowrap">{r.memberName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${sectionBadgeColors[r.section] || 'bg-gray-100 text-gray-600'}`}>{r.section}</span>
                      </td>
                      <td className="px-3 py-3 text-center font-medium text-green-600">{r.attended}</td>
                      <td className="px-3 py-3 text-center font-medium text-red-500">{r.absent}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-bold text-sm px-2 py-0.5 rounded-lg ${r.attendancePct >= 80 ? 'text-green-700 bg-green-50' : r.attendancePct >= 60 ? 'text-amber-700 bg-amber-50' : 'text-red-600 bg-red-50'}`}>{r.attendancePct}%</span>
                      </td>
                      <td className="px-3 py-3 text-center font-medium text-emerald-600">{r.punctual}</td>
                      <td className="px-3 py-3 text-center font-medium text-amber-500">{r.late}</td>
                      <td className="px-3 py-3 text-center font-medium text-red-500">{r.veryLate}</td>
                      <td className="px-3 py-3 text-center text-xs text-gray-500">{r.avgDelay}m</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-400 font-medium no-print">
            Showing <span className="text-gray-600 font-semibold">{filtered.length}</span> of <span className="text-gray-600 font-semibold">{rankings.length}</span> members · <span className="text-gray-600 font-semibold">{sessions.length}</span> sessions in period
          </div>
        </div>
      )}

      {/* Print footer */}
      <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-[10px] text-gray-400">
        <p>St. Francis Xavier Choir Attendance System · {periodLabel} · {sessions.length} sessions · {filtered.length} members</p>
      </div>
    </>
  );
}
