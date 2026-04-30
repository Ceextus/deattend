// middleware.js: Next.js middleware for route protection based on Supabase session and user role
//
// NOTE: In this Next.js version, middleware.js still works but the convention
// is being renamed to proxy.js. We use middleware.js for compatibility with
// the project structure. The exported function must be named `middleware` or
// be a default export.

import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * Next.js middleware that protects routes based on authentication and user role.
 *
 * Logic:
 * 1. Refreshes the Supabase session on every request (required by @supabase/ssr)
 * 2. If no session → redirect to /auth/login
 * 3. If session exists but route starts with /super-admin →
 *    fetch user role from profiles table
 * 4. If role !== 'super_admin' → redirect to /dashboard?error=unauthorized
 * 5. Otherwise → allow the request through
 */
export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request });

  // Create a Supabase client that reads/writes cookies from the request/response pair
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Apply cookies to the request (for downstream server components)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Re-create response so it carries the updated request cookies
          supabaseResponse = NextResponse.next({ request });
          // Apply cookies to the response (for the browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — IMPORTANT: do not remove this line.
  // getUser() validates the JWT on every request and refreshes if expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // If no authenticated user → redirect to login
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing /super-admin routes → verify the user has super_admin role
  if (pathname.startsWith('/super-admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'super_admin') {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = '/dashboard';
      dashboardUrl.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return supabaseResponse;
}

/**
 * Matcher config: run middleware on all routes EXCEPT static files, images,
 * favicon, and auth routes (login/callback are public).
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth).*)',
  ],
};
