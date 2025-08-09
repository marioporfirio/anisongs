// src/app/actions.ts
'use server'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// Função auxiliar para criar o cliente Supabase nas Server Actions
function createSupabaseClient() {
  const cookieStore = cookies();

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
          } catch {
            // Ignorado, como recomendado na documentação do Supabase
          }
        },
      },
    }
  );
}

// Salva, atualiza ou remove uma avaliação de tema
export async function saveRating(formData: FormData) {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Você precisa estar logado para avaliar.");
  }

  const scoreStr = formData.get('score') as string;
  const animeSlug = formData.get('animeSlug') as string;
  const themeSlug = formData.get('themeSlug') as string;

  if (!animeSlug || !themeSlug) { 
    throw new Error("Dados insuficientes para salvar a avaliação.");
  }

  const scoreNum = scoreStr ? parseFloat(scoreStr) : null;
  if (scoreStr && isNaN(scoreNum as number)) {
    throw new Error("Valor de score inválido.");
  }

  try {
    if (scoreNum === null) {
      // Deleta a avaliação se a nota for nula
      const { error } = await supabase.from('ratings')
        .delete()
        .match({
          user_id: user.id,
          anime_slug: animeSlug,
          theme_slug: themeSlug
        });
      if (error) { throw error; }

    } else {
      // Cria ou atualiza a avaliação (upsert)
      const { error } = await supabase.from('ratings').upsert(
        { 
          user_id: user.id, 
          anime_slug: animeSlug, 
          theme_slug: themeSlug, 
          score: scoreNum, 
        },
        {
          onConflict: 'user_id, anime_slug, theme_slug' // Sintaxe correta para sua versão
        }
      );
      if (error) { throw error; }
    }

    revalidatePath(`/anime/${animeSlug}`);

  } catch (error) {
    console.error("Erro ao processar a avaliação no Supabase:", error);
    throw new Error("Não foi possível salvar sua avaliação. Verifique os logs do servidor.");
  }
}

// Interface para o resultado da função RPC
interface ThemeRatingDetailsRpcResult {
  average_score: number | null;
  rating_count: number;
  user_score: number | null;
}

// Busca os detalhes da avaliação de um tema usando a função RPC otimizada
export async function getThemeRatingDetails(animeSlug: string, themeSlug: string): Promise<{
  averageScore: number | null;
  ratingCount: number;
  userScore: number | null;
}> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Chama a função RPC
  const { data, error } = await supabase
    .rpc('get_theme_rating_details', {
      p_anime_slug: animeSlug,
      p_theme_slug: themeSlug,
      p_user_id: user?.id,
    })
    .single();

  if (error) {
    console.error("Erro ao chamar a RPC get_theme_rating_details:", error);
    return { averageScore: null, ratingCount: 0, userScore: null };
  }
  
  // Usa asserção de tipo para informar ao TypeScript o formato dos dados
  const result = data as ThemeRatingDetailsRpcResult;

  const averageScore = result.average_score ? parseFloat(Number(result.average_score).toFixed(1)) : null;

  return {
    averageScore: averageScore,
    ratingCount: result.rating_count || 0,
    userScore: result.user_score || null,
  };
}


// --- Funções de Playlist ---

export async function getUserPlaylists() {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: playlists, error } = await supabase.from('playlists').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) { console.error("Erro ao buscar playlists:", error); return []; }
  return playlists;
}

export async function addThemeToPlaylist(formData: FormData) {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Usuário não autenticado." };

  const playlistId = formData.get('playlistId') as string;
  const themeId = formData.get('themeId') as string;
  if (!playlistId || !themeId) return { success: false, message: "Dados inválidos." };

  const { data: playlist, error: ownerError } = await supabase.from('playlists').select('id').eq('user_id', user.id).eq('id', playlistId).maybeSingle();
  if (ownerError || !playlist) return { success: false, message: "Playlist não encontrada ou não pertence a você." };

  const { data: existing, error: selectError } = await supabase.from('playlist_themes').select('id').eq('playlist_id', parseInt(playlistId)).eq('theme_id', parseInt(themeId)).maybeSingle();
  if (selectError) { console.error("Erro ao verificar tema existente:", selectError); return { success: false, message: "Erro no servidor." }; }
  if (existing) return { success: true, message: "Esta música já está na playlist." };

  const { error } = await supabase.from('playlist_themes').insert({ playlist_id: parseInt(playlistId), theme_id: parseInt(themeId) });
  if (error) { console.error("Erro ao adicionar tema:", error); return { success: false, message: "Não foi possível adicionar a música." }; }

  revalidatePath(`/playlists/${playlistId}`);
  return { success: true, message: "Música adicionada com sucesso!" };
}

export async function createPlaylist(formData: FormData): Promise<void> {
  const supabase = createSupabaseClient();
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

export async function deletePlaylist(formData: FormData) {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { return { success: false, message: "Usuário não autenticado." }; }

  const playlistId = formData.get('playlistId') as string;
  if (!playlistId) { return { success: false, message: "ID da playlist inválido." }; }

  const { data: playlist, error: fetchError } = await supabase.from('playlists').select('user_id').eq('id', parseInt(playlistId)).single();
  if (fetchError || !playlist || playlist.user_id !== user.id) {
    return { success: false, message: "Não autorizado ou playlist não encontrada." };
  }

  const { error: deleteError } = await supabase.from('playlists').delete().eq('id', parseInt(playlistId));
  if (deleteError) {
    console.error("Erro ao deletar playlist:", deleteError);
    return { success: false, message: "Não foi possível deletar a playlist." };
  }

  revalidatePath('/playlists');
  return { success: true, message: "Playlist deletada com sucesso!" };
}

export async function removeThemeFromPlaylist(formData: FormData) {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { return { success: false, message: "Usuário não autenticado." }; }

  const playlistId = formData.get('playlistId') as string;
  const playlistThemeId = formData.get('playlistThemeId') as string;
  if (!playlistId || !playlistThemeId) { return { success: false, message: "Dados inválidos." }; }
  
  const { data: playlist } = await supabase.from('playlists').select('user_id').eq('id', parseInt(playlistId)).single();
  if (!playlist || playlist.user_id !== user.id) {
    return { success: false, message: "Não autorizado." };
  }
  
  const { error } = await supabase.from('playlist_themes').delete().eq('id', parseInt(playlistThemeId));
  if (error) {
    console.error("Erro ao remover tema:", error);
    return { success: false, message: "Não foi possível remover a música." };
  }

  revalidatePath(`/playlists/${playlistId}`);
  return { success: true, message: "Música removida com sucesso!" };
}

export interface PlaylistThemeItemData {
  playlist_theme_id: number;
  theme_id: number;
}

export interface PlaylistDetails {
  id: number;
  name: string;
  description: string | null;
  themes: PlaylistThemeItemData[];
  is_public: boolean;
  user_id: string;
}

export async function getPlaylistDetails(playlistId: number): Promise<PlaylistDetails | null> {
  const supabase = createSupabaseClient();

  const { data: playlistData, error: playlistError } = await supabase
    .from('playlists')
    .select('id, name, description, user_id, is_public')
    .eq('id', playlistId)
    .single();

  if (playlistError || !playlistData) {
    console.error(`Erro ao buscar metadados da playlist ${playlistId}:`, playlistError);
    return null;
  }

  if (!playlistData.is_public) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || playlistData.user_id !== user.id) {
      console.warn(`Acesso negado à playlist privada ${playlistId}.`);
      return null;
    }
  }
  
  const { data: themeEntries, error: themesError } = await supabase
    .from('playlist_themes')
    .select('id, theme_id')
    .eq('playlist_id', playlistId)
    .order('created_at', { ascending: true });

  if (themesError) {
    console.error(`Erro ao buscar temas da playlist ${playlistId}:`, themesError);
    return { ...playlistData, themes: [] };
  }

  const themes: PlaylistThemeItemData[] = themeEntries.map(entry => ({
    playlist_theme_id: entry.id,
    theme_id: entry.theme_id,
  }));

  return { ...playlistData, themes };
}