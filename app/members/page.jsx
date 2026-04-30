'use client';

// page.jsx: Members list page with search, section filter, edit/delete modals

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import useMembers from '@/hooks/useMembers';
import MemberSearch from '@/components/members/MemberSearch';
import AddMemberModal from '@/components/members/AddMemberModal';
import EditMemberModal from '@/components/members/EditMemberModal';
import DeleteMemberModal from '@/components/members/DeleteMemberModal';
import { Filter, MoreVertical, Pencil, Trash2, Plus } from 'lucide-react';

const sectionBadgeColors = {
  Soprano: 'bg-[#EFF6FF] text-[#2563EB]',
  Alto: 'bg-[#F0FDFA] text-[#0D9488]',
  Tenor: 'bg-[#FAF5FF] text-[#9333EA]',
  Bass: 'bg-[#F1F5F9] text-[#475569]',
};

// --- Dropdown menu for each card ---
function ActionsDropdown({ member, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="absolute top-4 right-4 z-10" ref={ref}>
      <button
        onClick={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
        className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <MoreVertical size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl border border-slate-100 shadow-lg py-1 z-20 animate-in fade-in slide-in-from-top-1">
          <button
            onClick={() => { setOpen(false); onEdit(member); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Pencil size={15} className="text-slate-400" />
            Edit Member
          </button>
          <button
            onClick={() => { setOpen(false); onDelete(member); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={15} className="text-red-400" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function MembersPage() {
  const { members, loading, error, refetch } = useMembers({ isActive: true });
  const [filter, setFilter] = useState({ search: '', section: '' });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);

  // Client-side filtering
  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch = !filter.search || m.name.toLowerCase().includes(filter.search.toLowerCase());
      const matchesSection = !filter.section || m.section === filter.section;
      return matchesSearch && matchesSection;
    });
  }, [members, filter]);

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
               onChange={(e) => setFilter(prev => ({...prev, section: e.target.value}))}
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

      {/* Search Bar - Keeping it here above the grid */}
      <div className="mb-6 flex justify-center lg:hidden">
         <MemberSearch onFilter={setFilter} />
      </div>

      {/* Main Content Area - Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500 bg-white rounded-2xl border border-red-100">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">No members found matching your criteria.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map(member => {
            const initials = member.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?';
            const joinDate = new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            
            // Status dot color
            const dotColor = member.is_active ? 'bg-green-500' : 'bg-red-500';

            return (
              <div key={member.id} className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col items-center hover:shadow-md transition-shadow group">
                
                <ActionsDropdown 
                  member={member} 
                  onEdit={setEditingMember}
                  onDelete={setDeletingMember}
                />

                {/* Avatar */}
                <div className="relative mb-4 mt-2">
                  {member.photo_url ? (
                    <img src={member.photo_url} alt={member.name} className="w-20 h-20 rounded-full object-cover shadow-sm ring-4 ring-gray-50" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#1E293B] text-white flex items-center justify-center text-xl font-bold shadow-sm ring-4 ring-gray-50">
                      {initials}
                    </div>
                  )}
                  {/* Status Dot */}
                  <div className={`absolute bottom-0 right-1 w-4 h-4 rounded-full border-2 border-white ${dotColor}`} />
                </div>

                {/* Info */}
                <Link href={`/members/${member.id}`} className="text-base font-bold text-gray-900 hover:text-[#2563EB] transition-colors mb-1 text-center line-clamp-1">
                  {member.name}
                </Link>
                
                <p className="text-[11px] font-medium text-gray-400 mb-5">
                  Joined {joinDate}
                </p>

                {/* Badge */}
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${sectionBadgeColors[member.section] || 'bg-gray-100 text-gray-600'}`}>
                  {member.section}
                </div>
              </div>
            );
          })}
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

export default function MembersPage() {
  const { members, loading, error, refetch } = useMembers({ isActive: true });
  const [filter, setFilter] = useState({ search: '', section: '' });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);

  // Client-side filtering
  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch = !filter.search || m.name.toLowerCase().includes(filter.search.toLowerCase());
      const matchesSection = !filter.section || m.section === filter.section;
      return matchesSearch && matchesSection;
    });
  }, [members, filter]);

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
               onChange={(e) => setFilter(prev => ({...prev, section: e.target.value}))}
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
         <MemberSearch onFilter={setFilter} />
      </div>

      {/* Main Content Area - Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500 bg-white rounded-2xl border border-red-100">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">No members found matching your criteria.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map(member => {
            const initials = member.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?';
            const joinDate = new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            
            // Status dot color
            const dotColor = member.is_active ? 'bg-green-500' : 'bg-red-500';

            return (
              <div key={member.id} className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col items-center hover:shadow-md transition-shadow group">
                
                <ActionsDropdown 
                  member={member} 
                  onEdit={setEditingMember}
                  onDelete={setDeletingMember}
                />

                {/* Avatar */}
                <div className="relative mb-4 mt-2">
                  {member.photo_url ? (
                    <img src={member.photo_url} alt={member.name} className="w-20 h-20 rounded-full object-cover shadow-sm ring-4 ring-gray-50" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#1E293B] text-white flex items-center justify-center text-xl font-bold shadow-sm ring-4 ring-gray-50">
                      {initials}
                    </div>
                  )}
                  {/* Status Dot */}
                  <div className={`absolute bottom-0 right-1 w-4 h-4 rounded-full border-2 border-white ${dotColor}`} />
                </div>

                {/* Info */}
                <Link href={`/members/${member.id}`} className="text-base font-bold text-gray-900 hover:text-[#2563EB] transition-colors mb-1 text-center line-clamp-1">
                  {member.name}
                </Link>
                
                <p className="text-[11px] font-medium text-gray-400 mb-5">
                  Joined {joinDate}
                </p>

                {/* Badge */}
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${sectionBadgeColors[member.section] || 'bg-gray-100 text-gray-600'}`}>
                  {member.section}
                </div>
              </div>
            );
          })}
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
