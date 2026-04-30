// server.js: Server-side Supabase client for use in Server Components and server actions

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates and returns a Supabase client for use in server components, server actions,
 * and route handlers. Reads and writes auth tokens via Next.js cookies().
 * Must be called with `await` because cookies() is async in this Next.js version.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from a Server Component where cookies cannot be set.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}
