'use client';

// page.jsx: Member profile page with attendance history and stats

import { useParams } from 'next/navigation';
import { useMemberAttendance } from '@/hooks/useAttendance';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatTime, getPunctualityColor } from '@/lib/utils';
import Link from 'next/link';

export default function MemberProfilePage() {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [loadingMember, setLoadingMember] = useState(true);
  const { attendanceHistory, stats, loading: loadingAtt } = useMemberAttendance(id);

  useEffect(() => {
    async function loadMember() {
      const supabase = createClient();
      const { data } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single();
      setMember(data);
      setLoadingMember(false);
    }
    if (id) loadMember();
  }, [id]);

  if (loadingMember) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="bg-white rounded-xl h-48" />
      </div>
    );
  }

  if (!member) {
    return <div className="text-center text-gray-400 py-12">Member not found.</div>;
  }

  const initials = member.name?.split(' ').map((n) => n[0]).join('').slice(0, 2);

  const sectionColors = {
    Soprano: 'bg-[#EFF6FF] text-[#2563EB]',
    Alto: 'bg-purple-50 text-purple-600',
    Tenor: 'bg-amber-50 text-amber-600',
    Bass: 'bg-green-50 text-green-600',
  };

  return (
    <>
      {/* Back link */}
      <Link href="/members" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2563EB] mb-6 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Members
      </Link>

      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-5">
          {member.photo_url ? (
            <img src={member.photo_url} alt={member.name} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] text-xl font-bold">
              {initials}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{member.name}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${sectionColors[member.section] || 'bg-gray-100 text-gray-600'}`}>
                {member.section}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${member.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                {member.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MiniStat label="Attended" value={stats.attended} />
        <MiniStat label="Total Sessions" value={stats.totalSessions} />
        <MiniStat label="Attendance" value={`${stats.attendancePct}%`} />
        <MiniStat label="Punctual" value={stats.punctualCount} />
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Attendance History</h2>
        {loadingAtt ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />)}
          </div>
        ) : attendanceHistory.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No attendance records yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {attendanceHistory.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{a.session_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{a.session_date ? formatDate(a.session_date) : '—'}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${getPunctualityColor(a.punctuality_status)}`}>
                    {a.punctuality_status}
                  </p>
                  <p className="text-xs text-gray-400">{a.delay_minutes} min delay</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
      <p className="text-2xl font-bold text-[#1E3A8A]">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}
