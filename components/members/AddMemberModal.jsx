import { X } from 'lucide-react';
import MemberForm from './MemberForm';

export default function AddMemberModal({ isOpen, onClose, onSuccess }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add New Member</h2>
            <p className="text-xs text-slate-500 mt-0.5">Add a new choir member to the system</p>
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
          <MemberForm onSuccess={onSuccess} onCancel={onClose} />
        </div>
      </div>
    </div>
  );
}
