'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { deleteMember } from '@/actions/members';

export default function DeleteMemberModal({ isOpen, onClose, onSuccess, member }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !member) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await deleteMember(member.id);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      onSuccess();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-50 bg-red-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Delete Member</h2>
              <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <p className="text-sm text-slate-600 leading-relaxed">
            Are you sure you want to permanently delete <span className="font-bold text-slate-900">{member.name}</span> from the choir roster? 
            All associated attendance records may also be affected.
          </p>

          {/* Member preview card */}
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-4">
            {member.photo_url ? (
              <img src={member.photo_url} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#1E293B] text-white flex items-center justify-center text-xs font-bold">
                {member.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-slate-900">{member.name}</p>
              <p className="text-xs text-slate-500">{member.section}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 bg-white border border-slate-200 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-6 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Delete Member
          </button>
        </div>
      </div>
    </div>
  );
}
