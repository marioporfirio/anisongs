// src/app/actions.ts
'use server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function createSupabaseClient() { // Make function async
  const cookieStore = await cookies(); // Await cookies

  return createServerClient(
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
            // The `setAll` method was called from a Server Action.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

export async function saveRating(formData: FormData) {
  const supabase = await createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { throw new Error("Você precisa estar logado para avaliar.") }

  const scoreStr = formData.get('score') as string;
  const animeSlug = formData.get('animeSlug') as string;
  const themeSlug = formData.get('themeSlug') as string;

  if (!scoreStr || !animeSlug || !themeSlug) { 
    throw new Error("Dados insuficientes para salvar a avaliação (score, animeSlug, ou themeSlug ausente).") 
  }

  const scoreNum = parseFloat(scoreStr);
  if (isNaN(scoreNum)) {
    // This case should ideally not be reached if RatingStars sends valid numbers
    console.error(`Tentativa de salvar avaliação com score inválido: ${scoreStr}`);
    throw new Error("Valor de score inválido.");
  }

  const { error } = await supabase.from('ratings').upsert({ 
    user_id: user.id, 
    anime_slug: animeSlug, 
    theme_slug: themeSlug, 
    score: scoreNum, 
  });

  if (error) { 
    console.error("Erro ao salvar avaliação no Supabase:", error); // Log detalhado do erro do Supabase
    // Informar ao usuário para checar logs do servidor pode ser útil se o erro for complexo (ex: RLS, schema)
    throw new Error("Não foi possível salvar sua avaliação. Verifique os logs do servidor para detalhes do erro do Supabase."); 
  }
  revalidatePath(`/anime/${animeSlug}`);
}

export async function getUserPlaylists() {
  const supabase = await createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: playlists, error } = await supabase.from('playlists').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) { console.error("Erro ao buscar playlists:", error); return []; }
  return playlists;
}

export async function addThemeToPlaylist(formData: FormData) {
  const supabase = await createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Usuário não autenticado." };
  const playlistId = formData.get('playlistId') as string;
  const themeId = formData.get('themeId') as string;
  if (!playlistId || !themeId) return { success: false, message: "Dados inválidos." };
  const { data: existing, error: selectError } = await supabase.from('playlist_themes').select('id').eq('playlist_id', parseInt(playlistId)).eq('theme_id', parseInt(themeId)).maybeSingle();
  if (selectError) { console.error("Erro ao verificar tema existente:", selectError); return { success: false, message: "Erro no servidor." }; }
  if (existing) return { success: false, message: "Esta música já está na playlist." };
  const { error } = await supabase.from('playlist_themes').insert({ playlist_id: parseInt(playlistId), theme_id: parseInt(themeId) });
  if (error) { console.error("Erro ao adicionar tema:", error); return { success: false, message: "Não foi possível adicionar a música." }; }
  return { success: true, message: "Música adicionada com sucesso!" };
}

export async function createPlaylist(formData: FormData): Promise<void> {
  const supabase = await createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { throw new Error("Usuário não autenticado."); }
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const isPublic = formData.get('isPublic') === 'on';
  if (!name) { throw new Error("O nome da playlist é obrigatório."); }
  const { error } = await supabase.from('playlists').insert({ user_id: user.id, name: name, description: description, is_public: isPublic });
  if (error) { console.error("Erro ao criar playlist:", error); throw new Error("Não foi possível criar a playlist."); }
  revalidatePath('/playlists');
}

// --- FUNÇÃO QUE ESTAVA FALTANDO ---
export async function removeThemeFromPlaylist(formData: FormData) {
  const supabase = await createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { return { success: false, message: "Usuário não autenticado." }; }

  const playlistId = formData.get('playlistId') as string;
  const playlistThemeId = formData.get('playlistThemeId') as string;

  if (!playlistId || !playlistThemeId) { return { success: false, message: "Dados inválidos." }; }

  const { data: playlist } = await supabase
    .from('playlists')
    .select('user_id')
    .eq('id', parseInt(playlistId))
    .single();

  if (!playlist || playlist.user_id !== user.id) {
    return { success: false, message: "Não autorizado." };
  }

  const { error } = await supabase
    .from('playlist_themes')
    .delete()
    .eq('id', parseInt(playlistThemeId));
  
  if (error) {
    console.error("Erro ao remover tema:", error);
    return { success: false, message: "Não foi possível remover a música." };
  }

  revalidatePath(`/playlists/${playlistId}`);
  return { success: true, message: "Música removida com sucesso!" };
}

// --- FUNÇÃO PARA BUSCAR DETALHES DA PLAYLIST ---
export interface PlaylistThemeItemData { // Renamed to avoid conflict if used client-side with same name
  playlist_theme_id: number; // ID from the playlist_themes table, for removal
  theme_id: number; // ID of the theme itself (from animethemes.moe)
  // Details to be fetched from animethemes.moe API later on the page:
  title?: string;
  animeName?: string;
  animeSlug?: string;
  videoLink?: string;
  // Optional: any other data from animethemes.moe we might want
  type?: string; // e.g. OP1, ED2
}

export interface PlaylistDetails {
  id: number;
  name: string;
  description: string | null;
  themes: PlaylistThemeItemData[]; // Use the renamed interface
  is_public: boolean; // Added for potential future use
  user_id: string; // Added for ownership checks or public viewing logic
}

export async function getPlaylistDetails(playlistId: number): Promise<PlaylistDetails | null> {
  const supabase = await createSupabaseClient();
  // No user check here initially, to allow fetching public playlist data later if needed.
  // Ownership check will be done after fetching.

  // 1. Fetch playlist metadata
  const { data: playlistData, error: playlistError } = await supabase
    .from('playlists')
    .select('id, name, description, user_id, is_public') // fetch is_public and user_id
    .eq('id', playlistId)
    .single();

  if (playlistError) {
    console.error(`Erro ao buscar metadados da playlist ${playlistId}:`, playlistError);
    return null;
  }

  if (!playlistData) {
    console.warn(`Playlist com ID ${playlistId} não encontrada.`);
    return null;
  }

  // If the playlist is private, only the owner can see it.
  // A session is needed to check ownership for private playlists.
  if (!playlistData.is_public) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn(`Tentativa de acesso não autenticado à playlist privada ${playlistId}.`);
      return null; // Not found for anonymous users if private
    }
    if (playlistData.user_id !== user.id) {
      console.warn(`Usuário ${user.id} tentou acessar playlist privada ${playlistId} que não lhe pertence.`);
      return null; // Not found if not owner of private playlist
    }
  }
  
  // 2. Fetch theme IDs associated with the playlist
  const { data: themeEntries, error: themesError } = await supabase
    .from('playlist_themes')
    .select('id, theme_id') // 'id' here is playlist_themes.id
    .eq('playlist_id', playlistId)
    .order('created_at', { ascending: true }); // Optional: order by when they were added

  if (themesError) {
    console.error(`Erro ao buscar temas da playlist ${playlistId}:`, themesError);
    // Return playlist metadata even if themes fail to load, with empty themes list.
    return {
      id: playlistData.id,
      name: playlistData.name,
      description: playlistData.description,
      themes: [],
      is_public: playlistData.is_public,
      user_id: playlistData.user_id,
    };
  }

  const themes: PlaylistThemeItemData[] = themeEntries.map(entry => ({
    playlist_theme_id: entry.id, // This is playlist_themes.id
    theme_id: entry.theme_id,   // This is the animetheme.moe theme ID
  }));

  return {
    id: playlistData.id,
    name: playlistData.name,
    description: playlistData.description,
    themes,
    is_public: playlistData.is_public,
    user_id: playlistData.user_id,
  };
}