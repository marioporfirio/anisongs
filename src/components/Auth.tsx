// src/components/Auth.tsx
"use client";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useState, useEffect } from 'react';

export default function AuthForm() {
  const supabase = createClientComponentClient();
  const [redirectUrl, setRedirectUrl] = useState('');

  // Este useEffect só roda no cliente, após a montagem do componente.
  // É o lugar seguro para acessar o objeto 'window'.
  useEffect(() => {
    // Constrói a URL de callback dinamicamente no lado do cliente.
    const getURL = () => {
      let url =
        process?.env?.NEXT_PUBLIC_SITE_URL ?? // A melhor opção: uma variável de ambiente.
        process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Fornecida pela Vercel.
        'http://localhost:3000/'; // Fallback para desenvolvimento local.
      // Garante que a URL termine com uma barra.
      url = url.includes('http') ? url : `https://${url}`;
      url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
      return `${url}auth/callback`;
    };
    
    setRedirectUrl(getURL());
  }, []);

  // O componente só renderiza o formulário quando a URL de redirecionamento estiver pronta.
  if (!redirectUrl) {
    return null; // ou um spinner de carregamento
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
        redirectTo={redirectUrl} // Usa a URL segura do estado
      />
    </div>
  );
}