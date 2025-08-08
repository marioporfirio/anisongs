"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import type { ArtistDetails, ArtistThemeEntry, ApiImage, ApiArtist } from "@/types/animethemes"; 
import RatingStars from "@/components/RatingStars";
import VideoPlayerModal from "@/components/VideoPlayerModal";
import Link from "next/link";
import AddToPlaylistButton from "@/components/AddToPlaylistButton";

const seasonOrder: { [key: string]: number } = {
  Winter: 1,
  Spring: 2,
  Summer: 3,
  Fall: 4,
};

export default function ArtistPage() {
  const params = useParams();
  const artistSlug = typeof params.artistSlug === 'string' ? params.artistSlug : null;

  const [artistData, setArtistData] = useState<ArtistDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoForModal, setVideoForModal] = useState<string | null>(null);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  
  const [sortBy, setSortBy] = useState<'alphabetical' | 'releaseDate'>('alphabetical');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setIsUserLoggedIn(!!initialSession?.user);
    };
    getInitialSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((_, currentSession) => {
      setIsUserLoggedIn(!!currentSession?.user);
    });
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

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
        const apiUrl = `https://api.animethemes.moe/artist/${artistSlug}?include=images,songs.animethemes.anime,songs.animethemes.animethemeentries.videos,songs.animethemes.song`;
        
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
                  const animeSlugFromTheme = theme.anime.slug;
                  
                  const images = Array.isArray(theme.anime.images) ? theme.anime.images : [];
                  const animePoster = images.find((img: ApiImage) => img.facet === 'Poster' || img.facet === 'Large Cover')?.link;
                  
                  const video = theme.animethemeentries?.[0]?.videos?.[0];

                  const themeEntry: ArtistThemeEntry = {
                    themeId: theme.id,
                    themeSlug: theme.slug,
                    songTitle: theme.song.title,
                    animeName,
                    animeSlug: animeSlugFromTheme,
                    animePosterUrl: animePoster,
                    videoLink: video?.link,
                    year: theme.anime.year,
                    season: theme.anime.season || undefined,
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
        
        setArtistData({
          id: apiArtist.id,
          name: apiArtist.name,
          slug: apiArtist.slug,
          imageUrl,
          information: apiArtist.information,
          songsByAnime: songsByAnime,
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

  const handleSortChange = (newSortBy: 'alphabetical' | 'releaseDate') => {
    if (newSortBy === sortBy) {
      setSortOrder(prevOrder => (prevOrder === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(newSortBy);
      setSortOrder(newSortBy === 'alphabetical' ? 'asc' : 'desc');
    }
  };

  const sortedAnimeList = useMemo(() => {
    if (!artistData?.songsByAnime) return [];
    const animeList = Array.from(artistData.songsByAnime.entries());

    animeList.sort((a, b) => {
      if (sortBy === 'alphabetical') {
        const nameA = a[0];
        const nameB = b[0];
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (sortBy === 'releaseDate') {
        const themeA = a[1][0];
        const themeB = b[1][0];
        if (!themeA || !themeB) return 0;

        const yearA = themeA.year || 0;
        const yearB = themeB.year || 0;
        const dateComparison = (yearB - yearA) || ((seasonOrder[themeB.season || ''] || 0) - (seasonOrder[themeA.season || ''] || 0));
        
        return sortOrder === 'desc' ? dateComparison : -dateComparison;
      }
      return 0;
    });

    return animeList;
  }, [artistData, sortBy, sortOrder]);

  const handlePlayVideo = useCallback((url: string) => {
    setVideoForModal(url);
  }, []);

  const handleCloseVideoModal = useCallback(() => {
    setVideoForModal(null);
  }, []);

  if (isLoading) { return <p>Loading...</p>; }
  if (error) { return <p>Error: {error}</p>; }
  if (!artistData) { return <p>No artist data found.</p>; }

  return (
    <div className="container mx-auto p-4 md:p-6 text-white">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 mb-8">
        {artistData.imageUrl && (
          <div className="flex-shrink-0 w-48 h-48 md:w-64 md:h-64 relative rounded-lg overflow-hidden shadow-2xl border-2 border-gray-700">
            <Image
              src={artistData.imageUrl}
              alt={`Image of ${artistData.name}`}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 192px, 256px"
            />
          </div>
        )}
        <div className="flex-grow pt-2 text-center md:text-left">
          <h1 className="text-4xl md:text-6xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-600">
            {artistData.name}
          </h1>
          {artistData.information && (
            <p className="text-gray-400 mb-4 whitespace-pre-wrap text-sm md:text-base max-w-prose">
              {artistData.information}
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 border-b-2 border-gray-700 pb-3">
          <h2 className="text-3xl font-semibold mb-3 sm:mb-0">Songs & Themes</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => handleSortChange('alphabetical')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${sortBy === 'alphabetical' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-800 hover:bg-gray-700'}`}>
              Alfabética
              {sortBy === 'alphabetical' && <span className="transition-transform duration-300 transform">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
            </button>
            <button 
              onClick={() => handleSortChange('releaseDate')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${sortBy === 'releaseDate' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-800 hover:bg-gray-700'}`}>
              Lançamento
              {sortBy === 'releaseDate' && <span className="transition-transform duration-300 transform">{sortOrder === 'desc' ? '▼' : '▲'}</span>}
            </button>
          </div>
        </div>

        {sortedAnimeList.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-xl">No songs found for this artist.</p>
            <p className="text-gray-500 mt-2">There might be no data available or the artist hasn&apos;t performed any anime themes.</p>
          </div>
        )}
        
        <div className="space-y-8">
          {(sortedAnimeList as [string, ArtistThemeEntry[]][]).map(([animeName, themes]) => (
            <div key={animeName} className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-gray-700/80">
              <h3 className="text-2xl font-bold text-indigo-400 p-4 bg-gray-900/70">
                <Link href={`/anime/${themes[0]?.animeSlug}`} key={themes[0]?.animeSlug}>
                  {animeName}
                </Link>
              </h3>
              <ul className="space-y-4 p-4">
                {themes.sort((a, b) => a.themeSlug.localeCompare(b.themeSlug)).map((theme) => (
                  <li key={theme.themeId} className="p-4 bg-gray-900/50 rounded-lg shadow-md border border-gray-700/60 hover:border-indigo-500/50 transition-all">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div className="flex-grow">
                        <p className="text-lg font-semibold text-white">{theme.songTitle}</p>
                        <p className="text-sm text-indigo-300 font-mono">{theme.themeSlug.toUpperCase()}</p>
                      </div>
                      <div className="flex items-center space-x-3 flex-shrink-0">
                        {theme.videoLink && (
                          <button
                            onClick={() => handlePlayVideo(theme.videoLink!)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-sm font-bold text-white transition-all duration-200 shadow-lg hover:shadow-indigo-500/50 transform hover:scale-105"
                            title="Play theme"
                          >
                            ▶ Assistir
                          </button>
                        )}
                        {isUserLoggedIn && (
                          <AddToPlaylistButton themeId={theme.themeId} />
                        )}
                      </div>
                    </div>
                    <div className="mt-4 border-t border-gray-700 pt-4">
                       <RatingStars
                          animeSlug={theme.animeSlug!}
                          themeSlug={theme.themeSlug!}
                          isLoggedIn={isUserLoggedIn} 
                        />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <VideoPlayerModal videoUrl={videoForModal} onClose={handleCloseVideoModal} />
    </div>
  );
}