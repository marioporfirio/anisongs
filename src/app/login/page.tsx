// src/app/login/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
// MODIFICAÇÃO: Importa createBrowserClient do @supabase/ssr
import { createBrowserClient } from '@supabase/ssr';
import AuthForm from '@/components/Auth';

export default function LoginPage() {
  // MODIFICAÇÃO: Instancia o cliente com createBrowserClient
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/'); // Redirect to homepage if logged in
      }
    };
    checkSession();
  }, [supabase, router]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-white text-center my-8">Acesse sua Conta</h1>
      <AuthForm />
    </div>
  );
}