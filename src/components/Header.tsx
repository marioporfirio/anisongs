// src/components/Header.tsx
import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import GlobalSearch from './GlobalSearch'; // Importa nosso componente de busca

function LogoutButton() {
  return (
    <form action="/auth/sign-out" method="post">
      <button type="submit" className="py-2 px-4 rounded-md no-underline bg-red-600 hover:bg-red-700 transition">
        Sair
      </button>
    </form>
  );
}

export default async function Header() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          return (await cookies()).get(name)?.value
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
      <nav className="container mx-auto p-4 flex justify-between items-center gap-4">
        <div className="flex-shrink-0">
          <Link href="/" className="text-2xl font-bold text-white hover:text-indigo-400 transition">
            AnimeMusic
          </Link>
        </div>
        
        <div className="flex-grow flex justify-center px-4">
          <GlobalSearch />
        </div>

        <div className="text-white flex-shrink-0">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline">Olá, {user.email?.split('@')[0]}</span>
              <LogoutButton />
            </div>
          ) : (
            <Link
              href="/login"
              className="py-2 px-4 rounded-md no-underline bg-indigo-600 hover:bg-indigo-700 transition"
            >
              Login
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}