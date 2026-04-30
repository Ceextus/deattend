'use client';

// page.jsx: Session detail page showing session info, attendance list, and close action

import { useParams, useRouter } from 'next/navigation';
import { useSession as useSessionHook } from '@/hooks/useSession';
import { useAttendance } from '@/hooks/useAttendance';
import { closeSession } from '@/actions/sessions';
import { overrideAttendanceStatus, deleteAttendanceRecord } from '@/actions/attendance';
import { formatDate, formatTime, getPunctualityColor } from '@/lib/utils';
import SessionStatus from '@/components/sessions/SessionStatus';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SessionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { session, loading: loadingSession } = useSessionHook(id);
  const { attendanceList, loading: loadingAtt, checkedInCount } = useAttendance(id);
  const [closing, setClosing] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Check if current user is super_admin
  useEffect(() => {
    async function checkRole() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single();
      setIsSuperAdmin(profile?.role === 'super_admin');
    }
    checkRole();
  }, []);

  const handleClose = async () => {
    if (!confirm('Close this session? No more check-ins will be allowed.')) return;
    setClosing(true);
    const { error } = await closeSession(id);
    if (error) {
      alert(error);
      setClosing(false);
      return;
    }
    router.refresh();
    setClosing(false);
  };

  if (loadingSession) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded-lg" />
        <div className="bg-white rounded-xl h-48" />
      </div>
    );
  }

  if (!session) {
    return <div className="text-center text-gray-400 py-12">Session not found.</div>;
  }

  return (
    <>
      {/* Back */}
      <Link href="/sessions" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2563EB] mb-6 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Sessions
      </Link>

      {/* Session Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold text-gray-900">{session.name}</h1>
              <SessionStatus isClosed={session.is_closed} />
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{formatDate(session.session_date)}</span>
              <span>{formatTime(session.start_time)}</span>
              <span className="text-xs bg-gray-50 px-2 py-0.5 rounded">{session.session_type}</span>
            </div>
            {session.created_by_name && (
              <p className="text-xs text-gray-400 mt-2">Created by {session.created_by_name}</p>
            )}
          </div>

          <div className="flex gap-3">
            {!session.is_closed && (
              <>
                <Link href={`/sessions/${id}/checkin`} className="px-5 py-2.5 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-[#1E3A8A] transition-colors">
                  Take Attendance
                </Link>
                <button onClick={handleClose} disabled={closing} className="px-4 py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
                  {closing ? 'Closing...' : 'Close Session'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-[#1E3A8A]">{checkedInCount}</p>
          <p className="text-xs text-gray-400 mt-1">Checked In</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {attendanceList.filter(a => a.punctuality_status === 'Punctual').length}
          </p>
          <p className="text-xs text-gray-400 mt-1">On Time</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">
            {attendanceList.filter(a => a.punctuality_status !== 'Punctual').length}
          </p>
          <p className="text-xs text-gray-400 mt-1">Late</p>
        </div>
      </div>

      {/* Attendance List */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Attendance ({checkedInCount})</h2>
          {isSuperAdmin && (
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md border border-purple-100">
              Super Admin — Hover rows to edit
            </span>
          )}
        </div>
        {loadingAtt ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />)}</div>
        ) : attendanceList.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No check-ins yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {attendanceList.map((a) => (
              <AttendanceRow key={a.id} record={a} isSuperAdmin={isSuperAdmin} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ─────── Attendance Row with Super Admin Override ─────── */

function AttendanceRow({ record, isSuperAdmin }) {
  const a = record;
  const [showMenu, setShowMenu] = useState(false);
  const [updating, setUpdating] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const statusOptions = [
    { value: 'Punctual', label: 'Punctual', color: 'text-green-600', bg: 'hover:bg-green-50', icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
    { value: 'Late', label: 'Late', color: 'text-amber-600', bg: 'hover:bg-amber-50', icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
    { value: 'Very Late', label: 'Very Late', color: 'text-orange-600', bg: 'hover:bg-orange-50', icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
    { value: 'Absent', label: 'Absent', color: 'text-red-600', bg: 'hover:bg-red-50', icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> },
    { value: 'Excused', label: 'Excused', color: 'text-purple-600', bg: 'hover:bg-purple-50', icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
  ];

  const handleOverride = async (newStatus) => {
    if (newStatus === a.punctuality_status) {
      setShowMenu(false);
      return;
    }

    const reason = prompt(`Reason for changing "${a.member_name}" from "${a.punctuality_status}" to "${newStatus}":`);
    if (reason === null) {
      setShowMenu(false);
      return; // user cancelled
    }

    setShowMenu(false);
    setUpdating(true);

    const { error } = await overrideAttendanceStatus(a.id, {
      punctualityStatus: newStatus,
      reason: reason || 'No reason provided',
    });

    if (error) alert(`Failed to update: ${error}`);
    setUpdating(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Remove "${a.member_name}" from this session's attendance? This cannot be undone.`)) {
      setShowMenu(false);
      return;
    }
    setShowMenu(false);
    setUpdating(true);

    const { error } = await deleteAttendanceRecord(a.id);
    if (error) alert(`Failed to delete: ${error}`);
    setUpdating(false);
  };

  return (
    <div className={`flex items-center justify-between py-3 group ${updating ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] text-xs font-bold">
          {a.member_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{a.member_name}</p>
          <p className="text-xs text-gray-400">{a.member_section}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className={`text-sm font-semibold ${getPunctualityColor(a.punctuality_status)}`}>
            {updating ? 'Updating...' : a.punctuality_status}
          </p>
          <p className="text-xs text-gray-400">+{a.delay_minutes} min</p>
        </div>

        {/* Super Admin Actions */}
        {isSuperAdmin && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
              title="Change status"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden animate-fadeIn">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Change Status</p>
                </div>
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleOverride(opt.value)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold transition-colors ${opt.color} ${opt.bg} ${a.punctuality_status === opt.value ? 'bg-gray-50' : ''}`}
                  >
                    {opt.icon}
                    {opt.label}
                    {a.punctuality_status === opt.value && (
                      <span className="ml-auto text-[10px] text-gray-400">current</span>
                    )}
                  </button>
                ))}
                <div className="border-t border-gray-100">
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    Delete Record
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
