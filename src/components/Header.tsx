// src/components/Header.tsx
import Link from 'next/link';
import Image from 'next/image'; // Import Next Image
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import GlobalSearch from './GlobalSearch';
import { unstable_noStore as noStore } from 'next/cache';

// Componente para o botão de logout
function LogoutButton() {
  return (
    <form action="/auth/sign-out" method="post">
      <button 
        type="submit"
        className="py-2 px-4 rounded-md no-underline bg-red-600 hover:bg-red-700 text-white font-bold transition"
      >
        Sair
      </button>
    </form>
  );
}

// Componente principal do Header
export default async function Header() {
  noStore(); // Impede o cache deste componente
  const cookieStore = await cookies(); // Await cookies

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
          } catch { // Changed to empty catch block
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const avatarUrl = user?.user_metadata?.avatar_url;
  const userName = user?.email?.split('@')[0] || user?.user_metadata?.name || user?.user_metadata?.user_name;

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <nav className="container mx-auto p-4 flex justify-between items-center gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-2xl font-bold text-white hover:text-indigo-400 transition">
            AnimeMusic
          </Link>
          {user && (
             <Link href="/playlists" className="text-sm text-gray-300 hover:text-white">
              Minhas Playlists
            </Link>
          )}
        </div>
        
        <div className="flex-grow flex justify-center px-4">
          <GlobalSearch />
        </div>

        <div className="text-white flex-shrink-0">
          {user ? (
            <div className="flex items-center gap-3"> {/* Reduced gap slightly for avatar */}
              {avatarUrl && (
                <Image
                  src={avatarUrl}
                  alt="User avatar"
                  width={32} // Adjust size as needed
                  height={32} // Adjust size as needed
                  className="rounded-full"
                />
              )}
              {userName && <span className="hidden sm:inline">Olá, {userName}</span>}
              <LogoutButton />
            </div>
          ) : (
            <Link
              href="/login"
              className="py-2 px-4 rounded-md no-underline bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition"
            >
              Login
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}