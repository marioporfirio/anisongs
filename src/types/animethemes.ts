// src/types/animethemes.ts

// Raw API Response Interfaces (based on JSON:API structure and observed patterns)

export interface ApiImage {
  id: number;
  path: string;
  link: string; // This is the direct URL to the image
  facet?: 'Cover' | 'Poster' | 'Banner' | 'Large Cover' | 'Small Cover' | string; // string for flexibility
  mime_type?: string;
  size?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ApiVideo {
  id: number;
  basename: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  link: string; // Direct URL to the video file
  resolution?: number;
  nc: boolean;
  subbed: boolean;
  lyric: boolean;
  uncen: boolean;
  source?: string;
  overlap?: string;
  tags: string; // e.g., "OP1", "ED1v2" - might need parsing if it contains version info
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ApiAnimeThemeEntry {
  id: number;
  version: number | null;
  episodes: string | null;
  nsfw: boolean;
  spoiler: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  videos?: ApiVideo[]; // Included relation
  animetheme_id?: number; // Belongs to AnimeTheme
}

export interface ApiSong {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  animethemes?: ApiAnimeTheme[]; // Included relation (themes that use this song)
  // artists are usually linked via animetheme -> song -> artists on the theme itself
}

export interface ApiAnime {
  id: number;
  name: string;
  slug: string;
  year: number;
  season: 'Winter' | 'Spring' | 'Summer' | 'Fall' | null;
  synopsis?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  images?: ApiImage[]; // Included relation
  // animethemes are part of the artist's song's themes
}

export interface ApiAnimeTheme {
  id: number;
  type: 'OP' | 'ED' | 'IN' | 'RI'; // Opening, Ending, Insert, Rip/Raw
  sequence: number | null; // e.g., 1, 2 for OP1, OP2
  slug: string; // e.g., OP1, ED2v2 - this is usually what we need for themeSlug
  group?: { id: number; name: string; slug: string; } | null; // Group if it's a group theme
  song_id?: number;
  anime_id?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  song?: ApiSong; // Included relation
  anime?: ApiAnime; // Included relation
  animethemeentries?: ApiAnimeThemeEntry[]; // Included relation
  // artists are typically on the song, or sometimes directly here if it's a specific version
  artists?: ApiArtist[]; // Artists performing this specific theme (can be different from song's main artists)
}

export interface ApiArtist {
  id: number;
  name: string;
  slug: string;
  information?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  images?: ApiImage[]; // Included relation for artist images
  songs?: ApiSong[];    // Included relation for songs by this artist
  // Note: when fetching artist, songs will contain animethemes which in turn contain anime
}

// Processed (Internal) Types for easier component use

export interface ArtistThemeEntry {
  themeId: number; // ApiAnimeTheme.id
  themeSlug: string; // ApiAnimeTheme.slug (e.g., "OP1", "ED1v2") - for RatingStars
  songTitle: string; // ApiSong.title
  animeName: string; // ApiAnime.name
  animeSlug: string; // ApiAnime.slug - for RatingStars and navigation
  animePosterUrl?: string; // A poster image for the anime
  videoLink?: string; // Direct link to play the video (ApiVideo.link)
  // For RatingStars - these might need to be fetched separately or passed if available
  averageRating?: number | null;
  userRating?: number | null;
  ratingCount?: number;
}

export interface ArtistDetails {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string; // Primary image for the artist
  information?: string;
  // Using a Map for songsByAnime: Key is animeName, Value is array of themes for that anime
  songsByAnime: Map<string, ArtistThemeEntry[]>;
}

// General API response structure for a single resource (e.g., when fetching artist by slug)
export interface SingleArtistApiResponse {
  artist: ApiArtist;
  // Included resources will be flattened in a real JSON:API response,
  // but when using `include`, the ORM/client often nests them.
  // For simplicity, we assume includes are directly nested in the primary resource object
  // after fetching and initial processing by a hypothetical fetch wrapper.
  // Actual processing logic will need to handle JSON:API `included` array if not pre-processed.
}

// Type for session object from Supabase (if not already globally defined)
// Assuming it's similar to what's used in page.tsx or actions.ts
// Re-declare or import if a global type exists
export interface Session {
  user: {
    id: string;
    // other user properties
  } | null;
  // other session properties
}
