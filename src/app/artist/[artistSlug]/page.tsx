// src/app/artist/[artistSlug]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
// import type { Session } from '@supabase/supabase-js'; // Session type no longer needed

// Removed ApiSong, ApiAnimeTheme, ApiAnime, ApiAnimeThemeEntry from import as they are unused
import type { ArtistDetails, ArtistThemeEntry, ApiImage, ApiArtist } from "@/types/animethemes"; 
import RatingStars from "@/components/RatingStars";
import VideoPlayerModal from "@/components/VideoPlayerModal"; // For playing videos
import Link from "next/link"; // For linking to anime pages
import AddToPlaylistButton from "@/components/AddToPlaylistButton"; // Import the button

export default function ArtistPage() {
  const params = useParams();
  const artistSlug = typeof params.artistSlug === 'string' ? params.artistSlug : null;

  const [artistData, setArtistData] = useState<ArtistDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoForModal, setVideoForModal] = useState<string | null>(null);
  // const [session, setSession] = useState<Session | null>(null); // No longer needed
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false); // Explicit state for login status

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch session and manage login state
  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      // setSession(initialSession); // No longer setting full session state
      setIsUserLoggedIn(!!initialSession?.user);
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, currentSession) => {
      // setSession(currentSession); // No longer setting full session state
      setIsUserLoggedIn(!!currentSession?.user);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  // Data fetching logic (adapted from ArtistDetailModal)
  useEffect(() => {
    if (!artistSlug) {
      setIsLoading(false);
      setError("Artist slug not found.");
      return;
    }

    const fetchArtistDetails = async () => {
      setIsLoading(true);
      setError(null);
      setArtistData(null);

      try {
        const apiUrl = `https://api.animethemes.moe/artist/${artistSlug}?include=images,songs.animethemes.anime.images,songs.animethemes.animethemeentries.videos,songs.animethemes.song`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `API request failed with status ${response.status}` }));
          throw new Error(errorData.message || `API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const apiArtist: ApiArtist = data.artist;

        if (!apiArtist) {
          throw new Error("Artist data not found in API response.");
        }

        const imageUrl = apiArtist.images?.find((img: ApiImage) => img.facet === 'Cover' || !!img.link)?.link 
                       || apiArtist.images?.[0]?.link 
                       || '/placeholder.png';

        const songsByAnime = new Map<string, ArtistThemeEntry[]>();

        if (apiArtist.songs) {
          for (const song of apiArtist.songs) {
            if (song.animethemes) {
              for (const theme of song.animethemes) {
                if (theme.anime && theme.song) {
                  const animeName = theme.anime.name;
                  const animeSlugFromTheme = theme.anime.slug; // Renamed to avoid conflict
                  const animePoster = theme.anime.images?.find((img: ApiImage) => img.facet === 'Poster' || img.facet === 'Large Cover')?.link;
                  const video = theme.animethemeentries?.[0]?.videos?.[0];

                  const themeEntry: ArtistThemeEntry = {
                    themeId: theme.id,
                    themeSlug: theme.slug,
                    songTitle: theme.song.title,
                    animeName,
                    animeSlug: animeSlugFromTheme,
                    animePosterUrl: animePoster,
                    videoLink: video?.link,
                  };

                  if (!songsByAnime.has(animeName)) {
                    songsByAnime.set(animeName, []);
                  }
                  songsByAnime.get(animeName)!.push(themeEntry);
                }
              }
            }
          }
        }
        
        const sortedSongsByAnime = new Map(
          [...songsByAnime.entries()].sort((a, b) => a[0].localeCompare(b[0]))
        );

        for (const [, themes] of sortedSongsByAnime) {
          themes.sort((a, b) => a.themeSlug.localeCompare(b.themeSlug));
        }
        
        setArtistData({
          id: apiArtist.id,
          name: apiArtist.name,
          slug: apiArtist.slug,
          imageUrl,
          information: apiArtist.information,
          songsByAnime: sortedSongsByAnime,
        });

      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred while fetching artist details.");
        }
        console.error("Failed to fetch artist details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtistDetails();
  }, [artistSlug]);

  const handlePlayVideo = useCallback((url: string) => {
    setVideoForModal(url);
  }, []);

  const handleCloseVideoModal = useCallback(() => {
    setVideoForModal(null);
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 min-h-screen flex flex-col justify-center items-center">
        <svg className="animate-spin -ml-1 mr-3 h-12 w-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-xl mt-4 text-white">Loading artist details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6 min-h-screen flex flex-col justify-center items-center text-red-400">
        <p className="text-2xl font-semibold">Error loading artist details:</p>
        <p className="text-lg mt-2">{error}</p>
        <Link href="/" className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium">
            Go Home
        </Link>
      </div>
    );
  }

  if (!artistData) {
    return (
      <div className="container mx-auto p-4 md:p-6 min-h-screen flex flex-col justify-center items-center text-gray-400">
        <p className="text-2xl">Artist not found.</p>
        <Link href="/" className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium">
            Go Home
        </Link>
      </div>
    );
  }

  // UI Rendering (adapted from ArtistDetailModal)
  return (
    <div className="container mx-auto p-4 md:p-6 text-white">
      {/* Artist Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
        {artistData.imageUrl && artistData.imageUrl !== '/placeholder.png' && (
          <div className="flex-shrink-0 w-48 h-48 md:w-64 md:h-64 relative rounded-lg overflow-hidden shadow-lg">
            <Image
              src={artistData.imageUrl}
              alt={`Image of ${artistData.name}`}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}
        <div className="flex-grow pt-2 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">{artistData.name}</h1>
          {artistData.information && (
            <p className="text-gray-300 mb-4 whitespace-pre-wrap text-sm md:text-base">{artistData.information}</p>
          )}
        </div>
      </div>

      {/* Songs & Themes Section */}
      <div>
        <h2 className="text-3xl font-semibold mb-6 border-b border-gray-700 pb-2">Songs & Themes</h2>
        {artistData.songsByAnime.size === 0 && (
          <p className="text-gray-400 text-lg">No songs found for this artist.</p>
        )}
        {Array.from(artistData.songsByAnime.entries()).map(([animeName, themes]) => (
          <div key={animeName} className="mb-8 p-4 bg-gray-800 bg-opacity-50 rounded-lg shadow-md">
            <h3 className="text-2xl font-semibold text-indigo-400 mb-4">
              <Link href={`/anime/${themes[0]?.animeSlug}`} className="hover:underline">
                {animeName}
              </Link>
            </h3>
            <ul className="space-y-4">
              {themes.map((theme) => (
                <li key={theme.themeId} className="p-4 bg-gray-700 rounded-md shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                    <div className="mb-2 sm:mb-0">
                      <p className="text-lg font-medium text-white">{theme.songTitle} - <span className="text-sm text-indigo-300">{theme.themeSlug.toUpperCase()}</span></p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {theme.videoLink && (
                        <button
                          onClick={() => handlePlayVideo(theme.videoLink!)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-sm font-medium text-white transition-colors"
                          title="Play theme"
                        >
                          ▶ Assistir
                        </button>
                      )}
                      <Link href={`/anime/${theme.animeSlug}`} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium transition-colors">
                         Anime Details
                      </Link>
                      {isUserLoggedIn && ( // Use isUserLoggedIn for AddToPlaylistButton
                        <AddToPlaylistButton themeId={theme.themeId} />
                      )}
                    </div>
                  </div>
                  {/* RatingStars is always rendered, isLoggedIn prop controls its interactive part */}
                  <div className="mt-4 border-t border-gray-600 pt-3">
                     <RatingStars
                        animeSlug={theme.animeSlug}
                        themeSlug={theme.themeSlug}
                        isLoggedIn={isUserLoggedIn} 
                      />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <VideoPlayerModal videoUrl={videoForModal} onClose={handleCloseVideoModal} />
    </div>
  );
}
