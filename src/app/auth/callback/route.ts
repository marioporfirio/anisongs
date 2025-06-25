// src/app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs' // MUDANÇA IMPORTANTE AQUI
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = cookies()
    // USANDO O HELPER CORRETO PARA ROUTE HANDLERS
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore }) 
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // URL para redirecionar em caso de erro
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}