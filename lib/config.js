// config.js: Shared constants for the Choir Attendance system — no functions, just exports

/** Choir voice sections */
export const SECTIONS = ['Soprano', 'Alto', 'Tenor', 'Bass'];

/** Types of sessions that can be created */
export const SESSION_TYPES = ['Rehearsal', 'Service'];

/**
 * Punctuality threshold boundaries in minutes.
 * 0–10 min = Punctual, 10–30 min = Late, 30+ min = Very Late
 */
export const PUNCTUALITY_THRESHOLDS = {
  PUNCTUAL: 10,
  LATE: 30,
};

/** Minimum attendance percentage required for eligibility (when total sessions >= 3) */
export const ELIGIBILITY_MIN_PERCENT = 66;

/** Human-readable punctuality status labels */
export const PUNCTUALITY_STATUSES = {
  PUNCTUAL: 'Punctual',
  LATE: 'Late',
  VERY_LATE: 'Very Late',
};

/** Application user roles */
export const ROLES = {
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

/** Audit log action type constants */
export const AUDIT_ACTIONS = {
  UPDATE_ATTENDANCE: 'UPDATE_ATTENDANCE',
  DELETE_ATTENDANCE: 'DELETE_ATTENDANCE',
  OVERRIDE_STATUS: 'OVERRIDE_STATUS',
  ADJUST_TIMESTAMP: 'ADJUST_TIMESTAMP',
};
