/**
 * seed-members.mjs
 * -----------------------------------------------------------------
 * Seeds 75 realistic choir members into the Supabase `members` table.
 * Uses the service role key to bypass RLS.
 *
 * Usage:  node scripts/seed-members.mjs
 * -----------------------------------------------------------------
 */

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Config — reads from .env.local via --env-file or hard-coded fallback
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    '❌  Missing env vars. Run with:\n' +
    '    node --env-file=.env.local scripts/seed-members.mjs'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Member data — 75 realistic names split roughly evenly across sections
// ---------------------------------------------------------------------------
const members = [
  // ── Soprano (19) ──────────────────────────────────────────────
  { name: 'Adaeze Okafor', section: 'Soprano' },
  { name: 'Blessing Nwosu', section: 'Soprano' },
  { name: 'Chioma Eze', section: 'Soprano' },
  { name: 'Deborah Adeniyi', section: 'Soprano' },
  { name: 'Esther Umeh', section: 'Soprano' },
  { name: 'Folake Adesanya', section: 'Soprano' },
  { name: 'Gloria Osei', section: 'Soprano' },
  { name: 'Helen Osagie', section: 'Soprano' },
  { name: 'Ifeoma Chukwu', section: 'Soprano' },
  { name: 'Joy Nwachukwu', section: 'Soprano' },
  { name: 'Kemi Afolabi', section: 'Soprano' },
  { name: 'Lilian Ogunyemi', section: 'Soprano' },
  { name: 'Mercy Adebayo', section: 'Soprano' },
  { name: 'Ngozi Obi', section: 'Soprano' },
  { name: 'Oluchi Nnamdi', section: 'Soprano' },
  { name: 'Patricia Ekechi', section: 'Soprano' },
  { name: 'Queen Bassey', section: 'Soprano' },
  { name: 'Ruth Ofoegbu', section: 'Soprano' },
  { name: 'Sarah Iyamah', section: 'Soprano' },

  // ── Alto (19) ─────────────────────────────────────────────────
  { name: 'Faith Adeyemi', section: 'Alto' },
  { name: 'Grace Obi', section: 'Alto' },
  { name: 'Hannah Bello', section: 'Alto' },
  { name: 'Amaka Onyeji', section: 'Alto' },
  { name: 'Beatrice Okoro', section: 'Alto' },
  { name: 'Catherine Ezeani', section: 'Alto' },
  { name: 'Doris Akpan', section: 'Alto' },
  { name: 'Elizabeth Madu', section: 'Alto' },
  { name: 'Favour Ibekwe', section: 'Alto' },
  { name: 'Gladys Effiong', section: 'Alto' },
  { name: 'Happiness Okoye', section: 'Alto' },
  { name: 'Irene Nwankwo', section: 'Alto' },
  { name: 'Janet Odili', section: 'Alto' },
  { name: 'Kehinde Salami', section: 'Alto' },
  { name: 'Linda Agu', section: 'Alto' },
  { name: 'Margaret Aliyu', section: 'Alto' },
  { name: 'Nkechi Ibe', section: 'Alto' },
  { name: 'Obiageli Uche', section: 'Alto' },
  { name: 'Patience Otieno', section: 'Alto' },

  // ── Tenor (19) ────────────────────────────────────────────────
  { name: 'Isaac Ogundipe', section: 'Tenor' },
  { name: 'Michael Chang', section: 'Tenor' },
  { name: 'John Ajayi', section: 'Tenor' },
  { name: 'Abiodun Lawal', section: 'Tenor' },
  { name: 'Benson Okafor', section: 'Tenor' },
  { name: 'Chinedu Onuoha', section: 'Tenor' },
  { name: 'Daniel Effiom', section: 'Tenor' },
  { name: 'Emmanuel Okeke', section: 'Tenor' },
  { name: 'Felix Adeola', section: 'Tenor' },
  { name: 'Gideon Amadi', section: 'Tenor' },
  { name: 'Henry Obasi', section: 'Tenor' },
  { name: 'Ikenna Nwobi', section: 'Tenor' },
  { name: 'James Olawale', section: 'Tenor' },
  { name: 'Kenneth Ndu', section: 'Tenor' },
  { name: 'Leo Ezeigbo', section: 'Tenor' },
  { name: 'Moses Bankole', section: 'Tenor' },
  { name: 'Nonso Obiora', section: 'Tenor' },
  { name: 'Obinna Agu', section: 'Tenor' },
  { name: 'Philip Ekwueme', section: 'Tenor' },

  // ── Bass (18) ─────────────────────────────────────────────────
  { name: 'David Okonkwo', section: 'Bass' },
  { name: 'Peter Nnamdi', section: 'Bass' },
  { name: 'Samuel Adekunle', section: 'Bass' },
  { name: 'Anthony Ezeobi', section: 'Bass' },
  { name: 'Benjamin Usman', section: 'Bass' },
  { name: 'Charles Okpara', section: 'Bass' },
  { name: 'Desmond Iroegbu', section: 'Bass' },
  { name: 'Edwin Oladipo', section: 'Bass' },
  { name: 'Francis Nnaji', section: 'Bass' },
  { name: 'George Bassey', section: 'Bass' },
  { name: 'Humphrey Chike', section: 'Bass' },
  { name: 'Ike Dibiaezue', section: 'Bass' },
  { name: 'Joseph Alabi', section: 'Bass' },
  { name: 'Kingsley Nwogu', section: 'Bass' },
  { name: 'Lawrence Edet', section: 'Bass' },
  { name: 'Martin Ogbonna', section: 'Bass' },
  { name: 'Nathaniel Dike', section: 'Bass' },
  { name: 'Oscar Enwerem', section: 'Bass' },
];

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------
async function seed() {
  console.log(`\n🎵  Seeding ${members.length} choir members...\n`);

  // Use upsert with onConflict on name+section to avoid duplicates from re-runs
  // Since there's no unique constraint on (name, section), we'll first check
  // existing members and only insert new ones.
  const { data: existing, error: fetchError } = await supabase
    .from('members')
    .select('name, section');

  if (fetchError) {
    console.error('❌  Failed to fetch existing members:', fetchError.message);
    process.exit(1);
  }

  const existingSet = new Set(existing.map((m) => `${m.name}|${m.section}`));
  const newMembers = members.filter(
    (m) => !existingSet.has(`${m.name}|${m.section}`)
  );

  if (newMembers.length === 0) {
    console.log('✅  All members already exist — nothing to insert.');
    process.exit(0);
  }

  console.log(`   Skipping ${members.length - newMembers.length} existing members.`);
  console.log(`   Inserting ${newMembers.length} new members...\n`);

  const { data, error } = await supabase
    .from('members')
    .insert(newMembers)
    .select('id, name, section');

  if (error) {
    console.error('❌  Insert failed:', error.message);
    process.exit(1);
  }

  // Summary by section
  const counts = { Soprano: 0, Alto: 0, Tenor: 0, Bass: 0 };
  data.forEach((m) => counts[m.section]++);

  console.log('✅  Seeding complete!\n');
  console.log('   Section breakdown:');
  Object.entries(counts).forEach(([section, count]) => {
    console.log(`     ${section.padEnd(10)} ${count}`);
  });
  console.log(`\n   Total inserted: ${data.length}`);
  console.log(`   Total in DB:    ${existing.length + data.length}\n`);
}

seed().catch((err) => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
