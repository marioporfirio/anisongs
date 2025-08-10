// src/components/Header.tsx
'use client';
import Link from 'next/link';
import Image from 'next/image';
import { createBrowserClient } from '@supabase/ssr';
import GlobalSearch from './GlobalSearch';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

function LogoutButton() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <button 
      onClick={handleLogout}
      className="py-2 px-4 rounded-md text-sm font-bold bg-red-600/80 hover:bg-red-600/100 text-white transition-all duration-300 shadow-lg shadow-red-500/20 hover:shadow-red-500/40"
    >
      Sair
    </button>
  );
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // Buscar usuário inicial
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    
    getUser();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.display_name || 
                   user?.user_metadata?.username || 
                   user?.user_metadata?.name || 
                   user?.user_metadata?.user_name ||
                   user?.email?.split('@')[0];

  if (loading) {
    return (
      <header className="sticky top-0 z-50 bg-slate-900/60 backdrop-blur-lg border-b border-slate-300/10 shadow-lg shadow-black/20">
        <nav className="container mx-auto p-4 flex items-center gap-4">
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-white hover:text-indigo-400 transition-colors duration-300">
              AniSongs
            </Link>
          </div>
          <div className="flex-grow flex justify-center px-4">
            <GlobalSearch />
          </div>
          <div className="text-white flex-shrink-0">
            <div className="w-20 h-8 bg-gray-700 animate-pulse rounded"></div>
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-slate-900/60 backdrop-blur-lg border-b border-slate-300/10 shadow-lg shadow-black/20">
      <nav className="container mx-auto p-4 flex items-center gap-4">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Link href="/" className="text-2xl font-bold text-white hover:text-indigo-400 transition-colors duration-300">
            AniSongs
          </Link>
        </div>
        
        {/* Navigation Links */}
        <div className="flex items-center gap-2">
          <Link 
            href="/top-100" 
            className="py-1.5 px-3 rounded-md text-xs font-semibold bg-purple-600/80 hover:bg-purple-600/100 text-white transition-all duration-300 flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            Top 100
          </Link>
          
          <Link 
            href="/playlists" 
            className="py-1.5 px-3 rounded-md text-xs font-semibold bg-green-600/80 hover:bg-green-600/100 text-white transition-all duration-300 flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            Playlists
          </Link>
          
          {user && (
            <>
              <Link 
                href="/my-ratings" 
                className="py-1.5 px-3 rounded-md text-xs font-semibold bg-yellow-600/80 hover:bg-yellow-600/100 text-white transition-all duration-300 flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Avaliações
              </Link>
            </>
          )}
        </div>
        
        {/* Centered Search */}
        <div className="flex-grow flex justify-center px-4">
          <GlobalSearch />
        </div>

        {/* User Section */}
        <div className="text-white flex-shrink-0">
          {user ? (
            <div className="flex items-center gap-4">
              {avatarUrl && (
                <Image
                  src={avatarUrl}
                  alt="User avatar"
                  width={36}
                  height={36}
                  className="rounded-full border-2 border-slate-600/80"
                />
              )}
              {userName && <span className="hidden sm:inline text-sm">Olá, {userName}</span>}
              <LogoutButton />
            </div>
          ) : (
            <Link
              href="/login"
              className="py-2 px-4 rounded-md text-sm font-bold bg-indigo-600/80 hover:bg-indigo-600/100 text-white transition-all duration-300 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
            >
              Login
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}