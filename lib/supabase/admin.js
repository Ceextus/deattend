// admin.js: Service-role Supabase client that bypasses RLS — super admin operations only

// ⚠️  WARNING: This client uses the service role key and bypasses ALL Row Level Security.
// ⚠️  NEVER import this file in client components or expose it to the browser.
// ⚠️  Only use in server actions that have already verified super_admin role.

import { createClient } from '@supabase/supabase-js';

/**
 * Creates and returns a Supabase admin client using the service role key.
 * Bypasses all RLS policies — use only for super admin operations like
 * audit log queries, bulk updates, and dispute resolution.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
