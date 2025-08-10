// src/components/Auth.tsx
"use client";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createBrowserClient } from '@supabase/ssr';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthForm() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();
  const [redirectUrl, setRedirectUrl] = useState('');
  const [showCustomSignUp, setShowCustomSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ Usuário logado, redirecionando...');
        router.push('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  const handleCustomSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!displayName.trim()) {
      setError('Nome de exibição é obrigatório');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName.trim()
          }
        }
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        console.log('✅ Conta criada com display_name:', displayName);
        // O redirecionamento será feito pelo onAuthStateChange
      }
    } catch (err) {
      setError('Erro ao criar conta');
      console.error('Erro no cadastro:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!redirectUrl) {
    return null;
  }

  if (showCustomSignUp) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="t-deGdmh">
          <div className="supabase-auth-ui_ui-container c-jTXIoq c-jTXIoq-bsgKCL-direction-vertical c-jTXIoq-bXHFxK-gap-large">
            <form onSubmit={handleCustomSignUp} style={{ width: '100%' }}>
              <div className="supabase-auth-ui_ui-container c-jTXIoq c-jTXIoq-bsgKCL-direction-vertical c-jTXIoq-bXHFxK-gap-large">
                <div className="supabase-auth-ui_ui-container c-jTXIoq c-jTXIoq-bsgKCL-direction-vertical c-jTXIoq-bXHFxK-gap-large">
                  <div>
                    <label htmlFor="displayName" className="supabase-auth-ui_ui-label c-bpexlo">
                      Nome de Exibição
                    </label>
                    <input
                      type="text"
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="supabase-auth-ui_ui-input c-dEnagJ c-dEnagJ-bBzSYw-type-default"
                      placeholder="Como você quer aparecer no site"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="supabase-auth-ui_ui-label c-bpexlo">
                      Email address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="supabase-auth-ui_ui-input c-dEnagJ c-dEnagJ-bBzSYw-type-default"
                      placeholder="Your email address"
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="supabase-auth-ui_ui-label c-bpexlo">
                      Your Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="supabase-auth-ui_ui-input c-dEnagJ c-dEnagJ-bBzSYw-type-password"
                      placeholder="Your password"
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-900/50 border border-red-600 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="supabase-auth-ui_ui-button c-bOcPnF c-bOcPnF-cmFMMs-color-primary"
                >
                  {loading ? 'Criando conta...' : 'Criar Conta'}
                </button>

                <div className="supabase-auth-ui_ui-container c-jTXIoq c-jTXIoq-bsgKCL-direction-vertical c-jTXIoq-jjTuOt-gap-small">
                  <button
                    type="button"
                    onClick={() => setShowCustomSignUp(false)}
                    className="supabase-auth-ui_ui-anchor c-dumjqv"
                  >
                    ← Voltar para login
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Auth padrão do Supabase com interceptação */}
      <div 
        className="relative"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          // Interceptar clique no link "Sign up" ou "sign up"
          if (target.tagName === 'A' && 
              (target.textContent?.toLowerCase().includes('sign up') || 
               target.textContent?.toLowerCase().includes('criar conta'))) {
            e.preventDefault();
            e.stopPropagation();
            setShowCustomSignUp(true);
          }
        }}
      >
        <Auth
          supabaseClient={supabase}
          view="sign_in"
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'rgb(109, 40, 217)',
                  brandAccent: 'rgb(129, 70, 227)',
                  brandButtonText: 'white',
                  defaultButtonBackground: '#262626',
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
                  anchorTextColor: '#9e86ff',
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
          onlyThirdPartyProviders={false}
        />
      </div>
    </div>
  );
}