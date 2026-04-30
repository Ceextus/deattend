'use client';

// page.jsx: Sessions list page with type filter and grid of SessionCards

import { useState } from 'react';
import Link from 'next/link';
import { useSessions } from '@/hooks/useSession';
import SessionCard from '@/components/sessions/SessionCard';
import { SESSION_TYPES } from '@/lib/config';

export default function SessionsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filterOpts = {};
  if (typeFilter) filterOpts.type = typeFilter;
  if (statusFilter === 'open') filterOpts.isClosed = false;
  if (statusFilter === 'closed') filterOpts.isClosed = true;

  const { sessions, loading, error } = useSessions(filterOpts);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sessions</h1>
          <p className="text-sm text-[#76767D] mt-0.5">Manage rehearsals and services</p>
        </div>
        <Link href="/sessions/new" className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-[#1E3A8A] transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Session
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all">
          <option value="">All Types</option>
          {SESSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all">
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 w-40 bg-gray-100 rounded mb-3" />
              <div className="h-3 w-24 bg-gray-100 rounded mb-4" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-5 text-center">{error}</div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">No sessions found. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessions.map((s) => <SessionCard key={s.id} session={s} />)}
        </div>
      )}
    </>
  );
}
