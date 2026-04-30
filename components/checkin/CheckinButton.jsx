'use client';

// CheckinButton.jsx: Button to check in a member with status options (Present, Absent, Excused)

import { useState, useRef, useEffect } from 'react';
import { checkInMember } from '@/actions/attendance';
import { markMemberStatus } from '@/actions/attendance';

/**
 * Renders a check-in button with a dropdown for Present / Absent / Excused.
 */
export default function CheckinButton({ memberId, sessionId, isCheckedIn, currentStatus, onCheckedIn }) {
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
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

  const handleAction = async (status) => {
    setShowMenu(false);
    setLoading(true);

    if (status === 'Present') {
      const { data, error } = await checkInMember({ memberId, sessionId });
      if (error) {
        alert(error);
        setLoading(false);
        return;
      }
      onCheckedIn?.(data);
    } else {
      const { data, error } = await markMemberStatus({ memberId, sessionId, status });
      if (error) {
        alert(error);
        setLoading(false);
        return;
      }
      onCheckedIn?.(data);
    }

    setLoading(false);
  };

  if (isCheckedIn) {
    const statusStyles = {
      Present: 'text-green-600 bg-green-50',
      Absent: 'text-red-500 bg-red-50',
      Excused: 'text-amber-600 bg-amber-50',
    };
    const style = statusStyles[currentStatus] || statusStyles['Present'];

    return (
      <span className={`inline-flex items-center justify-center px-4 py-2 text-xs font-bold rounded-lg ${style}`}>
        {currentStatus === 'Present' && (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><polyline points="20 6 9 17 4 12"/></svg>
        )}
        {currentStatus === 'Absent' && (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        )}
        {currentStatus === 'Excused' && (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        )}
        {currentStatus}
      </span>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Main button */}
      <div className="flex shadow-sm rounded-lg">
        <button
          onClick={() => handleAction('Present')}
          disabled={loading}
          className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-[#1E3A8A] rounded-l-lg hover:bg-[#172554] transition-all disabled:opacity-50"
        >
          {loading ? (
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><polyline points="20 6 9 17 4 12"/></svg>
              Mark Present
            </>
          )}
        </button>
        {/* Dropdown toggle */}
        <button
          onClick={() => setShowMenu((prev) => !prev)}
          disabled={loading}
          className="inline-flex items-center justify-center px-2 py-2 text-white bg-[#1E3A8A] border-l border-white/20 rounded-r-lg hover:bg-[#172554] transition-all disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>

      {/* Dropdown */}
      {showMenu && (
        <div className="absolute right-0 top-full mt-1.5 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden animate-fadeIn">
          <button
            onClick={() => handleAction('Present')}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"/></svg>
            Present
          </button>
          <button
            onClick={() => handleAction('Absent')}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors border-t border-gray-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Absent
          </button>
          <button
            onClick={() => handleAction('Excused')}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors border-t border-gray-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Excused
          </button>
        </div>
      )}
    </div>
  );
}
