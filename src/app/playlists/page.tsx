// src/app/playlists/page.tsx
import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createPlaylist } from '@/app/actions';

interface Playlist { id: number; name: string; description: string | null; }

// CORRIGIDO: Tipagem do supabase
async function fetchUserPlaylists(supabase: SupabaseClient): Promise<Playlist[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: playlists, error } = await supabase.from('playlists').select('id, name, description').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) { console.error("Erro ao buscar playlists na página:", error); return []; }
  return playlists;
}

export default async function PlaylistsPage() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() { return (await cookies()).getAll(); },
        async setAll(cookiesToSet) {
          const cookieStore = await cookies();
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } 
          catch { /* Ignorar */ }
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { redirect('/login'); }
  const playlists = await fetchUserPlaylists(supabase);

  return (
    <main className="container mx-auto p-4 md:p-8 text-white">
      <div className="flex justify-between items-center mb-8"><h1 className="text-4xl font-bold">Minhas Playlists</h1></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-300/10 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Criar Nova Playlist</h2>
            <form action={createPlaylist} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">Nome</label>
                <input type="text" name="name" id="name" required className="mt-1 block w-full bg-slate-700/50 backdrop-blur-sm border border-slate-600/80 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300">Descrição (Opcional)</label>
                <textarea name="description" id="description" rows={3} className="mt-1 block w-full bg-slate-700/50 backdrop-blur-sm border border-slate-600/80 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
              </div>
              <div className="flex items-center">
                <input id="isPublic" name="isPublic" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-500 rounded focus:ring-indigo-500" />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-300">Tornar pública</label>
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40">Criar</button>
            </form>
          </div>
        </div>
        <div className="md:col-span-2">
          {playlists.length > 0 ? (
            <div className="space-y-4">
              {playlists.map(playlist => (
                <Link href={`/playlists/${playlist.id}`} key={playlist.id} className="block bg-slate-800/50 backdrop-blur-sm border border-slate-300/10 rounded-lg shadow-lg p-4 transition-all duration-300 hover:border-indigo-500/50 hover:shadow-indigo-500/20 hover:shadow-2xl">
                  <h3 className="text-xl font-bold">{playlist.name}</h3>
                  <p className="text-gray-400 mt-1">{playlist.description || "Sem descrição"}</p>
                </Link>
              ))}
            </div>
          ) : ( <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-300/10 rounded-lg shadow-lg p-6 text-center text-gray-400">Você ainda não criou nenhuma playlist.</div> )}
        </div>
      </div>
    </main>
  );
}