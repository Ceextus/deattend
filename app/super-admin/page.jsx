'use client';

// page.jsx: Super Admin hub — links to audit logs and disputes

import Link from 'next/link';

export default function SuperAdminPage() {
  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Super Admin</h1>
          <span className="text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] px-2.5 py-1 rounded-full">Super Admin</span>
        </div>
        <p className="text-sm text-[#76767D]">System management and oversight tools</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Link href="/super-admin/audit-logs" className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md hover:border-gray-200 transition-all group block">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB] mb-4 group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Audit Logs</h2>
          <p className="text-sm text-gray-500">Track all attendance modifications, overrides, and administrative actions.</p>
        </Link>

        <Link href="/super-admin/disputes" className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md hover:border-gray-200 transition-all group block">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4 group-hover:bg-amber-500 group-hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Disputes</h2>
          <p className="text-sm text-gray-500">Review and resolve attendance record disputes and override requests.</p>
        </Link>
      </div>
    </>
  );
}
