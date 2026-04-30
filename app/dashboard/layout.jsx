// layout.jsx: Dashboard layout with sidebar navigation and header for authenticated users

import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Sidebar />
      <main className="ml-[220px] p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
