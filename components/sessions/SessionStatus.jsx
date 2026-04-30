'use client';

// SessionStatus.jsx: Badge showing Open / Closed status for a session

/**
 * Renders a small status badge for a session.
 * @param {Object} props
 * @param {boolean} props.isClosed - Whether the session is closed
 */
export default function SessionStatus({ isClosed }) {
  return isClosed ? (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      Closed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-600">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      Open
    </span>
  );
}
