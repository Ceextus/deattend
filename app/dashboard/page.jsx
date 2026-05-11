'use client';

// page.jsx: Dashboard overview — shows Admin or Super Admin view based on user role

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardPage() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ totalMembers: 0, avgAttendance: 0, activeSessions: 0, thisMonth: 0 });
  const [recentSessions, setRecentSessions] = useState([]);
  const [sectionHealth, setSectionHealth] = useState([]);
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [recentAbsences, setRecentAbsences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Load profile
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();
        setProfile(prof);

        // Total active members
        const { count: memberCount } = await supabase
          .from('members')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true);

        // Active (open) sessions
        const { count: openSessions } = await supabase
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .eq('is_closed', false);

        // This month's sessions
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const { count: thisMonthCount } = await supabase
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .gte('session_date', monthStart);

        // Recent sessions
        const { data: sessions } = await supabase
          .from('sessions')
          .select('*')
          .order('session_date', { ascending: false })
          .limit(3);
        setRecentSessions(sessions || []);

        // All sessions + attendance for stats
        const { data: allSessions } = await supabase
          .from('sessions')
          .select('id, session_date')
          .order('session_date', { ascending: true });

        const { data: allAttendance } = await supabase
          .from('attendance')
          .select('member_id, session_id');

        // Section health: real attendance % per section
        const { data: allMembers } = await supabase
          .from('members')
          .select('id, section')
          .eq('is_active', true);

        const totalSessions = (allSessions || []).length;
        const attSet = new Set((allAttendance || []).map(a => `${a.member_id}_${a.session_id}`));

        const sections = ['Soprano', 'Alto', 'Tenor', 'Bass'];
        const health = sections.map((s) => {
          const sMembers = (allMembers || []).filter((m) => m.section === s);
          if (sMembers.length === 0 || totalSessions === 0) return { name: s, count: sMembers.length, pct: 0 };
          let totalAtt = 0;
          sMembers.forEach(m => {
            (allSessions || []).forEach(sess => {
              if (attSet.has(`${m.id}_${sess.id}`)) totalAtt++;
            });
          });
          const pct = Math.round((totalAtt / (sMembers.length * totalSessions)) * 100);
          return { name: s, count: sMembers.length, pct };
        });
        setSectionHealth(health);

        // Overall avg attendance
        const totalPossible = (allMembers || []).length * totalSessions;
        const avgAtt = totalPossible > 0 ? Math.round(((allAttendance || []).length / totalPossible) * 100) : 0;

        // Monthly trend (last 6 months)
        const trend = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const mStart = d.toISOString().split('T')[0];
          const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
          const mSessions = (allSessions || []).filter(s => s.session_date >= mStart && s.session_date <= mEnd);
          if (mSessions.length === 0) {
            trend.push({ month: d.toLocaleString('en-US', { month: 'short' }), attendance: 0 });
            continue;
          }
          const mSessionIds = new Set(mSessions.map(s => s.id));
          const mAtt = (allAttendance || []).filter(a => mSessionIds.has(a.session_id)).length;
          const mPossible = (allMembers || []).length * mSessions.length;
          trend.push({
            month: d.toLocaleString('en-US', { month: 'short' }),
            attendance: mPossible > 0 ? Math.round((mAtt / mPossible) * 100) : 0,
          });
        }
        setAttendanceTrend(trend);

        // Recent absences: members who missed the last closed session
        const lastClosed = (allSessions || []).filter(s => sessions?.find(rs => rs.id === s.id && rs.is_closed)).slice(-1)[0];
        if (lastClosed) {
          const attendedIds = new Set((allAttendance || []).filter(a => a.session_id === lastClosed.id).map(a => a.member_id));
          const absent = (allMembers || []).filter(m => !attendedIds.has(m.id)).slice(0, 5);
          const lastSession = sessions?.find(s => s.id === lastClosed.id);
          setRecentAbsences(absent.map(m => ({ name: m.id, memberName: 'Unknown', section: m.section, reason: `Missed ${lastSession?.name || 'session'}` })));
          // Get names
          if (absent.length > 0) {
            const { data: absentMembers } = await supabase.from('members').select('id, name, section').in('id', absent.map(a => a.id));
            if (absentMembers) {
              setRecentAbsences(absentMembers.slice(0, 5).map(m => ({ name: m.name, section: m.section, reason: `Missed ${lastSession?.name || 'session'}` })));
            }
          }
        }

        setStats({
          totalMembers: memberCount || 0,
          avgAttendance: avgAtt,
          activeSessions: openSessions || 0,
          thisMonth: thisMonthCount || 0,
        });
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const isSuperAdmin = profile?.role === 'super_admin';
  const firstName = profile?.full_name?.split(' ')[0] || '';

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-4 gap-5">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white rounded-xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 h-64 bg-white rounded-xl" />
          <div className="h-64 bg-white rounded-xl" />
        </div>
      </div>
    );
  }

  return isSuperAdmin ? (
    <SuperAdminView stats={stats} sectionHealth={sectionHealth} attendanceTrend={attendanceTrend} />
  ) : (
    <AdminView firstName={firstName} stats={stats} recentSessions={recentSessions} sectionHealth={sectionHealth} recentAbsences={recentAbsences} />
  );
}

/* ─────────────────────────────────────────────
   SUPER ADMIN DASHBOARD VIEW
   ───────────────────────────────────────────── */
function SuperAdminView({ stats, sectionHealth, attendanceTrend }) {
  const attendanceData = attendanceTrend;

  // Colors for the pie chart
  const COLORS = ['#2563EB', '#8B5CF6', '#F59E0B', '#10B981'];

  return (
    <>
      <Header
        title={
          <span className="flex items-center gap-3">
            Super Admin Dashboard
            <span className="text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] px-2.5 py-1 rounded-full border border-blue-100">Super Admin</span>
          </span>
        }
        subtitle="System-wide overview, insights, and management."
      />

      {/* Action buttons */}
      <div className="flex justify-end gap-3 -mt-4 mb-8">
        <Link href="/reports" className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 shadow-sm text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-50 hover:shadow transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export Data
        </Link>
        <Link href="/members/new" className="flex items-center gap-2 px-5 py-2.5 bg-[#1E3A8A] shadow-md shadow-[#1E3A8A]/20 text-white text-sm font-medium rounded-xl hover:bg-[#172554] hover:shadow-lg transition-all transform hover:-translate-y-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Member
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard icon="users" label="Total Members" value={stats.totalMembers.toLocaleString()} change="+12%" positive />
        <StatCard icon="chart" label="Avg. Attendance" value={`${stats.avgAttendance}%`} change="+5%" positive />
        <StatCard icon="sessions" label="Active Sessions" value={stats.activeSessions} change="— 0%" />
        <StatCard icon="calendar" label="This Month" value={stats.thisMonth} />
      </div>

      {/* Two-column layout with charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Attendance Trends */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Attendance Trends</h2>
              <p className="text-sm text-gray-500">6-month participation overview</p>
            </div>
            <select className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all cursor-pointer hover:bg-gray-100">
              <option>Last 6 Months</option>
              <option>Last 3 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#1E3A8A', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="attendance" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorAttendance)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Section Health */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow flex flex-col">
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Section Distribution</h2>
            <p className="text-sm text-gray-500 mb-6">Active member breakdown</p>
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="h-[180px] w-full flex justify-center mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectionHealth}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    stroke="none"
                  >
                    {sectionHealth.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#374151', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="w-full grid grid-cols-2 gap-x-4 gap-y-3">
              {sectionHealth.map((section, index) => (
                <div key={section.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-700">{section.name}</p>
                    <p className="text-[10px] text-gray-400">{section.count} Members</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   ADMIN (ATTENDANCE OFFICER) DASHBOARD VIEW
   ───────────────────────────────────────────── */
function AdminView({ firstName, stats, recentSessions, sectionHealth, recentAbsences }) {
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back, {firstName}</h1>
          <p className="text-sm text-[#76767D] mt-0.5">Here is your attendance overview for today.</p>
        </div>
        <Link
          href="/sessions/new"
          className="flex items-center justify-center gap-2 px-6 py-3 bg-[#1E3A8A] text-white text-sm font-medium rounded-xl shadow-md shadow-[#1E3A8A]/20 hover:bg-[#172554] hover:shadow-lg transition-all transform hover:-translate-y-0.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
          </svg>
          Take Attendance Now
        </Link>
      </div>

      {/* Today's Session + Overall Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Upcoming Session Card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] text-white rounded-2xl shadow-md p-8 relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 rounded-full bg-white opacity-5 mix-blend-overlay"></div>
          <div className="absolute bottom-0 right-20 -mb-10 w-24 h-24 rounded-full bg-white opacity-10 mix-blend-overlay"></div>
          
          {recentSessions.length > 0 ? (
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-bold text-blue-100 uppercase tracking-widest">
                  {recentSessions[0].is_closed ? 'Last Session' : 'Upcoming Today'}
                </span>
              </div>
              <h2 className="text-3xl font-extrabold mb-3 tracking-tight">{recentSessions[0].name}</h2>
              <div className="flex items-center gap-2 text-sm text-blue-100 mb-8 font-medium bg-white/10 w-fit px-4 py-2 rounded-lg backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {recentSessions[0].start_time} - {recentSessions[0].session_type}
              </div>
              <div className="flex gap-4">
                <Link
                  href={`/sessions/${recentSessions[0].id}/checkin`}
                  className="px-6 py-3 bg-white text-[#1E3A8A] text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Start Session
                </Link>
                <button className="px-6 py-3 bg-white/10 text-white border border-white/20 text-sm font-medium rounded-xl hover:bg-white/20 transition-colors backdrop-blur-sm">
                  Mark All Present
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 relative z-10">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white opacity-80"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <p className="text-base text-blue-100 font-medium">No sessions found. Create one to get started.</p>
            </div>
          )}
        </div>

        {/* Overall Attendance */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-1">Overall Attendance</h3>
            <p className="text-xs text-gray-500 mb-6">Last 30 Days Performance</p>
            <div className="flex items-baseline gap-2 mb-8 bg-[#F8FAFC] p-4 rounded-xl border border-gray-50">
              <span className="text-4xl font-black text-[#1E3A8A]">{stats.avgAttendance}%</span>
              <span className="text-sm font-bold text-green-500 flex items-center bg-green-50 px-2 py-0.5 rounded-md"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> +2.4%</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Section bars */}
            {sectionHealth.slice(0, 2).map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-gray-600">{s.name}</span>
                  <span className="text-gray-900">{s.pct}%</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] rounded-full transition-all" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Absences */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Recent Absences to Review</h2>
          <Link href="/reports" className="text-sm font-semibold text-[#2563EB] hover:text-[#1E3A8A] transition-colors flex items-center gap-1">
            View All Report <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentAbsences.length > 0 ? (
            recentAbsences.map((a, i) => (
              <AbsenceRow key={i} name={a.name} section={a.section} reason={a.reason} />
            ))
          ) : (
            <p className="text-sm text-gray-400 py-6 text-center">No recent absences to review.</p>
          )}
        </div>
      </div>
    </>
  );
}

/* ─────── Shared Sub-Components ─────── */

function StatCard({ icon, label, value, change, positive, negative }) {
  const icons = {
    users: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
    chart: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
    sessions: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    calendar: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>,
  };

  const iconStyles = {
    users: 'bg-blue-50 text-[#2563EB] border-blue-100',
    chart: 'bg-purple-50 text-purple-600 border-purple-100',
    sessions: 'bg-green-50 text-green-600 border-green-100',
    calendar: 'bg-orange-50 text-orange-500 border-orange-100',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${iconStyles[icon]}`}>
          {icons[icon]}
        </div>
        {change && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${positive ? 'bg-green-50 text-green-600' : negative ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'}`}>
            {positive && (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            )}
            {negative && (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
            )}
            {change}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-black text-gray-900 tracking-tight">{value}</p>
    </div>
  );
}

function AbsenceRow({ name, section, reason }) {
  const sectionColors = {
    Soprano: 'bg-[#EFF6FF] text-[#2563EB]',
    Alto: 'bg-purple-50 text-purple-600',
    Tenor: 'bg-amber-50 text-amber-600',
    Bass: 'bg-green-50 text-green-600',
  };

  return (
    <div className="flex items-center justify-between py-4 group hover:bg-gray-50 px-2 rounded-xl transition-colors -mx-2">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold shadow-inner">
          {name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${sectionColors[section] || 'bg-gray-100 text-gray-600'}`}>{section}</span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {reason}
            </span>
          </div>
        </div>
      </div>
      <button className="px-4 py-2 text-xs font-bold text-[#2563EB] bg-[#EFF6FF] rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#2563EB] hover:text-white transition-all">
        Mark Excused
      </button>
    </div>
  );
}
