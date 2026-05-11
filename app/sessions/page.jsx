'use client';

// page.jsx: Sessions list page with type filter and grid of SessionCards

import { useState } from 'react';
import Link from 'next/link';
import { useSessions } from '@/hooks/useSession';
import SessionCard from '@/components/sessions/SessionCard';
import { SESSION_TYPES } from '@/lib/config';
import { Plus, Filter } from 'lucide-react';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1E293B] tracking-tight mb-1">Sessions</h1>
          <p className="text-[#64748B] text-sm">Manage choir rehearsals and services.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group hidden sm:block">
            <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm bg-white">
              <Filter size={16} />
              {typeFilter || 'All Types'}
            </button>
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              <option value="">All Types</option>
              {SESSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="relative group hidden sm:block">
            <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm bg-white">
              {statusFilter ? (statusFilter === 'open' ? 'Open' : 'Closed') : 'All Status'}
            </button>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <Link href="/sessions/new" className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-[#1E3A8A] transition-all shadow-sm">
            <Plus size={16} />
            New Session
          </Link>
        </div>
      </div>

      {/* Mobile Filters */}
      <div className="flex sm:hidden items-center gap-3 mb-6">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 outline-none w-full">
          <option value="">All Types</option>
          {SESSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 outline-none w-full">
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-40">
              <div className="h-5 w-48 bg-gray-100 rounded-full mb-4" />
              <div className="h-4 w-32 bg-gray-100 rounded-full mb-6" />
              <div className="flex gap-4">
                <div className="h-3 w-24 bg-gray-100 rounded-full" />
                <div className="h-3 w-24 bg-gray-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500 bg-white rounded-2xl border border-red-100">{error}</div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <p className="text-gray-500 font-medium">No sessions found. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sessions.map((s) => <SessionCard key={s.id} session={s} />)}
        </div>
      )}
    </>
  );
}
