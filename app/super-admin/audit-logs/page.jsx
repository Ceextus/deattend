'use client';

// page.jsx: Audit Logs page — paginated table of all system audit events

import { useState, useEffect } from 'react';
import { getAuditLogs } from '@/actions/audit';
import { AUDIT_ACTIONS } from '@/lib/config';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const limit = 25;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error: fetchError } = await getAuditLogs({ limit, offset });
      if (fetchError) {
        setError(fetchError);
      } else {
        setLogs(data || []);
      }
      setLoading(false);
    }
    load();
  }, [offset]);

  const actionLabels = {
    [AUDIT_ACTIONS.UPDATE_ATTENDANCE]: { label: 'Update', color: 'bg-blue-50 text-[#2563EB]' },
    [AUDIT_ACTIONS.DELETE_ATTENDANCE]: { label: 'Delete', color: 'bg-red-50 text-red-600' },
    [AUDIT_ACTIONS.OVERRIDE_STATUS]: { label: 'Override', color: 'bg-amber-50 text-amber-600' },
    [AUDIT_ACTIONS.ADJUST_TIMESTAMP]: { label: 'Adjust Time', color: 'bg-purple-50 text-purple-600' },
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Audit Logs</h1>
        <p className="text-sm text-[#76767D] mt-0.5">Complete history of attendance modifications</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />)}</div>
        ) : error ? (
          <div className="p-6 text-center text-red-500 text-sm">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No audit logs found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Performed By</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Table</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Details</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const action = actionLabels[log.action_type] || { label: log.action_type, color: 'bg-gray-100 text-gray-600' };
                return (
                  <tr key={log.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${action.color}`}>{action.label}</span>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">{log.performed_by_name || 'System'}</td>
                    <td className="px-5 py-3 text-gray-500">{log.table_name}</td>
                    <td className="px-5 py-3 text-xs text-gray-400 max-w-[200px] truncate">
                      {log.new_value?.reason || log.new_value?.punctuality_status || log.target_record_id?.slice(0, 8) + '...'}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-400 text-xs">
                      {new Date(log.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-gray-400">Showing {offset + 1}–{offset + logs.length}</span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={logs.length < limit}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}
