'use client';

// page.jsx: Weekly Attendance Report with attendance matrix, eligibility, and PDF export

import { useState, useEffect, useCallback } from 'react';
import { getWeeklyReport } from '@/actions/weekly-report';
import { SECTIONS } from '@/lib/config';
import { ChevronLeft, ChevronRight, FileText, Check, X, Printer, Filter, Calendar } from 'lucide-react';

const sectionBadgeColors = {
  Soprano: 'bg-[#EFF6FF] text-[#2563EB]',
  Alto: 'bg-[#F0FDFA] text-[#0D9488]',
  Tenor: 'bg-[#FAF5FF] text-[#9333EA]',
  Bass: 'bg-[#F1F5F9] text-[#475569]',
};

/** Returns the Monday of the week containing `date`. */
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust if Sunday
  d.setDate(diff);
  return d;
}

/** Formats a Date to YYYY-MM-DD */
function toISO(date) {
  return date.toISOString().split('T')[0];
}

/** Gets the Sunday of the same week as Monday */
function getSunday(monday) {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  return d;
}

/** Formats a date like "May 5" */
function shortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Formats a date like "Tue 6th" */
function dayLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const day = d.getDate();
  const suffix = getDaySuffix(day);
  return `${weekday} ${day}${suffix}`;
}

function getDaySuffix(day) {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/** Full date range like "May 5 – May 11, 2026" */
function weekRangeLabel(monday, sunday) {
  const m = new Date(monday + 'T00:00:00');
  const s = new Date(sunday + 'T00:00:00');
  const mLabel = m.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const sLabel = s.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `${mLabel} – ${sLabel}`;
}

export default function WeeklyReportPage() {
  const [monday, setMonday] = useState(() => {
    const m = getMonday(new Date());
    return toISO(m);
  });
  const sunday = toISO(getSunday(new Date(monday + 'T00:00:00')));

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Eligibility filter: 'all' | 'eligible' | 'not_eligible'
  const [eligibilityFilter, setEligibilityFilter] = useState('all');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await getWeeklyReport({ startDate: monday, endDate: sunday });
    if (err) {
      setError(err);
      setReport(null);
    } else {
      setReport(data);
    }
    setLoading(false);
  }, [monday, sunday]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const goToPrevWeek = () => {
    const m = new Date(monday + 'T00:00:00');
    m.setDate(m.getDate() - 7);
    setMonday(toISO(m));
  };

  const goToNextWeek = () => {
    const m = new Date(monday + 'T00:00:00');
    m.setDate(m.getDate() + 7);
    setMonday(toISO(m));
  };

  const goToCurrentWeek = () => {
    setMonday(toISO(getMonday(new Date())));
  };

  const handlePrint = () => {
    window.print();
  };

  const sessions = report?.sessions || [];
  const stats = report?.stats || {};
  const grouped = report?.grouped || {};

  // Apply eligibility filter to grouped data
  const filteredGrouped = {};
  const filterLabel = eligibilityFilter === 'eligible' ? 'Eligible Only' : eligibilityFilter === 'not_eligible' ? 'Not Eligible Only' : 'All Members';
  let filteredTotal = 0;
  SECTIONS.forEach((section) => {
    const members = grouped[section] || [];
    const filtered = eligibilityFilter === 'all'
      ? members
      : eligibilityFilter === 'eligible'
        ? members.filter(m => m.isEligible)
        : members.filter(m => !m.isEligible);
    filteredGrouped[section] = filtered;
    filteredTotal += filtered.length;
  });

  return (
    <>
      {/* Header — hidden in print, the print header replaces it */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold text-[#1E293B] tracking-tight mb-1">Weekly Report</h1>
          <p className="text-[#64748B] text-sm">Rehearsal attendance overview and eligibility check.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Eligibility Filter */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {[
              { key: 'all', label: 'All' },
              { key: 'eligible', label: 'Eligible' },
              { key: 'not_eligible', label: 'Not Eligible' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setEligibilityFilter(opt.key)}
                className={`px-4 py-2.5 text-xs font-semibold transition-colors ${
                  eligibilityFilter === opt.key
                    ? opt.key === 'eligible'
                      ? 'bg-green-50 text-green-700'
                      : opt.key === 'not_eligible'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-[#EFF6FF] text-[#2563EB]'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={handlePrint}
            disabled={loading || !report || sessions.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-[#1E3A8A] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer size={16} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Week Navigator — hidden in print */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 mb-8 no-print">
        <button
          onClick={goToPrevWeek}
          className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          title="Previous week"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-4">
          {/* Date picker — pick any date, snaps to its Monday */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Calendar size={16} className="text-gray-400 shrink-0" />
            <input
              type="date"
              value={monday}
              onChange={(e) => {
                if (e.target.value) {
                  const picked = new Date(e.target.value + 'T00:00:00');
                  setMonday(toISO(getMonday(picked)));
                }
              }}
              className="bg-transparent text-sm text-gray-700 outline-none font-semibold w-[130px] cursor-pointer"
            />
          </div>

          {/* Week label */}
          <div className="text-center hidden sm:block">
            <p className="text-base font-bold text-gray-900">{weekRangeLabel(monday, sunday)}</p>
          </div>

          {/* Today button */}
          <button
            onClick={goToCurrentWeek}
            className="px-3 py-1.5 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] rounded-lg hover:bg-[#DBEAFE] transition-colors"
          >
            Today
          </button>
        </div>

        <button
          onClick={goToNextWeek}
          className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          title="Next week"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* ──── PRINT HEADER (only visible when printing) ──── */}
      <div className="hidden print:block print-header mb-6">
        <div className="text-center border-b-2 border-gray-900 pb-4 mb-4">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">ChoirFlow — Weekly Attendance Report</h1>
          <p className="text-sm text-gray-600 mt-1 font-semibold">{weekRangeLabel(monday, sunday)}</p>
          <p className="text-xs text-gray-400 mt-1">
            Generated on {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {!loading && report && (
          <div className="flex justify-center gap-8 text-xs font-semibold text-gray-700 mb-4">
            <span>Rehearsals: <strong>{stats.totalSessions}</strong></span>
            <span>Members: <strong>{stats.totalMembers}</strong></span>
            <span>Eligible: <strong className="text-green-700">{stats.eligibleCount}</strong></span>
            <span>Not Eligible: <strong className="text-red-600">{stats.notEligibleCount}</strong></span>
            <span>Required: <strong>{stats.requiredSessions}/{stats.totalSessions}</strong></span>
            {eligibilityFilter !== 'all' && (
              <span>Filter: <strong className="text-[#2563EB]">{filterLabel}</strong> ({filteredTotal})</span>
            )}
          </div>
        )}
      </div>

      {/* Loading / Error / Empty States */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500 bg-white rounded-2xl border border-red-100">{error}</div>
      ) : sessions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-100 shadow-sm no-print">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">No Rehearsals This Week</h2>
          <p className="text-sm text-gray-500">There are no rehearsal sessions recorded for {weekRangeLabel(monday, sunday)}.</p>
        </div>
      ) : (
        <>
          {/* Stats Cards — hidden in print */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 no-print">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden z-0">
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-[#F1F5F9] rounded-full -z-10" />
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Rehearsals</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden z-0">
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-[#EFF6FF] rounded-full -z-10" />
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMembers}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden z-0">
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-[#F0FDF4] rounded-full -z-10" />
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Eligible</p>
              <p className="text-2xl font-bold text-green-600">{stats.eligibleCount}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden z-0">
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-[#FEF2F2] rounded-full -z-10" />
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Not Eligible</p>
              <p className="text-2xl font-bold text-red-500">{stats.notEligibleCount}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden z-0">
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-[#FAF5FF] rounded-full -z-10" />
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Required</p>
              <p className="text-2xl font-bold text-[#9333EA]">{stats.requiredSessions}<span className="text-base text-gray-400 font-medium">/{stats.totalSessions}</span></p>
            </div>
          </div>

          {/* Attendance Matrix — grouped by section */}
          <div className="space-y-8" id="weekly-report-content">
            {SECTIONS.map((section) => {
              const sectionMembers = filteredGrouped[section] || [];
              if (sectionMembers.length === 0) return null;

              const sectionEligible = sectionMembers.filter(m => m.isEligible).length;
              const sectionNotEligible = sectionMembers.length - sectionEligible;

              return (
                <div key={section} className="print-section">
                  {/* Section header */}
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-lg font-bold text-gray-900">{section}</h2>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${sectionBadgeColors[section]}`}>
                      {sectionMembers.length} Members
                    </span>
                    <span className="text-xs text-gray-400 font-medium ml-auto no-print">
                      {sectionEligible} eligible · {sectionNotEligible} not eligible
                    </span>
                  </div>

                  {/* Table */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:shadow-none print:rounded-none print:border-gray-300">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50/50 print:bg-gray-100">
                            <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-8 print:text-gray-600">#</th>
                            <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider print:text-gray-600">Member</th>
                            {sessions.map((s) => (
                              <th key={s.id} className="text-center px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap print:text-gray-600">
                                {dayLabel(s.sessionDate)}
                              </th>
                            ))}
                            <th className="text-center px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider print:text-gray-600">Score</th>
                            <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider print:text-gray-600">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 print:divide-gray-200">
                          {sectionMembers.map((member, idx) => (
                            <tr key={member.memberId} className={`hover:bg-gray-50/80 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30 print:bg-gray-50'}`}>
                              <td className="px-4 py-3 text-xs text-gray-400 font-medium">{idx + 1}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-[#1E293B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 no-print">
                                    {member.memberName?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                                  </div>
                                  <span className="font-semibold text-gray-900 text-sm whitespace-nowrap">{member.memberName}</span>
                                </div>
                              </td>
                              {sessions.map((s) => (
                                <td key={s.id} className="px-3 py-3 text-center">
                                  {member.attendance[s.id] ? (
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50 text-green-600 print:bg-transparent">
                                      <Check size={14} strokeWidth={3} />
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-red-400 print:bg-transparent">
                                      <X size={14} strokeWidth={3} />
                                    </span>
                                  )}
                                </td>
                              ))}
                              <td className="px-3 py-3 text-center">
                                <span className="font-bold text-gray-700 text-sm">{member.sessionsAttended}<span className="text-gray-400 font-normal">/{member.totalSessions}</span></span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${
                                  member.isEligible
                                    ? 'bg-green-50 text-green-600 print:text-green-700'
                                    : 'bg-red-50 text-red-500 print:text-red-600'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${member.isEligible ? 'bg-green-500' : 'bg-red-500'}`} />
                                  {member.isEligible ? 'Eligible' : 'Not Eligible'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Print footer — only visible in print */}
          <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-[10px] text-gray-400">
            <p>ChoirFlow Attendance System · {weekRangeLabel(monday, sunday)} · Eligibility Rule: {stats.requiredSessions}/{stats.totalSessions} rehearsals required</p>
          </div>
        </>
      )}
    </>
  );
}
