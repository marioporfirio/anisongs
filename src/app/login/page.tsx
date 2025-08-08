// src/app/login/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import AuthForm from '@/components/Auth';
import Image from 'next/image';

export default function LoginPage() {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="w-full max-w-4xl flex flex-col md:flex-row bg-gray-800/50 backdrop-blur-sm border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Left Side: Branding */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center items-center text-center bg-gray-900/60">
          <Image src="/file.svg" alt="Anisongs Logo" width={80} height={80} className="mb-4" />
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-600 mb-2">
            Bem-vindo de volta!
          </h1>
          <p className="text-gray-400">
            Acesse sua conta para criar playlists, avaliar suas músicas favoritas e muito mais.
          </p>
        </div>

        {/* Right Side: Auth Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12">
          <h2 className="text-2xl font-semibold text-center mb-6">Faça seu Login</h2>
          <AuthForm />
        </div>

      </div>
    </div>
  );
}
