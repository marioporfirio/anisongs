// src/components/Header.tsx
import Link from 'next/link';
import Image from 'next/image';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import GlobalSearch from './GlobalSearch';
import { unstable_noStore as noStore } from 'next/cache';

function LogoutButton() {
  return (
    <form action="/auth/sign-out" method="post">
      <button 
        type="submit"
        className="py-2 px-4 rounded-md text-sm font-bold bg-red-600/80 hover:bg-red-600/100 text-white transition-all duration-300 shadow-lg shadow-red-500/20 hover:shadow-red-500/40"
      >
        Sair
      </button>
    </form>
  );
}

export default async function Header() {
  noStore();
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const avatarUrl = user?.user_metadata?.avatar_url;
  const userName = user?.email?.split('@')[0] || user?.user_metadata?.name || user?.user_metadata?.user_name;

  return (
    <header className="sticky top-0 z-50 bg-slate-900/60 backdrop-blur-lg border-b border-slate-300/10 shadow-lg shadow-black/20">
      <nav className="container mx-auto p-4 flex justify-between items-center gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-2xl font-bold text-white hover:text-indigo-400 transition-colors duration-300">
            AniSongs
          </Link>
          {user && (
             <Link href="/playlists" className="text-sm text-gray-300 hover:text-white transition-colors duration-300">
              Minhas Playlists
            </Link>
          )}
        </div>
        
        <div className="flex-grow flex justify-center px-4">
          <GlobalSearch />
        </div>

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