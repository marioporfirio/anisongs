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
  const score = formData.get('score') as string;
  const animeSlug = formData.get('animeSlug') as string;
  const themeSlug = formData.get('themeSlug') as string;
  if (!score || !animeSlug || !themeSlug) { throw new Error("Dados insuficientes para salvar a avaliação.") }
  const { error } = await supabase.from('ratings').upsert({ user_id: user.id, anime_slug: animeSlug, theme_slug: themeSlug, score: parseFloat(score), });
  if (error) { console.error("Erro ao salvar avaliação:", error); throw new Error("Não foi possível salvar sua avaliação. Tente novamente."); }
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