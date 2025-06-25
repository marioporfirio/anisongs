// src/components/Auth.tsx
"use client";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AuthForm() {
  const supabase = createClientComponentClient();

  return (
    <div className="max-w-md mx-auto">
      <Auth
        supabaseClient={supabase}
        view="sign_in"
        appearance={{ theme: ThemeSupa }}
        theme="dark"
        showLinks={true}
        providers={['google', 'github']} // Configure-os no seu dashboard Supabase!
        redirectTo={`${new URL(window.location.href).origin}/auth/callback`}
      />
    </div>
  );
}