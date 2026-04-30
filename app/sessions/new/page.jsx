// page.jsx: New session creation page
import SessionForm from '@/components/sessions/SessionForm';

export default function NewSessionPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create New Session</h1>
        <p className="text-sm text-[#76767D] mt-0.5">Schedule a rehearsal or service for attendance tracking.</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-8">
        <SessionForm />
      </div>
    </>
  );
}
