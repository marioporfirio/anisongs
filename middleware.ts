// middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set({ name, value, ...options }));
          response = NextResponse.next({ // Re-clone response BEFORE setting cookies on it for this request-response cycle
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set({ name, value, ...options }));
        },
      },
    }
  );

  // IMPORTANT: Avoid calling `await supabase.auth.getUser()` in middleware.
  // This method is designed for Server Components and Route Handlers, not middleware.
  // Refreshing the session is done automatically when `getSession()` is called on the client
  // or when `getUser()` is called in a Server Component or Route Handler.
  // If you need to protect routes, use `await supabase.auth.getSession()` instead
  // and check for the presence of a session.
  // For this specific case, if the goal is just to refresh the session cookie if needed,
  // the current setup might be okay, but it's often a source of issues.
  // The @supabase/ssr library is designed to handle cookie refresh automatically
  // when auth methods are called in Server Components / Route Handlers.
  // For now, I will keep it to see if the other changes are sufficient.
  // If issues persist, especially with session refresh, this `getUser()` call might need reconsideration.
  await supabase.auth.getUser();


  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}