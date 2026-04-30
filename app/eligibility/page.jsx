'use client';

// page.jsx: Eligibility page with date range picker, stats, and grouped member list

import { useState } from 'react';
import useEligibility from '@/hooks/useEligibility';
import { exportEligibilityCSV } from '@/actions/eligibility';
import { SECTIONS } from '@/lib/config';

export default function EligibilityPage() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [exporting, setExporting] = useState(false);

  const { eligibilityList, grouped, stats, loading, error } = useEligibility({ startDate, endDate });

  const handleExport = async () => {
    setExporting(true);
    const { data, error: expError } = await exportEligibilityCSV({ startDate, endDate });
    if (expError) {
      alert(expError);
      setExporting(false);
      return;
    }
    // Trigger download
    const blob = new Blob([data.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Eligibility</h1>
          <p className="text-sm text-[#76767D] mt-0.5">Check member eligibility for the selected period</p>
        </div>
        <button onClick={handleExport} disabled={exporting || loading} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-3 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MiniStat label="Total Members" value={stats.totalMembers} />
          <MiniStat label="Eligible" value={stats.eligibleCount} color="text-green-600" />
          <MiniStat label="Not Eligible" value={stats.notEligibleCount} color="text-red-500" />
          <MiniStat label="Eligible %" value={`${stats.eligiblePct}%`} color="text-[#1E3A8A]" />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-5 text-center">{error}</div>
      ) : eligibilityList.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm">No eligibility data for this period.</div>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map((section) => {
            const members = grouped[section] || [];
            if (members.length === 0) return null;
            return (
              <div key={section}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{section}</h2>
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500">Name</th>
                        <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500">Attended</th>
                        <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500">Total</th>
                        <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500">%</th>
                        <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={m.memberId} className="border-b border-gray-50 last:border-0">
                          <td className="px-5 py-3 font-medium text-gray-900">{m.memberName}</td>
                          <td className="px-5 py-3 text-right text-gray-600">{m.sessionsAttended}</td>
                          <td className="px-5 py-3 text-right text-gray-400">{m.totalSessions}</td>
                          <td className="px-5 py-3 text-right font-semibold text-[#1E3A8A]">{m.attendancePct}%</td>
                          <td className="px-5 py-3 text-right">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${m.isEligible ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                              {m.isEligible ? 'Eligible' : 'Not Eligible'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function MiniStat({ label, value, color = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}
