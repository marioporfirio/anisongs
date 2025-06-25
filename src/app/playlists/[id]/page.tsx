// src/app/playlists/[id]/page.tsx
import { getPlaylistDetails, PlaylistDetails as ActionPlaylistDetails, PlaylistThemeItemData } from '@/app/actions';
import { notFound } from 'next/navigation';
import PlaylistDetailClient from './PlaylistDetailClient'; // Assuming this is the client component to be used/modified
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Interface for theme data from animethemes.moe API (can be defined in client component too if only used there)
interface AnimeThemeMOE {
  id: number; // This is the theme_id from animethemes.moe
  slug: string; // This is the theme type like OP1, ED1
  song: { title: string } | null;
  anime: { name: string; slug: string } | null; 
  animethemeentries: { videos: { link: string }[] }[];
}

// This will be the type for props passed to PlaylistDetailClient
export interface EnrichedPlaylistTheme extends PlaylistThemeItemData {
  // Fields from PlaylistThemeItemData: playlist_theme_id, theme_id
  // Enriched fields:
  title: string;
  animeName: string;
  animeSlug: string;
  videoLink?: string; // First video link
  type: string; // e.g. OP1, ED2 (from animetheme.slug)
}

// Type for the playlist details prop for the client component
export interface ClientPlaylistDetails extends Omit<ActionPlaylistDetails, 'themes'> {
    themes: EnrichedPlaylistTheme[];
}

async function fetchThemeDetailsFromApiMoe(themeId: number): Promise<AnimeThemeMOE | null> {
  try {
    const response = await fetch(`https://api.animethemes.moe/animetheme/${themeId}?include=song,anime,animethemeentries.videos`);
    if (!response.ok) {
      console.error(`Failed to fetch theme ${themeId} from animethemes.moe: ${response.status} ${response.statusText}`);
      // Attempt to get error body for more details
      // const errorBody = await response.text();
      // console.error("Error body:", errorBody);
      return null;
    }
    const data = await response.json();
    return data.animetheme as AnimeThemeMOE; // API nests the resource
  } catch (error) {
    console.error(`Network or parsing error fetching theme ${themeId}:`, error);
    return null;
  }
}

export default async function PlaylistDetailPage({ params }: { params: { id: string } }) {
  const playlistIdNum = parseInt(params.id, 10);
  if (isNaN(playlistIdNum)) {
    notFound();
  }

  // Supabase client for user session (used by getPlaylistDetails for private playlist check)
  const cookieStore = await cookies(); // Added await
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch { /* Ignored for Server Components */ }
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch initial playlist data (metadata + theme IDs) using the action
  const playlistData = await getPlaylistDetails(playlistIdNum);

  if (!playlistData) {
    notFound(); // Handles not found or not authorized (for private playlists)
  }
  
  const isOwner = user?.id === playlistData.user_id;

  // Enrich themes with details from animethemes.moe
  const enrichedThemes: EnrichedPlaylistTheme[] = (await Promise.all(
    playlistData.themes.map(async (item): Promise<EnrichedPlaylistTheme | null> => {
      const themeDetailsApi = await fetchThemeDetailsFromApiMoe(item.theme_id);
      
      if (!themeDetailsApi) {
        // Fallback if API fetch fails for a specific theme
        return {
            ...item, // playlist_theme_id, theme_id
            title: `Tema ID ${item.theme_id} (não encontrado na API externa)`,
            animeName: 'Desconhecido',
            animeSlug: '#',
            type: 'N/A',
            videoLink: undefined, // Ensure all fields of EnrichedPlaylistTheme are present
        };
      }
      return {
        ...item, // playlist_theme_id, theme_id (from PlaylistThemeItemData)
        title: themeDetailsApi.song?.title || 'Título Desconhecido',
        animeName: themeDetailsApi.anime?.name || 'Anime Desconhecido',
        animeSlug: themeDetailsApi.anime?.slug || '#',
        videoLink: themeDetailsApi.animethemeentries[0]?.videos[0]?.link,
        type: themeDetailsApi.slug || 'N/A', // 'slug' from animetheme is like 'OP1'
      };
    })
  )).filter((theme): theme is EnrichedPlaylistTheme => theme !== null);


  const clientPlaylistProps: ClientPlaylistDetails = {
    id: playlistData.id,
    name: playlistData.name,
    description: playlistData.description,
    is_public: playlistData.is_public,
    user_id: playlistData.user_id,
    themes: enrichedThemes,
  };

  return (
    <main className="container mx-auto p-4 md:p-8 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">{playlistData.name}</h1>
        {playlistData.description && <p className="text-lg text-gray-400 mt-2">{playlistData.description}</p>}
      </div>
      <PlaylistDetailClient 
        playlist={clientPlaylistProps}
        isOwner={isOwner}
        // isLoggedIn={!!user} // Removed as it's not used in PlaylistDetailClient
      />
    </main>
  );
}