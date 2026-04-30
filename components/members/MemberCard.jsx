'use client';

// MemberCard.jsx: Card displaying a single member with avatar, section badge, and actions

import Link from 'next/link';

const sectionColors = {
  Soprano: 'bg-[#EFF6FF] text-[#2563EB]',
  Alto: 'bg-purple-50 text-purple-600',
  Tenor: 'bg-amber-50 text-amber-600',
  Bass: 'bg-green-50 text-green-600',
};

/**
 * Displays a member's name, section, active status, and links to their profile.
 */
export default function MemberCard({ member }) {
  const initials = member.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2) || '?';

  return (
    <Link
      href={`/members/${member.id}`}
      className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all group block"
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        {member.photo_url ? (
          <img
            src={member.photo_url}
            alt={member.name}
            className="w-11 h-11 rounded-full object-cover"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] text-sm font-bold group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sectionColors[member.section] || 'bg-gray-100 text-gray-600'}`}>
              {member.section}
            </span>
            {!member.is_active && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                Inactive
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 group-hover:text-[#2563EB] transition-colors">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </Link>
  );
}
