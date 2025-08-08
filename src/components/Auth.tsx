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
    <div className="w-full">
      <Auth
        supabaseClient={supabase}
        view="sign_in"
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: 'rgb(109, 40, 217)', // Cor principal (roxo)
                brandAccent: 'rgb(129, 70, 227)', // Cor de destaque
                brandButtonText: 'white',
                defaultButtonBackground: '#262626', // Fundo de botões padrão
                defaultButtonBackgroundHover: '#333333',
                defaultButtonBorder: '#444444',
                defaultButtonText: 'white',
                dividerBackground: '#444444',
                inputBackground: '#1a1a1a',
                inputBorder: '#444444',
                inputBorderHover: 'rgb(109, 40, 217)',
                inputBorderFocus: 'rgb(129, 70, 227)',
                inputText: 'white',
                inputLabelText: '#cccccc',
                inputPlaceholder: '#777777',
                messageText: '#cccccc',
                messageTextDanger: '#ff6666',
                anchorTextColor: '#9e86ff', // Cor para links
                anchorTextHoverColor: '#b6a3ff',
              },
              space: {
                spaceSmall: '4px',
                spaceMedium: '8px',
                spaceLarge: '16px',
                labelBottomMargin: '8px',
                anchorBottomMargin: '4px',
                emailInputSpacing: '8px',
                socialAuthSpacing: '8px',
                buttonPadding: '12px 15px',
                inputPadding: '12px 15px',
              },
              fontSizes: {
                baseBodySize: '14px',
                baseInputSize: '14px',
                baseLabelSize: '14px',
                baseButtonSize: '14px',
              },
              fonts: {
                bodyFontFamily: `inherit`,
                buttonFontFamily: `inherit`,
                inputFontFamily: `inherit`,
                labelFontFamily: `inherit`,
              },
              borderWidths: {
                buttonBorderWidth: '1px',
                inputBorderWidth: '1px',
              },
              radii: {
                borderRadiusButton: '8px',
                buttonBorderRadius: '8px',
                inputBorderRadius: '8px',
              },
            },
          },
        }}
        theme="dark"
        showLinks={true}
        providers={['google', 'github']}
        redirectTo={redirectUrl}
        socialLayout="horizontal"
      />
    </div>
  );
}