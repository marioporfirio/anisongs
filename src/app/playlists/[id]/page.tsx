// src/app/playlists/[id]/page.tsx
import { createServerClient } from '@supabase/ssr';
import { type SupabaseClient } from '@supabase/supabase-js'; // Importação do tipo CORRETA
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import PlaylistDetailClient from './PlaylistDetailClient';

// --- TIPAGENS ---
export interface EnrichedTheme extends ApiTheme { playlistThemeId: number; }
interface PlaylistData { id: number; name: string; description: string | null; user_id: string; }
interface PlaylistThemeEntry { id: number; theme_id: number; }
interface ApiTheme { id: number; slug: string; song: { title: string } | null; anime: { slug: string; name: string }; animethemeentries: Array<{ videos: Array<{ link: string }> }>; }

// --- FUNÇÕES DE BUSCA DE DADOS ---
async function getPlaylistDetails(supabase: SupabaseClient, playlistId: number): Promise<{ playlist: PlaylistData, themes: PlaylistThemeEntry[] }> {
  const { data: playlist, error: playlistError } = await supabase.from('playlists').select('id, name, description, user_id').eq('id', playlistId).single();
  if (playlistError || !playlist) { notFound(); }
  const { data: themes, error: themesError } = await supabase.from('playlist_themes').select('id, theme_id').eq('playlist_id', playlistId).order('id', { ascending: true }); // Adicionado ordenação
  if (themesError) { console.error("Erro ao buscar temas da playlist:", themesError); return { playlist, themes: [] }; }
  return { playlist, themes };
}

async function fetchThemesFromApi(themeIds: number[]): Promise<ApiTheme[]> {
  if (themeIds.length === 0) return [];
  const ids = themeIds.join(',');
  const API_URL = `https://api.animethemes.moe/animetheme?filter[animetheme][id-in]=${ids}&include=song,anime,animethemeentries.videos`;

  try {
    const response = await fetch(API_URL, { next: { revalidate: 3600 } }); // Cache
    if (!response.ok) return [];
    const data = await response.json();
    return data.animethemes || [];
  } catch (error) {
    console.error("Erro ao buscar detalhes dos temas na API:", error);
    return [];
  }
}

// --- COMPONENTE PRINCIPAL DA PÁGINA ---
export default async function PlaylistDetailPage({ params }: { params: { id: string } }) {
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

  const { data: { user } } = await supabase.auth.getUser();
  const playlistId = parseInt(params.id);
  const { playlist, themes: playlistThemes } = await getPlaylistDetails(supabase, playlistId);
  const themeIds = playlistThemes.map(t => t.theme_id);
  const apiThemes = await fetchThemesFromApi(themeIds);

  const apiThemesMap = new Map(apiThemes.map(t => [t.id, t]));

  const enrichedThemes: EnrichedTheme[] = playlistThemes
    .map(playlistTheme => {
        const apiTheme = apiThemesMap.get(playlistTheme.theme_id);
        if (!apiTheme) return null;

        return {
            ...apiTheme,
            playlistThemeId: playlistTheme.id,
        };
    })
    .filter((t): t is EnrichedTheme => t !== null);

  return (
    <main className="container mx-auto p-4 md:p-8 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">{playlist.name}</h1>
        <p className="text-lg text-gray-400 mt-2">{playlist.description}</p>
      </div>
      <PlaylistDetailClient 
        initialThemes={enrichedThemes}
        playlistId={playlist.id}
        isOwner={user?.id === playlist.user_id}
      />
    </main>
  );
}