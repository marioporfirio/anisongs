// src/app/auth/callback/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'; // Changed import
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin; // Get origin for redirect

  if (code) {
    const cookieStore = await cookies(); // Await cookies
    const supabase = createServerClient( // Changed to createServerClient
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                // The `set` method sets the cookie directly in the Response.
                // If you are using Next.js < 14.1.1, you need to use
                // `request.cookies.set(name, value, options)` instead.
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
              // In Route Handlers, errors should not be ignored.
              console.error('Error setting cookies in Route Handler:', error);
            }
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      revalidatePath('/', 'layout'); // Revalidate the layout
      return NextResponse.redirect(origin); // Redirect to origin on success
    }
    // Log error if exchange fails
    console.error('Error exchanging code for session:', error);
  }

  // If no code, or if there was an error during exchange, redirect to an error page or home
  // For simplicity, redirecting to origin, but an error page might be better.
  // Or, redirect to a page that explains the auth error.
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}