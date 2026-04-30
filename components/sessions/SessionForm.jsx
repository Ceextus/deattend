'use client';

// SessionForm.jsx: Form for creating a new attendance session

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SESSION_TYPES } from '@/lib/config';
import { createSession } from '@/actions/sessions';

/**
 * Form for creating a new session with name, date, time, and type.
 */
export default function SessionForm() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [sessionType, setSessionType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const selectedDateTime = new Date(`${sessionDate}T${startTime}`);
    const now = new Date();
    
    if (selectedDateTime < now) {
      setError('Cannot create a session in the past. Please select a future date and time.');
      setLoading(false);
      return;
    }

    const result = await createSession({ name, sessionDate, startTime, sessionType });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push('/sessions');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg">
      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Session Name</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sunday Morning Service" required className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
            <input id="date" type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} required className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all" />
          </div>
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1.5">Start Time</label>
            <input id="time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all" />
          </div>
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1.5">Session Type</label>
          <select id="type" value={sessionType} onChange={(e) => setSessionType(e.target.value)} required className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all">
            <option value="">Select type</option>
            {SESSION_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-8">
        <button type="submit" disabled={loading} className="px-6 py-2.5 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-[#1E3A8A] transition-colors disabled:opacity-70 flex items-center gap-2">
          {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Create Session
        </button>
        <button type="button" onClick={() => router.back()} className="px-6 py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
