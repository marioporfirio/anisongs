// src/app/auth/sign-out/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'; // Changed import
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
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
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // In Route Handlers, errors should not be ignored during cookie setting.
             console.error('Error setting cookies in sign-out Route Handler:', error);
          }
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      // Optionally redirect to an error page or handle differently
      // For now, will still redirect to home, but error is logged.
    }
  }
  
  // Revalidate layout to ensure header updates
  revalidatePath('/', 'layout');

  return NextResponse.redirect(new URL('/', req.url), {
    status: 302,
  });
}