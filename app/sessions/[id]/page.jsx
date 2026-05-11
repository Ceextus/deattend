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
import { ArrowLeft, Calendar, Clock, MoreVertical, CheckCircle2, AlertCircle, XCircle, AlertTriangle, Trash2 } from 'lucide-react';

const typeColors = {
  Rehearsal: 'bg-[#EFF6FF] text-[#2563EB]',
  Service: 'bg-[#FAF5FF] text-[#9333EA]',
};

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
        <div className="h-4 w-32 bg-gray-200 rounded mb-8" />
        <div className="bg-white rounded-2xl h-48 border border-gray-100" />
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl h-24 border border-gray-100" />
          <div className="bg-white rounded-2xl h-24 border border-gray-100" />
          <div className="bg-white rounded-2xl h-24 border border-gray-100" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
        <p className="text-gray-500 font-medium">Session not found.</p>
      </div>
    );
  }

  return (
    <>
      {/* Back */}
      <Link href="/sessions" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#2563EB] mb-6 transition-colors">
        <ArrowLeft size={16} />
        Back to Sessions
      </Link>

      {/* Session Header Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-8 relative overflow-hidden z-0 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className={`absolute -top-12 -right-12 w-48 h-48 rounded-full -z-10 ${session.session_type === 'Service' ? 'bg-[#FAF5FF]' : 'bg-[#EFF6FF]'}`} />
        
        <div>
          <div className="flex items-center gap-4 mb-3">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{session.name}</h1>
            <SessionStatus isClosed={session.is_closed} />
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-500 mt-4">
            <span className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              <Calendar size={14} className="text-gray-400" />
              {formatDate(session.session_date)}
            </span>
            <span className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              <Clock size={14} className="text-gray-400" />
              {formatTime(session.start_time)}
            </span>
            <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide ${typeColors[session.session_type] || 'bg-gray-100 text-gray-600'}`}>
              {session.session_type}
            </span>
          </div>

          {session.created_by_name && (
            <p className="text-[11px] text-gray-400 mt-4 font-medium uppercase tracking-wider">
              Created by {session.created_by_name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!session.is_closed && (
            <>
              <button 
                onClick={handleClose} 
                disabled={closing} 
                className="px-5 py-2.5 border border-red-100 bg-red-50 text-sm font-semibold text-red-600 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50 shadow-sm"
              >
                {closing ? 'Closing...' : 'Close Session'}
              </button>
              <Link 
                href={`/sessions/${id}/checkin`} 
                className="px-6 py-2.5 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-[#1E3A8A] transition-all shadow-sm"
              >
                Take Attendance
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden z-0">
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-[#EFF6FF] rounded-full -z-10" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Checked In</p>
          <p className="text-4xl font-bold text-[#1E3A8A]">{checkedInCount}</p>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden z-0">
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-[#F0FDF4] rounded-full -z-10" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">On Time</p>
          <p className="text-4xl font-bold text-green-600">
            {attendanceList.filter(a => a.punctuality_status === 'Punctual').length}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden z-0">
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-[#FFF7ED] rounded-full -z-10" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Late</p>
          <p className="text-4xl font-bold text-amber-500">
            {attendanceList.filter(a => a.punctuality_status !== 'Punctual').length}
          </p>
        </div>
      </div>

      {/* Attendance List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Attendance Log</h2>
          {isSuperAdmin && (
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full uppercase tracking-wide border border-purple-100 mt-3 sm:mt-0">
              Super Admin Mode
            </span>
          )}
        </div>
        
        <div className="flex-1">
          {loadingAtt ? (
            <div className="p-6 flex items-center justify-center h-full">
              <div className="animate-spin w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full" />
            </div>
          ) : attendanceList.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center h-full text-gray-400">
              <p className="font-medium text-gray-500 mb-1">No check-ins yet.</p>
              <p className="text-sm">Click 'Take Attendance' to start.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {attendanceList.map((a) => (
                <AttendanceRow key={a.id} record={a} isSuperAdmin={isSuperAdmin} />
              ))}
            </div>
          )}
        </div>
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
    { value: 'Punctual', label: 'Punctual', color: 'text-green-600', bg: 'hover:bg-green-50', icon: <CheckCircle2 size={14} /> },
    { value: 'Late', label: 'Late', color: 'text-amber-600', bg: 'hover:bg-amber-50', icon: <AlertCircle size={14} /> },
    { value: 'Very Late', label: 'Very Late', color: 'text-orange-600', bg: 'hover:bg-orange-50', icon: <AlertTriangle size={14} /> },
    { value: 'Absent', label: 'Absent', color: 'text-red-600', bg: 'hover:bg-red-50', icon: <XCircle size={14} /> },
    { value: 'Excused', label: 'Excused', color: 'text-purple-600', bg: 'hover:bg-purple-50', icon: <CheckCircle2 size={14} className="opacity-50" /> },
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
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 group hover:bg-gray-50/80 transition-colors ${updating ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center gap-4 mb-3 sm:mb-0">
        <div className="w-10 h-10 rounded-full bg-[#1E293B] flex items-center justify-center text-white text-sm font-bold shadow-sm">
          {a.member_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
        </div>
        <div>
          <p className="text-base font-bold text-gray-900 line-clamp-1">{a.member_name}</p>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">
            {a.member_section}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full">
        <div className="text-left sm:text-right">
          <p className={`text-sm font-bold px-3 py-1 rounded-lg inline-block ${a.punctuality_status === 'Punctual' ? 'bg-green-50 text-green-600' : a.punctuality_status.includes('Late') ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
            {updating ? 'Updating...' : a.punctuality_status}
          </p>
          {a.delay_minutes > 0 && (
            <p className="text-[11px] font-medium text-gray-400 mt-1 sm:text-right text-center">+{a.delay_minutes} min late</p>
          )}
        </div>

        {/* Super Admin Actions */}
        {isSuperAdmin && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#2563EB] hover:bg-blue-50 transition-colors sm:opacity-0 group-hover:opacity-100"
              title="Change status"
            >
              <MoreVertical size={16} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Override Status</p>
                </div>
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleOverride(opt.value)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold transition-colors ${opt.color} ${opt.bg} ${a.punctuality_status === opt.value ? 'bg-gray-50' : ''}`}
                  >
                    {opt.icon}
                    {opt.label}
                    {a.punctuality_status === opt.value && (
                      <span className="ml-auto text-[10px] text-gray-400 font-medium">current</span>
                    )}
                  </button>
                ))}
                <div className="border-t border-gray-100 p-1">
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
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
