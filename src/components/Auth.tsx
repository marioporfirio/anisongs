// src/components/Auth.tsx
"use client";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
// MODIFICAÇÃO: Importa createBrowserClient do @supabase/ssr
import { createBrowserClient } from '@supabase/ssr';
import { useState, useEffect } from 'react';

export default function AuthForm() {
  // MODIFICAÇÃO: Instancia o cliente com createBrowserClient
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [redirectUrl, setRedirectUrl] = useState('');

  useEffect(() => {
    const getURL = () => {
      let url =
        process?.env?.NEXT_PUBLIC_SITE_URL ??
        process?.env?.NEXT_PUBLIC_VERCEL_URL ??
        'http://localhost:3000/';
      url = url.includes('http') ? url : `https://${url}`;
      url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
      return `${url}auth/callback`;
    };
    
    setRedirectUrl(getURL());
  }, []);

  if (!redirectUrl) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto">
      <Auth
        supabaseClient={supabase}
        view="sign_in"
        appearance={{ theme: ThemeSupa }}
        theme="dark"
        showLinks={true}
        providers={['google', 'github']}
        redirectTo={redirectUrl}
      />
    </div>
  );
}