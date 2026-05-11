'use client';

// Sidebar.jsx: Main navigation sidebar with role-based visibility, matching Figma design

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const ADMIN_NAV = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    label: 'Attendance',
    href: '/sessions',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    label: 'Members',
    href: '/members',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

const SUPER_ADMIN_NAV = [
  ...ADMIN_NAV,
  {
    label: 'Reports',
    href: '/reports',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    label: 'Weekly Report',
    href: '/reports/weekly',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/>
      </svg>
    ),
  },
  {
    label: 'Audit Logs',
    href: '/super-admin/audit-logs',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single();
          setProfile(data);
        }
      } catch {
        // Ignore errors silently
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const isSuperAdmin = profile?.role === 'super_admin';
  const navItems = isSuperAdmin ? SUPER_ADMIN_NAV : ADMIN_NAV;
  const roleLabel = isSuperAdmin ? 'Choir Management' : 'Attendance Officer';

  return (
    <aside className="w-[220px] h-screen bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0 z-30">
      {/* Brand */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5 mb-0.5">
          <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center text-white text-xs font-bold">
            CF
          </div>
          <span className="font-bold text-[#1E3A8A] text-base tracking-tight">ChoirFlow</span>
        </div>
        <p className="text-[11px] text-[#76767D] ml-[42px] -mt-0.5">{roleLabel}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          // For parent routes like /reports that have child pages, only match exact.
          // For all others, match the route prefix so /sessions/123/checkin highlights Attendance.
          const hasChildNav = navItems.some((other) => other.href !== item.href && other.href.startsWith(item.href + '/'));
          const isActive = hasChildNav
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-[#EFF6FF] text-[#2563EB]'
                  : 'text-[#64748B] hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={`transition-colors ${isActive ? 'text-[#2563EB]' : 'text-[#94A3B8] group-hover:text-gray-600'}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Settings link */}
      <div className="px-3 pb-2">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#64748B] hover:bg-gray-50 hover:text-gray-900 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[#94A3B8]">
            <circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
          Settings
        </Link>
      </div>

      {/* User profile */}
      <div className="px-4 py-4 border-t border-gray-100">
        {loading ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
            <div className="space-y-1.5">
              <div className="w-20 h-3 bg-gray-100 rounded animate-pulse" />
              <div className="w-12 h-2.5 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] text-xs font-bold">
              {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{profile?.full_name || 'User'}</p>
              <p className="text-[11px] text-[#76767D] capitalize">{profile?.role?.replace('_', ' ') || 'Admin'}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
