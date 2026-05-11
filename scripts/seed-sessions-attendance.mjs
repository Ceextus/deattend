/**
 * seed-sessions-attendance.mjs
 * -----------------------------------------------------------------
 * Seeds 8 weeks of rehearsal sessions (Tue/Thu/Sat) and randomized
 * attendance records for all active members.
 *
 * Usage:  node --env-file=.env.local scripts/seed-sessions-attendance.mjs
 * -----------------------------------------------------------------
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing env vars. Run with:\n    node --env-file=.env.local scripts/seed-sessions-attendance.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Returns a date string YYYY-MM-DD offset by `days` from `base` */
function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** Get the Monday of the week containing `date` */
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d;
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function seed() {
  console.log('\n🎵  Comprehensive attendance seeder\n');

  // 1. Fetch a profile to use as created_by / checked_in_by
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  if (profErr || !profiles?.length) {
    console.error('❌  No profiles found. Create at least one admin user first.');
    console.error('    Error:', profErr?.message);
    process.exit(1);
  }
  const adminId = profiles[0].id;
  console.log(`   Using admin profile: ${adminId}\n`);

  // 2. Fetch all active members
  const { data: members, error: memErr } = await supabase
    .from('members')
    .select('id, name')
    .eq('is_active', true);

  if (memErr) {
    console.error('❌  Failed to fetch members:', memErr.message);
    process.exit(1);
  }
  console.log(`   Found ${members.length} active members\n`);

  // 3. Delete existing seeded sessions & attendance to avoid conflicts
  //    (only delete sessions created by this admin to be safe)
  console.log('   Cleaning up existing sessions & attendance...');
  const { data: existingSessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('created_by', adminId);

  if (existingSessions?.length) {
    const existingIds = existingSessions.map(s => s.id);
    // Delete attendance for these sessions first
    await supabase.from('attendance').delete().in('session_id', existingIds);
    // Delete the sessions
    await supabase.from('sessions').delete().in('id', existingIds);
    console.log(`   Deleted ${existingIds.length} existing sessions\n`);
  }

  // 4. Generate 8 weeks of sessions (Tue, Thu, Sat rehearsals)
  //    Starting from 8 weeks ago up to the current week
  const today = new Date();
  const currentMonday = getMonday(today);
  const startMonday = new Date(currentMonday);
  startMonday.setDate(startMonday.getDate() - 7 * 7); // 8 weeks total (7 weeks back + current)

  const sessionRows = [];
  const rehearsalTimes = ['18:00:00', '18:30:00', '09:00:00']; // Tue evening, Thu evening, Sat morning
  const dayOffsets = [1, 3, 5]; // Tue=+1, Thu=+3, Sat=+5 from Monday
  const dayNames = ['Tuesday', 'Thursday', 'Saturday'];

  for (let week = 0; week < 8; week++) {
    const weekMonday = new Date(startMonday);
    weekMonday.setDate(weekMonday.getDate() + week * 7);

    for (let i = 0; i < 3; i++) {
      const sessionDate = addDays(weekMonday, dayOffsets[i]);
      // Skip future dates
      if (new Date(sessionDate) > today) continue;

      const weekNum = week + 1;
      sessionRows.push({
        name: `${dayNames[i]} Rehearsal — Week ${weekNum}`,
        session_date: sessionDate,
        start_time: rehearsalTimes[i],
        session_type: 'Rehearsal',
        is_closed: true, // Mark all as closed so they count for eligibility
        created_by: adminId,
      });
    }
  }

  // Also add 2 Service sessions for variety
  if (sessionRows.length > 4) {
    const svc1Date = sessionRows[6]?.session_date || sessionRows[3]?.session_date;
    const svc2Date = sessionRows[sessionRows.length - 3]?.session_date;
    if (svc1Date) {
      sessionRows.push({
        name: 'Sunday Service — Special',
        session_date: addDays(new Date(svc1Date), 1), // Sunday after
        start_time: '08:00:00',
        session_type: 'Service',
        is_closed: true,
        created_by: adminId,
      });
    }
    if (svc2Date) {
      sessionRows.push({
        name: 'Sunday Worship Service',
        session_date: addDays(new Date(svc2Date), 1),
        start_time: '08:30:00',
        session_type: 'Service',
        is_closed: true,
        created_by: adminId,
      });
    }
  }

  console.log(`   Creating ${sessionRows.length} sessions...\n`);

  const { data: createdSessions, error: sessErr } = await supabase
    .from('sessions')
    .insert(sessionRows)
    .select('id, name, session_date, start_time, session_type');

  if (sessErr) {
    console.error('❌  Failed to create sessions:', sessErr.message);
    process.exit(1);
  }

  console.log(`   ✅ Created ${createdSessions.length} sessions\n`);

  // 5. Generate attendance records
  //    Strategy: For each session, ~65-85% of members attend
  //    Of those who attend:
  //      ~55% Punctual (0-8 min delay)
  //      ~25% Late (11-25 min delay)
  //      ~20% Very Late (31-60 min delay)
  //    Some members are "reliable" (90%+ attendance), some are "flaky" (30-50%)

  // Assign personality profiles to members
  const memberProfiles = members.map((m) => {
    const roll = Math.random();
    let attendanceRate;
    if (roll < 0.3) attendanceRate = 0.90 + Math.random() * 0.10;      // 30% are very reliable (90-100%)
    else if (roll < 0.6) attendanceRate = 0.70 + Math.random() * 0.15;  // 30% are good (70-85%)
    else if (roll < 0.85) attendanceRate = 0.45 + Math.random() * 0.20; // 25% are mediocre (45-65%)
    else attendanceRate = 0.20 + Math.random() * 0.20;                  // 15% are flaky (20-40%)

    // Punctuality tendency
    const punctualRoll = Math.random();
    let punctualRate;
    if (punctualRoll < 0.4) punctualRate = 0.80;  // usually punctual
    else if (punctualRoll < 0.7) punctualRate = 0.55; // mixed
    else punctualRate = 0.30; // often late

    return { ...m, attendanceRate, punctualRate };
  });

  const attendanceRows = [];

  for (const session of createdSessions) {
    const sessionStart = new Date(`${session.session_date}T${session.start_time}`);

    for (const member of memberProfiles) {
      // Decide if this member attends
      if (Math.random() > member.attendanceRate) continue; // absent

      // Decide punctuality
      let delayMinutes, status;
      const pRoll = Math.random();

      if (pRoll < member.punctualRate) {
        // Punctual: 0-8 minutes
        delayMinutes = randomInt(0, 8);
        status = 'Punctual';
      } else if (pRoll < member.punctualRate + 0.25) {
        // Late: 11-28 minutes
        delayMinutes = randomInt(11, 28);
        status = 'Late';
      } else {
        // Very Late: 31-60 minutes
        delayMinutes = randomInt(31, 60);
        status = 'Very Late';
      }

      const checkInTime = new Date(sessionStart.getTime() + delayMinutes * 60000);

      attendanceRows.push({
        member_id: member.id,
        session_id: session.id,
        checked_in_by: adminId,
        check_in_time: checkInTime.toISOString(),
        delay_minutes: delayMinutes,
        punctuality_status: status,
      });
    }
  }

  console.log(`   Inserting ${attendanceRows.length} attendance records...\n`);

  // Insert in batches of 500 to avoid payload limits
  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < attendanceRows.length; i += BATCH_SIZE) {
    const batch = attendanceRows.slice(i, i + BATCH_SIZE);
    const { error: attErr } = await supabase.from('attendance').insert(batch);
    if (attErr) {
      console.error(`❌  Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, attErr.message);
      process.exit(1);
    }
    inserted += batch.length;
    process.stdout.write(`   Inserted ${inserted}/${attendanceRows.length}\r`);
  }

  console.log(`\n\n✅  Seeding complete!\n`);

  // Summary
  const rehearsals = createdSessions.filter(s => s.session_type === 'Rehearsal').length;
  const services = createdSessions.filter(s => s.session_type === 'Service').length;
  const punctualCount = attendanceRows.filter(a => a.punctuality_status === 'Punctual').length;
  const lateCount = attendanceRows.filter(a => a.punctuality_status === 'Late').length;
  const veryLateCount = attendanceRows.filter(a => a.punctuality_status === 'Very Late').length;
  const absentTotal = createdSessions.length * members.length - attendanceRows.length;

  console.log('   📊 Summary:');
  console.log(`     Sessions:     ${createdSessions.length} (${rehearsals} rehearsals, ${services} services)`);
  console.log(`     Members:      ${members.length}`);
  console.log(`     Attendance:   ${attendanceRows.length} check-ins`);
  console.log(`     Absent:       ${absentTotal} absences`);
  console.log(`     Late:         ${lateCount} (${Math.round(lateCount / attendanceRows.length * 100)}%)`);
  console.log(`     Very Late:    ${veryLateCount} (${Math.round(veryLateCount / attendanceRows.length * 100)}%)\n`);
}

seed().catch((err) => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
