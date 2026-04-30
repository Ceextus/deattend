// layout.jsx: Members section layout — shares sidebar with dashboard
import Sidebar from '@/components/layout/Sidebar';

export default function MembersLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Sidebar />
      <main className="ml-[220px] p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
