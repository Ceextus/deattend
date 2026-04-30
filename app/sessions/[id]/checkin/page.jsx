'use client';

// page.jsx: Real-time check-in page — redesigned to match the provided screenshot UI

import { useParams } from 'next/navigation';
import { useSession as useSessionHook } from '@/hooks/useSession';
import { useAttendance } from '@/hooks/useAttendance';
import useMembers from '@/hooks/useMembers';
import CheckinButton from '@/components/checkin/CheckinButton';
import CheckinList from '@/components/checkin/CheckinList';
import Link from 'next/link';
import { useState, useMemo } from 'react';

export default function CheckinPage() {
  const { id: sessionId } = useParams();
  const { session, loading: loadingSession } = useSessionHook(sessionId);
  const { attendanceList, loading: loadingAtt, checkedInCount, addRecord } = useAttendance(sessionId);
  const { members, loading: loadingMembers } = useMembers({ isActive: true });
  const [search, setSearch] = useState('');

  // IDs of members already checked in
  const checkedInIds = useMemo(
    () => new Set(attendanceList.map((a) => a.member_id)),
    [attendanceList]
  );

  // Members not yet checked in, filtered by search
  const uncheckedMembers = useMemo(() => {
    return members
      .filter((m) => !checkedInIds.has(m.id))
      .filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()));
  }, [members, checkedInIds, search]);

  const totalMembers = members.length;
  const pendingCount = totalMembers - checkedInCount;

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

  // Generate a mock ID for members who don't have one, just for the UI
  const getMockId = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash).toString().substring(0, 4);
  };

  const sectionColors = {
    Soprano: 'bg-[#EEF2FF] text-[#4F46E5]',
    Alto: 'bg-[#EEF2FF] text-[#4F46E5]', // Using indigo/blue tones based on the screenshot
    Tenor: 'bg-[#FFF1F2] text-[#E11D48]',
    Bass: 'bg-[#FFF7ED] text-[#EA580C]',
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full min-h-[calc(100vh-6rem)]">
      
      {/* Left Column: Main Check-in Area */}
      <div className="flex-1 flex flex-col min-w-0 order-2 xl:order-1">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <p className="text-xs font-semibold text-[#2563EB] uppercase tracking-widest mb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Live Session
            </p>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {session.session_type === 'Rehearsal' ? 'Rehearsal Check-in' : 'Service Check-in'}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg border border-green-100/50">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
              <span className="text-xs font-bold text-green-700">{checkedInCount} Present</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              <span className="text-xs font-bold text-gray-600">{pendingCount} Pending</span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 group-focus-within:text-[#2563EB]">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-focus-within:text-[#2563EB] transition-colors">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Scan ID or type member name..."
            className="w-full pl-11 pr-24 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all shadow-sm font-medium text-gray-700 placeholder-gray-400"
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
            <span className="hidden sm:inline-block bg-gray-50 text-gray-500 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-gray-200 shadow-sm">
              Press Enter ↵
            </span>
          </div>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto pr-2 pb-10 space-y-3 custom-scrollbar">
          {session.is_closed ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-2xl p-6 text-center font-medium shadow-sm">
              <span className="block text-xl mb-2">🔒</span>
              This session is closed. No more check-ins can be recorded.
            </div>
          ) : loadingMembers ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-white border border-gray-100 rounded-2xl shadow-sm animate-pulse" />)}</div>
          ) : uncheckedMembers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎉</span>
              </div>
              <p className="text-gray-900 font-bold text-base mb-1">
                {members.length === checkedInCount ? 'All Caught Up!' : 'No matches found.'}
              </p>
              <p className="text-gray-500 text-xs">
                {members.length === checkedInCount ? 'Every member has been checked in.' : 'Try adjusting your search term.'}
              </p>
            </div>
          ) : (
            uncheckedMembers.map((m) => (
              <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md hover:border-gray-200 transition-all">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    {m.photo_url ? (
                      <img src={m.photo_url} alt={m.name} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center text-gray-500 text-base font-bold shadow-inner border border-gray-100">
                        {m.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-gray-100 rounded-full border-2 border-white"></div>
                  </div>
                  
                  {/* Info */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-1">{m.name}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${sectionColors[m.section] || 'bg-gray-100 text-gray-600'}`}>
                        {m.section}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                        ID: {getMockId(m.name)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div className="flex justify-end sm:justify-start">
                  <CheckinButton
                    memberId={m.id}
                    sessionId={sessionId}
                    isCheckedIn={false}
                    onCheckedIn={addRecord}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Recent Check-ins Panel */}
      <div className="w-full xl:w-[350px] shrink-0 order-1 xl:order-2 mb-6 xl:mb-0 h-[400px] xl:h-auto">
        <CheckinList attendanceList={attendanceList} />
      </div>

    </div>
  );
}
