// client.js: Browser-side Supabase client for use in Client Components and hooks

import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates and returns a Supabase client for use in browser/client components.
 * Uses document.cookie automatically — no cookie config needed on the browser side.
 * Safe to call multiple times; @supabase/ssr deduplicates internally.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
