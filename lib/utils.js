// utils.js: Pure utility functions — no Supabase imports

import {
  PUNCTUALITY_THRESHOLDS,
  PUNCTUALITY_STATUSES,
  ELIGIBILITY_MIN_PERCENT,
  SECTIONS,
} from './config';

/**
 * Formats a date string into a readable format e.g. "Mon, 21 Apr 2025"
 * @param {string} dateString - ISO date string or date-only string like "2025-04-21"
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Converts a 24hr time string "14:30:00" to "2:30 PM"
 * @param {string} timeString - Time in HH:MM:SS or HH:MM format
 * @returns {string} Formatted 12-hour time string
 */
export function formatTime(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Calculates the number of minutes a member arrived late.
 * Returns 0 if the member arrived early or on time.
 * @param {string} checkInTime - ISO timestamp of check-in e.g. "2025-04-21T14:45:00Z"
 * @param {string} sessionDate - Date string e.g. "2025-04-21"
 * @param {string} sessionStartTime - Time string e.g. "14:30:00"
 * @returns {number} Delay in minutes (integer, minimum 0)
 */
export function calcDelayMinutes(checkInTime, sessionDate, sessionStartTime) {
  const checkIn = new Date(checkInTime);
  const sessionStart = new Date(`${sessionDate}T${sessionStartTime}`);
  const diffMs = checkIn - sessionStart;
  const diffMinutes = Math.floor(diffMs / 60000);
  return Math.max(0, diffMinutes);
}

/**
 * Determines punctuality status based on delay in minutes.
 * Uses PUNCTUALITY_THRESHOLDS from config: 0-10 = Punctual, 10-30 = Late, 30+ = Very Late
 * @param {number} delayMinutes - Number of minutes late
 * @returns {string} 'Punctual', 'Late', or 'Very Late'
 */
export function getPunctualityStatus(delayMinutes) {
  if (delayMinutes <= PUNCTUALITY_THRESHOLDS.PUNCTUAL) {
    return PUNCTUALITY_STATUSES.PUNCTUAL;
  }
  if (delayMinutes <= PUNCTUALITY_THRESHOLDS.LATE) {
    return PUNCTUALITY_STATUSES.LATE;
  }
  return PUNCTUALITY_STATUSES.VERY_LATE;
}

/**
 * Returns a Tailwind text color class for a given punctuality status.
 * Punctual → green, Late → amber, Very Late → red
 * @param {string} status - 'Punctual', 'Late', or 'Very Late'
 * @returns {string} Tailwind CSS text color class
 */
export function getPunctualityColor(status) {
  switch (status) {
    case PUNCTUALITY_STATUSES.PUNCTUAL:
      return 'text-green-600';
    case PUNCTUALITY_STATUSES.LATE:
      return 'text-amber-500';
    case PUNCTUALITY_STATUSES.VERY_LATE:
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

/**
 * Calculates attendance percentage, rounded to one decimal place.
 * Returns 100 if total is 0 (no sessions means full attendance by default).
 * @param {number} attended - Number of sessions attended
 * @param {number} total - Total number of sessions
 * @returns {number} Attendance percentage
 */
export function calcAttendancePct(attended, total) {
  if (total === 0) return 100;
  return Math.round((attended / total) * 1000) / 10;
}

/**
 * Determines if a member is eligible based on attendance percentage and total sessions.
 * Edge case rules:
 *   total = 0 → always eligible
 *   total = 1 → must have attended >= 1
 *   total = 2 → must have attended >= 2
 *   total >= 3 → attendance percentage must be >= ELIGIBILITY_MIN_PERCENT (66%)
 * @param {number} attendancePct - Attendance percentage (0-100)
 * @param {number} totalSessions - Total number of sessions in the period
 * @param {number} [attended] - Sessions attended (needed for total 1 or 2 edge cases)
 * @returns {boolean} Whether the member is eligible
 */
export function isEligible(attendancePct, totalSessions, attended = 0) {
  if (totalSessions === 0) return true;
  if (totalSessions === 1) return attended >= 1;
  if (totalSessions === 2) return attended >= 2;
  return attendancePct >= ELIGIBILITY_MIN_PERCENT;
}

/**
 * Groups an array of member objects by their section property.
 * Returns an object with section names as keys and arrays of members as values.
 * Always includes all four sections, even if empty.
 * @param {Array} members - Array of member objects with a `section` property
 * @returns {Object} Members grouped by section
 */
export function groupBySection(members) {
  const grouped = {};
  SECTIONS.forEach((section) => {
    grouped[section] = [];
  });
  members.forEach((member) => {
    if (grouped[member.section]) {
      grouped[member.section].push(member);
    }
  });
  return grouped;
}

/**
 * Truncates a name to the specified max length, adding ellipsis if needed.
 * @param {string} name - The name to truncate
 * @param {number} [maxLength=20] - Maximum length before truncation
 * @returns {string} Truncated name with ellipsis, or original if short enough
 */
export function truncateName(name, maxLength = 20) {
  if (!name) return '';
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 1).trimEnd() + '…';
}
