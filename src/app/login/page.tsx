// src/app/login/page.tsx
"use client"; // Make this a client component

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AuthForm from '@/components/Auth';

export default function LoginPage() {
  const supabase = createClientComponentClient();
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

  // Optionally, show a loading state or null while checking session
  // For simplicity, just rendering the form directly
  // A more robust solution might wait for session check before rendering AuthForm
  // or AuthForm itself could handle this if it shows user info when session exists.

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-white text-center my-8">Acesse sua Conta</h1>
      <AuthForm />
    </div>
  );
}