'use client';

// page.jsx: Disputes page — override attendance records with reason

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { overrideAttendanceStatus } from '@/actions/attendance';
import { PUNCTUALITY_STATUSES } from '@/lib/config';

export default function DisputesPage() {
  const [attendanceId, setAttendanceId] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Search state
  const [searchName, setSearchName] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchName.trim()) return;
    setSearching(true);
    setSearchResults([]);

    const supabase = createClient();
    const { data } = await supabase
      .from('attendance')
      .select('id, delay_minutes, punctuality_status, check_in_time, members:member_id(name, section), sessions:session_id(name, session_date)')
      .ilike('members.name', `%${searchName}%`)
      .order('check_in_time', { ascending: false })
      .limit(10);

    setSearchResults(
      (data || []).filter((r) => r.members).map((r) => ({
        ...r,
        member_name: r.members?.name,
        member_section: r.members?.section,
        session_name: r.sessions?.name,
        session_date: r.sessions?.session_date,
      }))
    );
    setSearching(false);
  };

  const handleOverride = async (e) => {
    e.preventDefault();
    if (!attendanceId || !newStatus) return;
    setLoading(true);
    setResult(null);

    const { data, error } = await overrideAttendanceStatus(attendanceId, {
      punctualityStatus: newStatus,
      reason,
    });

    setResult(error ? { type: 'error', message: error } : { type: 'success', message: 'Status overridden successfully.' });
    setLoading(false);
    if (!error) {
      setAttendanceId('');
      setNewStatus('');
      setReason('');
    }
  };

  const statuses = Object.values(PUNCTUALITY_STATUSES);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Disputes & Overrides</h1>
        <p className="text-sm text-[#76767D] mt-0.5">Search for attendance records and override their status with a reason</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Find Attendance Record</h2>
        <div className="flex items-end gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Member Name</label>
            <input type="text" value={searchName} onChange={(e) => setSearchName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Search by member name..." className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
          </div>
          <button onClick={handleSearch} disabled={searching} className="px-5 py-2.5 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-[#1E3A8A] transition-colors disabled:opacity-50">
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
            {searchResults.map((r) => (
              <div key={r.id} className={`flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 px-2 rounded-lg transition-colors ${attendanceId === r.id ? 'bg-[#EFF6FF]' : ''}`} onClick={() => setAttendanceId(r.id)}>
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.member_name} <span className="text-xs text-gray-400">({r.member_section})</span></p>
                  <p className="text-xs text-gray-400">{r.session_name} · {r.session_date}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-600">{r.punctuality_status}</p>
                  <p className="text-[10px] text-gray-400">+{r.delay_minutes} min</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Override Form */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Override Status</h2>

        {result && (
          <div className={`mb-4 p-3 text-sm rounded-lg ${result.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
            {result.message}
          </div>
        )}

        <form onSubmit={handleOverride} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Attendance Record ID</label>
            <input type="text" value={attendanceId} onChange={(e) => setAttendanceId(e.target.value)} placeholder="Select from search or paste ID" required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2563EB]/20 font-mono text-xs" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">New Status</label>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} required className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2563EB]/20">
              <option value="">Select status</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain the reason for this override..." rows={3} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2563EB]/20 resize-none" />
          </div>

          <button type="submit" disabled={loading || !attendanceId || !newStatus} className="px-6 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Override Status
          </button>
        </form>
      </div>
    </>
  );
}
