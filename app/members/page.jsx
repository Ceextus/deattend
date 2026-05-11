'use client';

// page.jsx: Members list page with search, section filter, sorting, pagination, edit/delete modals

import { useState, useMemo } from 'react';
import Link from 'next/link';
import useMembers from '@/hooks/useMembers';
import MemberSearch from '@/components/members/MemberSearch';
import AddMemberModal from '@/components/members/AddMemberModal';
import EditMemberModal from '@/components/members/EditMemberModal';
import DeleteMemberModal from '@/components/members/DeleteMemberModal';
import { Filter, Pencil, Trash2, Plus, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';

const sectionBadgeColors = {
  Soprano: 'bg-[#EFF6FF] text-[#2563EB]',
  Alto: 'bg-[#F0FDFA] text-[#0D9488]',
  Tenor: 'bg-[#FAF5FF] text-[#9333EA]',
  Bass: 'bg-[#F1F5F9] text-[#475569]',
};

const SECTION_ORDER = { Soprano: 0, Alto: 1, Tenor: 2, Bass: 3 };
const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function MembersPage() {
  const { members, loading, error, refetch } = useMembers({ isActive: true });
  const [filter, setFilter] = useState({ search: '', section: '' });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);

  // Sorting state: { key: 'name' | 'section' | 'created_at', dir: 'asc' | 'desc' }
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Toggle sort on column click
  const handleSort = (key) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { key, dir: 'asc' };
    });
    setPage(1); // reset to first page on sort change
  };

  // Sort icon helper
  const SortIcon = ({ columnKey }) => {
    if (sort.key !== columnKey) return <ArrowUpDown size={13} className="text-gray-300 ml-1" />;
    return sort.dir === 'asc'
      ? <ArrowUp size={13} className="text-[#2563EB] ml-1" />
      : <ArrowDown size={13} className="text-[#2563EB] ml-1" />;
  };

  // Client-side filtering + sorting
  const sortedFiltered = useMemo(() => {
    let result = members.filter((m) => {
      const matchesSearch = !filter.search || m.name.toLowerCase().includes(filter.search.toLowerCase());
      const matchesSection = !filter.section || m.section === filter.section;
      return matchesSearch && matchesSection;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sort.key === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sort.key === 'section') {
        cmp = (SECTION_ORDER[a.section] ?? 99) - (SECTION_ORDER[b.section] ?? 99);
        if (cmp === 0) cmp = a.name.localeCompare(b.name); // secondary sort by name
      } else if (sort.key === 'created_at') {
        cmp = new Date(a.created_at) - new Date(b.created_at);
      }
      return sort.dir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [members, filter, sort]);

  // Reset page when filter changes
  const handleFilterChange = (updater) => {
    setFilter(updater);
    setPage(1);
  };

  // Pagination derived values
  const totalFiltered = sortedFiltered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedMembers = sortedFiltered.slice(startIdx, startIdx + pageSize);

  // Derived stats
  const totalMembers = members.length;
  const sopranos = members.filter(m => m.section === 'Soprano').length;
  const altos = members.filter(m => m.section === 'Alto').length;
  const tenorBass = members.filter(m => m.section === 'Tenor' || m.section === 'Bass').length;

  const handleAddSuccess = () => {
    setIsAddModalOpen(false);
    refetch();
  };

  const handleEditSuccess = () => {
    setEditingMember(null);
    refetch();
  };

  const handleDeleteSuccess = () => {
    setDeletingMember(null);
    refetch();
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1E293B] tracking-tight mb-1">Members Directory</h1>
          <p className="text-[#64748B] text-sm">Manage your choir members, sections, and roles.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm bg-white">
              <Filter size={16} />
              Filter
            </button>
            <select 
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               value={filter.section}
               onChange={(e) => handleFilterChange(prev => ({...prev, section: e.target.value}))}
             >
               <option value="">All Sections</option>
               {['Soprano', 'Alto', 'Tenor', 'Bass'].map(s => (
                 <option key={s} value={s}>{s}</option>
               ))}
             </select>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-[#1E3A8A] transition-all shadow-sm"
          >
            <Plus size={16} />
            Add New Member
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden z-0">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#EFF6FF] rounded-full -z-10" />
          <p className="text-xs font-semibold text-gray-500 mb-2">Total Members</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">{totalMembers}</p>
            {/* Hardcoded +3 for visual demo, ideally dynamic */}
            <span className="text-xs font-bold text-green-500 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
              3
            </span>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden z-0">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#FAF5FF] rounded-full -z-10" />
          <p className="text-xs font-semibold text-gray-500 mb-2">Sopranos</p>
          <p className="text-3xl font-bold text-gray-900">{sopranos}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden z-0">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#F0FDFA] rounded-full -z-10" />
          <p className="text-xs font-semibold text-gray-500 mb-2">Altos</p>
          <p className="text-3xl font-bold text-gray-900">{altos}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden z-0">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#F0FDF4] rounded-full -z-10" />
          <p className="text-xs font-semibold text-gray-500 mb-2">Tenor / Bass</p>
          <p className="text-3xl font-bold text-gray-900">{tenorBass}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex justify-start">
         <MemberSearch onFilter={handleFilterChange} />
      </div>

      {/* Main Content Area - Table List */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500 bg-white rounded-2xl border border-red-100">{error}</div>
      ) : sortedFiltered.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">No members found matching your criteria.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Table wrapper for horizontal scroll on small screens */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-4 w-12"></th>
                  <th
                    className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-4 cursor-pointer select-none hover:text-gray-600 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <span className="inline-flex items-center">
                      Member Name
                      <SortIcon columnKey="name" />
                    </span>
                  </th>
                  <th
                    className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-4 cursor-pointer select-none hover:text-gray-600 transition-colors"
                    onClick={() => handleSort('section')}
                  >
                    <span className="inline-flex items-center">
                      Section
                      <SortIcon columnKey="section" />
                    </span>
                  </th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-4">Status</th>
                  <th
                    className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-4 cursor-pointer select-none hover:text-gray-600 transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    <span className="inline-flex items-center">
                      Joined
                      <SortIcon columnKey="created_at" />
                    </span>
                  </th>
                  <th className="text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMembers.map((member, idx) => {
                  const initials = member.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?';
                  const joinDate = new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                  return (
                    <tr
                      key={member.id}
                      className={`group border-b border-gray-50 last:border-b-0 hover:bg-[#F8FAFF] transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                    >
                      {/* Avatar */}
                      <td className="px-6 py-3">
                        <div className="relative">
                          {member.photo_url ? (
                            <img src={member.photo_url} alt={member.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-100" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#1E293B] text-white flex items-center justify-center text-xs font-bold ring-2 ring-gray-100">
                              {initials}
                            </div>
                          )}
                          {/* Status dot on avatar */}
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${member.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                        </div>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3">
                        <Link href={`/members/${member.id}`} className="text-sm font-semibold text-gray-900 hover:text-[#2563EB] transition-colors">
                          {member.name}
                        </Link>
                      </td>

                      {/* Section Badge */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${sectionBadgeColors[member.section] || 'bg-gray-100 text-gray-600'}`}>
                          {member.section}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          member.is_active
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-red-50 text-red-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${member.is_active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                          {member.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500 font-medium">{joinDate}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingMember(member)}
                            className="p-2 rounded-lg text-gray-400 hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                            title="Edit member"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeletingMember(member)}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete member"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table footer with pagination */}
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left: showing count + page size selector */}
            <div className="flex items-center gap-4">
              <p className="text-xs text-gray-400 font-medium">
                Showing <span className="text-gray-600 font-semibold">{startIdx + 1}–{Math.min(startIdx + pageSize, totalFiltered)}</span> of <span className="text-gray-600 font-semibold">{totalFiltered}</span> members
              </p>
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] text-gray-400 font-medium">Rows:</label>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer"
                >
                  {PAGE_SIZE_OPTIONS.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right: page navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={safePage <= 1}
                className="px-2 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="First page"
              >
                First
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page numbers */}
              {(() => {
                const pages = [];
                let start = Math.max(1, safePage - 2);
                let end = Math.min(totalPages, start + 4);
                if (end - start < 4) start = Math.max(1, end - 4);

                for (let i = start; i <= end; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                        i === safePage
                          ? 'bg-[#2563EB] text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                      }`}
                    >
                      {i}
                    </button>
                  );
                }
                return pages;
              })()}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={safePage >= totalPages}
                className="px-2 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Last page"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Links */}
      <div className="flex items-center justify-between mt-12 mb-6 text-xs text-gray-400 font-medium px-2">
        <p>© 2024 ChoirManager Administration Console</p>
        <div className="flex items-center gap-6">
          <button className="hover:text-gray-600 transition-colors">Export CSV</button>
          <button className="hover:text-gray-600 transition-colors">Privacy Policy</button>
          <button className="hover:text-gray-600 transition-colors">Support</button>
        </div>
      </div>

      {/* Modals */}
      <AddMemberModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={handleAddSuccess}
      />

      <EditMemberModal 
        isOpen={!!editingMember} 
        onClose={() => setEditingMember(null)} 
        onSuccess={handleEditSuccess}
        member={editingMember}
      />

      <DeleteMemberModal 
        isOpen={!!deletingMember} 
        onClose={() => setDeletingMember(null)} 
        onSuccess={handleDeleteSuccess}
        member={deletingMember}
      />
    </>
  );
}
