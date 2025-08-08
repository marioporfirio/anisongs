// src/app/auth/callback/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'; // Changed import
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const cookieStore = await cookies();
    const response = NextResponse.redirect(origin); // Initialize response here

    const supabase = createServerClient(
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
                // Explicitly set on the response object
                response.cookies.set({ name, value, ...options });
              });
            } catch (error) {
              console.error('Error setting cookies in Route Handler:', error);
            }
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      revalidatePath('/', 'layout');
      // The response object already has the cookies set by the setAll method
      return NextResponse.redirect(`${origin}/auth/post-login-redirect`);
    }
    console.error('Error exchanging code for session:', error);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}