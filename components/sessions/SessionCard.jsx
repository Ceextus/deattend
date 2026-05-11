'use client';

// SessionCard.jsx: Card displaying a session with date, type, status, and link to details

import Link from 'next/link';
import { formatDate, formatTime } from '@/lib/utils';
import SessionStatus from './SessionStatus';

const typeColors = {
  Rehearsal: 'bg-[#EFF6FF] text-[#2563EB]',
  Service: 'bg-[#FAF5FF] text-[#9333EA]',
};

const circleColors = {
  Rehearsal: 'bg-[#EFF6FF]',
  Service: 'bg-[#FAF5FF]',
};

/**
 * Displays a session card with name, date, time, type badge, and open/closed status.
 */
export default function SessionCard({ session }) {
  return (
    <Link
      href={`/sessions/${session.id}`}
      className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md hover:border-gray-200 transition-all group block relative overflow-hidden z-0"
    >
      <div className={`absolute -top-6 -right-6 w-32 h-32 rounded-full -z-10 transition-transform group-hover:scale-110 ${circleColors[session.session_type] || 'bg-gray-50'}`} />
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-[#2563EB] transition-colors mb-2">
            {session.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide ${typeColors[session.session_type] || 'bg-gray-100 text-gray-600'}`}>
              {session.session_type}
            </span>
            <SessionStatus isClosed={session.is_closed} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-gray-50">
        <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
          <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {formatDate(session.session_date)}
          </span>
          <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {formatTime(session.start_time)}
          </span>
        </div>
        
        {session.created_by_name && (
          <p className="text-[11px] text-gray-400 mt-1">Created by {session.created_by_name}</p>
        )}
      </div>
    </Link>
  );
}
