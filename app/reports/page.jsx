'use client';

// page.jsx: Reports page with rankings table and top performer highlights

import { useRankings } from '@/hooks/useRankings';
import { SECTIONS } from '@/lib/config';
import { useState } from 'react';

export default function ReportsPage() {
  const { rankings, topPunctual, topConsistent, mostLate, loading, error } = useRankings();
  const [sectionFilter, setSectionFilter] = useState('');

  const filtered = sectionFilter
    ? rankings.filter((r) => r.section === sectionFilter)
    : rankings;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports & Rankings</h1>
        <p className="text-sm text-[#76767D] mt-0.5">Member attendance performance overview</p>
      </div>

      {/* Top Performers */}
      {!loading && (topPunctual || topConsistent || mostLate) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {topConsistent && (
            <HighlightCard
              title="Most Consistent"
              name={topConsistent.member_name}
              section={topConsistent.section}
              value={`${topConsistent.attendance_pct}%`}
              color="bg-green-50 text-green-700 border-green-100"
              icon="🏆"
            />
          )}
          {topPunctual && (
            <HighlightCard
              title="Most Punctual"
              name={topPunctual.member_name}
              section={topPunctual.section}
              value={`${topPunctual.punctuality_pct}%`}
              color="bg-blue-50 text-[#2563EB] border-blue-100"
              icon="⏱️"
            />
          )}
          {mostLate && (
            <HighlightCard
              title="Most Late"
              name={mostLate.member_name}
              section={mostLate.section}
              value={`${mostLate.late_count + mostLate.very_late_count}×`}
              color="bg-amber-50 text-amber-700 border-amber-100"
              icon="⚠️"
            />
          )}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]">
          <option value="">All Sections</option>
          {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-gray-400">{filtered.length} members</span>
      </div>

      {/* Rankings Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />)}</div>
        ) : error ? (
          <div className="p-6 text-center text-red-500 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No ranking data available yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Rank</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Member</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Section</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Attendance</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Punctual</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Late</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.member_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 text-gray-400 font-medium">{r.attendance_rank || i + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{r.member_name}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{r.section}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-[#1E3A8A]">{r.attendance_pct}%</td>
                  <td className="px-5 py-3 text-right text-green-600">{r.punctual_count}</td>
                  <td className="px-5 py-3 text-right text-amber-500">{r.late_count + r.very_late_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function HighlightCard({ title, name, section, value, color, icon }) {
  return (
    <div className={`rounded-xl border p-5 ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{title}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-lg font-bold">{name}</p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs opacity-60">{section}</span>
        <span className="text-xl font-extrabold">{value}</span>
      </div>
    </div>
  );
}
