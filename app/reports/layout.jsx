// layout.jsx: Reports section layout
import Sidebar from '@/components/layout/Sidebar';

export default function ReportsLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Sidebar />
      <main className="md:ml-[220px] pt-20 p-4 md:p-8 min-h-screen">{children}</main>
    </div>
  );
}
