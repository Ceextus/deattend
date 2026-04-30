"use client";

// CheckinList.jsx: Live list of checked-in members styled as a sidebar panel

import { formatTime, getPunctualityColor } from "@/lib/utils";
import { deleteAttendanceRecord } from "@/actions/attendance";
import { useState } from "react";

/**
 * Displays the real-time list of members who have checked in, formatted as the "Recent Check-ins" panel.
 */
export default function CheckinList({ attendanceList }) {
  const [undoingId, setUndoingId] = useState(null);

  const handleUndo = async () => {
    if (attendanceList.length === 0) return;
    const lastRecord = attendanceList[0]; // Assuming list is sorted newest first

    setUndoingId(lastRecord.id);
    await deleteAttendanceRecord(lastRecord.id);
    setUndoingId(null);
  };

  return (
    <div className="bg-white rounded-2xl p-6 h-full flex flex-col border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-gray-900 tracking-tight">
          Recent Check-ins
        </h2>
        <button
          onClick={handleUndo}
          disabled={attendanceList.length === 0 || undoingId !== null}
          className="text-xs font-semibold text-[#2563EB] hover:text-[#1E3A8A] disabled:opacity-50 transition-colors"
        >
          {undoingId ? "Undoing..." : "Undo Last"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {attendanceList.length === 0 ? (
          <div className="text-center py-10 opacity-60">
            <p className="text-sm text-gray-500">No recent check-ins.</p>
          </div>
        ) : (
          attendanceList.map((a, index) => {
            const status = a.punctuality_status;

            let borderColor = "border-amber-500";
            let iconBg = "bg-amber-50 text-amber-500";
            let icon = (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            );

            if (status === "Punctual") {
              borderColor = "border-green-500";
              iconBg = "bg-green-50 text-green-500";
              icon = (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              );
            } else if (status === "Absent") {
              borderColor = "border-red-500";
              iconBg = "bg-red-50 text-red-500";
              icon = (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              );
            } else if (status === "Excused") {
              borderColor = "border-purple-500";
              iconBg = "bg-purple-50 text-purple-500";
              icon = (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              );
            }

            return (
              <div
                key={a.id}
                className={`bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-50 border-l-4 ${borderColor} shadow-sm animate-fadeIn hover:bg-gray-50 transition-colors`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}
                >
                  {icon}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {a.member_name}
                  </p>
                  <p className="text-[10px] font-medium text-gray-500 flex items-center gap-1 mt-0.5">
                    {a.member_section} • {a.punctuality_status}
                  </p>
                </div>

                <div className="text-[10px] font-semibold text-gray-400 shrink-0">
                  {new Date(a.check_in_time).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
        <p className="text-[10px] font-medium text-gray-400">
          Auto-saving to Database
        </p>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          <span className="text-[10px] font-medium text-gray-500">Online</span>
        </div>
      </div>
    </div>
  );
}
