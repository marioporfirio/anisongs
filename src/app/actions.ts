'use server'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Helper function to create Supabase client for Server Actions
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
            // Ignored as recommended in Supabase docs
          }
        },
      },
    }
  );
}

// Validation schemas
const RatingSchema = z.object({
  animeSlug: z.string().min(1, "Anime slug is required"),
  themeSlug: z.string().min(1, "Theme slug is required"),
  score: z.union([
    z.string().transform(val => parseFloat(val)),
    z.null(),
    z.undefined()
  ]).optional().transform(val => {
    if (val === null || val === undefined) return null;
    const parsed = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(parsed) ? null : parsed;
  }).refine(val => val === null || (val >= 0 && val <= 10), 
    "Score must be between 0 and 10")
});

const PlaylistSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false)
});

const PlaylistThemeSchema = z.object({
  playlistId: z.string().min(1).transform(val => parseInt(val)),
  themeId: z.string().min(1).transform(val => parseInt(val))
});

const PlaylistActionSchema = z.object({
  playlistId: z.string().min(1).transform(val => parseInt(val))
});

const RemoveThemeSchema = z.object({
  playlistId: z.string().min(1).transform(val => parseInt(val)),
  playlistThemeId: z.string().min(1).transform(val => parseInt(val))
});

// Save, update or remove a theme rating
export async function saveRating(formData: FormData) {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to rate.");
  }

  const validatedData = RatingSchema.safeParse({
    animeSlug: formData.get('animeSlug'),
    themeSlug: formData.get('themeSlug'),
    score: formData.get('score'),
  });

  if (!validatedData.success) {
    throw new Error(`Invalid data: ${validatedData.error.message}`);
  }

  const { animeSlug, themeSlug, score } = validatedData.data;

  try {
    // Buscar IDs da API AnimeThemes para salvar junto com os slugs
    let animeId = null;
    let themeId = null;
    
    if (score !== null) {
      try {
        const API_URL = `https://api.animethemes.moe/anime/${animeSlug}?include=animethemes`;
        const response = await fetch(API_URL);
        
        if (response.ok) {
          const data = await response.json();
          animeId = data.anime?.id;
          const theme = data.anime?.animethemes?.find((t: { id: number; slug: string }) => t.slug === themeSlug);
          themeId = theme?.id;
          
          console.log(`📝 Salvando avaliação com IDs: anime_id=${animeId}, theme_id=${themeId}`);
        } else {
          console.warn(`⚠️ Não foi possível buscar IDs da API para ${animeSlug}-${themeSlug}`);
        }
      } catch (apiError) {
        console.warn('Erro ao buscar IDs da API:', apiError);
      }
    }

    if (score === null) {
      const { error } = await supabase.from('ratings')
        .delete()
        .match({
          user_id: user.id,
          anime_slug: animeSlug,
          theme_slug: themeSlug
        });
      if (error) throw error;
    } else {
      const { error } = await supabase.from('ratings').upsert(
        { 
          user_id: user.id, 
          anime_slug: animeSlug, 
          theme_slug: themeSlug,
          anime_id: animeId,
          theme_id: themeId,
          score, 
        },
        {
          onConflict: 'user_id, anime_slug, theme_slug'
        }
      );
      if (error) throw error;
    }

    revalidatePath(`/anime/${animeSlug}`);

  } catch (error) {
    console.error("Error processing rating in Supabase:", error);
    throw new Error("Could not save your rating. Check server logs.");
  }
}

// Interface for RPC function result
interface ThemeRatingDetailsRpcResult {
  average_score: number | null;
  rating_count: number;
  user_score: number | null;
}

// Get theme rating details using optimized RPC function
export async function getThemeRatingDetails(animeSlug: string, themeSlug: string): Promise<{
  averageScore: number | null;
  ratingCount: number;
  userScore: number | null;
}> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .rpc('get_theme_rating_details', {
      p_anime_slug: animeSlug,
      p_theme_slug: themeSlug,
      p_user_id: user?.id,
    })
    .single();

  if (error) {
    console.error("Error calling RPC get_theme_rating_details:", error);
    return { averageScore: null, ratingCount: 0, userScore: null };
  }
  
  const result = data as ThemeRatingDetailsRpcResult;
  const averageScore = result.average_score ? parseFloat(Number(result.average_score).toFixed(1)) : null;

  return {
    averageScore,
    ratingCount: result.rating_count || 0,
    userScore: result.user_score || null,
  };
}

// --- Playlist Functions ---

export async function getUserPlaylists() {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  const { data: playlists, error } = await supabase
    .from('playlists')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
    
  if (error) { 
    console.error("Error fetching playlists:", error); 
    return []; 
  }
  
  return playlists;
}

export async function addThemeToPlaylist(formData: FormData) {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "User not authenticated." };

  const validatedData = PlaylistThemeSchema.safeParse({
    playlistId: formData.get('playlistId'),
    themeId: formData.get('themeId'),
  });

  if (!validatedData.success) {
    return { success: false, message: `Invalid data: ${validatedData.error.message}` };
  }

  const { playlistId, themeId } = validatedData.data;

  const { data: playlist, error: ownerError } = await supabase
    .from('playlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('id', playlistId)
    .maybeSingle();

  if (ownerError || !playlist) {
    return { success: false, message: "Playlist not found or doesn't belong to you." };
  }

  const { data: existing, error: selectError } = await supabase
    .from('playlist_themes')
    .select('id')
    .eq('playlist_id', playlistId)
    .eq('theme_id', themeId)
    .maybeSingle();

  if (selectError) {
    console.error("Error checking existing theme:", selectError);
    return { success: false, message: "Server error." };
  }

  if (existing) {
    return { success: true, message: "This song is already in the playlist." };
  }

  const { error } = await supabase
    .from('playlist_themes')
    .insert({ playlist_id: playlistId, theme_id: themeId });

  if (error) {
    console.error("Error adding theme:", error);
    return { success: false, message: "Could not add the song." };
  }

  revalidatePath(`/playlists/${playlistId}`);
  return { success: true, message: "Song added successfully!" };
}

export async function createPlaylist(formData: FormData): Promise<void> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated.");

  const validatedData = PlaylistSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    isPublic: formData.get('isPublic') === 'on'
  });

  if (!validatedData.success) {
    throw new Error(`Invalid data: ${validatedData.error.message}`);
  }

  const { name, description, isPublic } = validatedData.data;

  const { error } = await supabase.from('playlists').insert({ 
    user_id: user.id, 
    name, 
    description, 
    is_public: isPublic 
  });

  if (error) {
    console.error("Error creating playlist:", error);
    throw new Error("Could not create playlist.");
  }

  revalidatePath('/playlists');
}

export async function deletePlaylist(formData: FormData) {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "User not authenticated." };

  const validatedData = PlaylistActionSchema.safeParse({
    playlistId: formData.get('playlistId')
  });

  if (!validatedData.success) {
    return { success: false, message: `Invalid data: ${validatedData.error.message}` };
  }

  const { playlistId } = validatedData.data;

  const { data: playlist, error: fetchError } = await supabase
    .from('playlists')
    .select('user_id')
    .eq('id', playlistId)
    .single();

  if (fetchError || !playlist || playlist.user_id !== user.id) {
    return { success: false, message: "Not authorized or playlist not found." };
  }

  const { error: deleteError } = await supabase
    .from('playlists')
    .delete()
    .eq('id', playlistId);

  if (deleteError) {
    console.error("Error deleting playlist:", deleteError);
    return { success: false, message: "Could not delete playlist." };
  }

  revalidatePath('/playlists');
  return { success: true, message: "Playlist deleted successfully!" };
}

export async function removeThemeFromPlaylist(formData: FormData) {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "User not authenticated." };

  const validatedData = RemoveThemeSchema.safeParse({
    playlistId: formData.get('playlistId'),
    playlistThemeId: formData.get('playlistThemeId')
  });

  if (!validatedData.success) {
    return { success: false, message: `Invalid data: ${validatedData.error.message}` };
  }

  const { playlistId, playlistThemeId } = validatedData.data;
  
  const { data: playlist } = await supabase
    .from('playlists')
    .select('user_id')
    .eq('id', playlistId)
    .single();

  if (!playlist || playlist.user_id !== user.id) {
    return { success: false, message: "Not authorized." };
  }
  
  const { error } = await supabase
    .from('playlist_themes')
    .delete()
    .eq('id', playlistThemeId);

  if (error) {
    console.error("Error removing theme:", error);
    return { success: false, message: "Could not remove the song." };
  }

  revalidatePath(`/playlists/${playlistId}`);
  return { success: true, message: "Song removed successfully!" };
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

// Get top rated themes by type
export async function getTopRatedThemes(type: 'OP' | 'ED' | 'IN', limit: number = 100): Promise<{
  anime_slug: string;
  theme_slug: string;
  average_score: number;
  rating_count: number;
}[]> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .rpc('get_top_rated_themes_by_type', {
      p_theme_type: type,
      p_limit: limit
    });

  if (error) {
    console.error('Error fetching top rated themes:', error);
    return [];
  }

  return data || [];
}

export async function getPlaylistDetails(playlistId: number): Promise<PlaylistDetails | null> {
  const supabase = createSupabaseClient();

  const { data: playlistData, error: playlistError } = await supabase
    .from('playlists')
    .select('id, name, description, user_id, is_public')
    .eq('id', playlistId)
    .single();

  if (playlistError || !playlistData) {
    console.error(`Error fetching playlist metadata ${playlistId}:`, playlistError);
    return null;
  }

  if (!playlistData.is_public) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn(`Access denied to private playlist ${playlistId} - user not authenticated.`);
      return null;
    }
    
    // Check if user is owner OR collaborator
    const isOwner = playlistData.user_id === user.id;
    
    if (!isOwner) {
      // Check if user is an accepted collaborator
      const { data: collaboration } = await supabase
        .from('playlist_collaborators')
        .select('status')
        .eq('playlist_id', playlistId)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .single();
        
      if (!collaboration) {
        console.warn(`Access denied to private playlist ${playlistId} - user is not owner or collaborator.`);
        return null;
      }
    }
  }
  
  const { data: themeEntries, error: themesError } = await supabase
    .from('playlist_themes')
    .select('id, theme_id')
    .eq('playlist_id', playlistId)
    .order('created_at', { ascending: true });

  if (themesError) {
    console.error(`Error fetching playlist themes ${playlistId}:`, themesError);
    return { ...playlistData, themes: [] };
  }

  const themes: PlaylistThemeItemData[] = themeEntries.map(entry => ({
    playlist_theme_id: entry.id,
    theme_id: entry.theme_id,
  }));

  return { ...playlistData, themes };
}