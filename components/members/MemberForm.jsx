'use client';

// MemberForm.jsx: Form for creating or editing a choir member with photo upload

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SECTIONS } from '@/lib/config';
import { createMember, updateMember, uploadMemberPhoto } from '@/actions/members';

/**
 * Reusable form for creating or editing a member, with photo upload via Supabase Storage.
 * @param {Object} props
 * @param {Object} [props.member] - Existing member data for edit mode
 * @param {Function} [props.onSuccess] - Callback when form submission is successful
 * @param {Function} [props.onCancel] - Callback when form is cancelled
 */
export default function MemberForm({ member, onSuccess, onCancel }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const isEditing = !!member;

  const [name, setName] = useState(member?.name || '');
  const [section, setSection] = useState(member?.section || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(member?.photo_url || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }

    setPhotoFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Step 1: Create or update the member
      const result = isEditing
        ? await updateMember(member.id, { name, section })
        : await createMember({ name, section });

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      const memberId = isEditing ? member.id : result.data.id;

      // Step 2: Upload photo if one was selected
      if (photoFile) {
        const uploadResult = await uploadMemberPhoto(memberId, photoFile);
        if (uploadResult.error) {
          // Member was created but photo failed — warn but don't block
          console.warn('Photo upload failed:', uploadResult.error);
        }
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/members');
        router.refresh();
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  const initials = name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2) || '?';

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">Profile Photo</label>
          <div className="flex items-center gap-5">
            {/* Preview */}
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-20 h-20 rounded-full object-cover border-2 border-slate-100 shadow-sm"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xl font-bold border-2 border-dashed border-slate-300">
                {initials}
              </div>
            )}

            {/* Upload button */}
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 bg-white border border-slate-200 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
              >
                {photoPreview ? 'Change Photo' : 'Upload Photo'}
              </button>
              <p className="text-xs text-slate-400 mt-2">JPG, PNG or WebP. Max 5MB.</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Adaeze Okafor"
            required
            className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Section */}
        <div>
          <label htmlFor="section" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Voice Section
          </label>
          <select
            id="section"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            required
            className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
          >
            <option value="">Select a section</option>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={handleCancel}
          className="px-5 py-2.5 bg-white border border-slate-200 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-[#0F172A] text-white text-sm font-medium rounded-xl hover:bg-[#1E293B] transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {isEditing ? 'Save Changes' : 'Add Member'}
        </button>
      </div>
    </form>
  );
}
