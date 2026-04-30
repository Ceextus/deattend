'use client';

// SessionCard.jsx: Card displaying a session with date, type, status, and link to details

import Link from 'next/link';
import { formatDate, formatTime } from '@/lib/utils';
import SessionStatus from './SessionStatus';

const typeColors = {
  Rehearsal: 'bg-[#EFF6FF] text-[#2563EB]',
  Service: 'bg-purple-50 text-purple-600',
};

/**
 * Displays a session card with name, date, time, type badge, and open/closed status.
 */
export default function SessionCard({ session }) {
  return (
    <Link
      href={`/sessions/${session.id}`}
      className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all group block"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-[#2563EB] transition-colors">
            {session.name}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeColors[session.session_type] || 'bg-gray-100 text-gray-600'}`}>
              {session.session_type}
            </span>
            <SessionStatus isClosed={session.is_closed} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          {formatDate(session.session_date)}
        </span>
        <span className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {formatTime(session.start_time)}
        </span>
      </div>

      {session.created_by_name && (
        <p className="text-[11px] text-gray-300 mt-3">Created by {session.created_by_name}</p>
      )}
    </Link>
  );
}
