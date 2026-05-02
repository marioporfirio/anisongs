// src/app/page.tsx
"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from 'framer-motion';

import VideoPlayerModal from "@/components/VideoPlayerModal";
import ThemeFilters from "@/components/ThemeFilters";
import ThemeCard from "@/components/ThemeCard";
import NetworkErrorFallback from "@/components/NetworkErrorFallback";
import { getThemeRatingDetailsBatch } from "@/app/actions";
import { createCacheKey, fetchAnimeThemesApi } from "@/services/cache";
import type { RatingData } from "@/services/cache";

// Tipagens
interface Video { basename: string; link: string; }
interface AnimeThemeEntry { videos: Video[]; }
interface ImageType { facet: 'poster' | 'cover' | 'Large Cover' | 'Small Cover'; link: string; }
interface Artist { id: number; name: string; slug?: string; }
interface Song { title: string; artists?: Artist[]; }
interface Anime { name: string; slug: string; images: ImageType[]; animethemes?: AnimeTheme[]; }
interface AnimeTheme { id: number; slug: string; song: Song | null; animethemeentries: AnimeThemeEntry[]; anime: Anime | null; }
interface ApiThemeResponse { animethemes: AnimeTheme[]; }

function HomePageContent() {
  const [themes, setThemes] = useState<AnimeTheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoForModal, setVideoForModal] = useState<string | null>(null);
  const [retryFunction, setRetryFunction] = useState<(() => void) | null>(null);
  const [themeRatings, setThemeRatings] = useState<Map<string, RatingData>>(new Map());

  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();



  // Função simplificada para buscar ratings dos temas
  const fetchThemeRatings = useCallback(async (themesToRate: AnimeTheme[]) => {
    const ratingsMap = new Map<string, RatingData>();
    
    // Preparar lista de temas para busca
    const themesToFetch = themesToRate
      .filter(theme => theme.anime)
      .map(theme => ({
        animeSlug: theme.anime!.slug,
        themeSlug: theme.slug
      }));
    
    if (themesToFetch.length === 0) {
      return;
    }
    
    try {
      // Buscar ratings em lote
      const ratingsResults = await getThemeRatingDetailsBatch(themesToFetch);
      
      // Adicionar resultados ao mapa
      ratingsResults.forEach((ratingDetails, key) => {
        if (ratingDetails.averageScore !== null && ratingDetails.ratingCount > 0) {
          ratingsMap.set(key, {
            averageScore: ratingDetails.averageScore,
            ratingCount: ratingDetails.ratingCount,
            userScore: ratingDetails.userScore
          });
        }
      });
       
    } catch (error) {
      console.error('Erro ao buscar ratings:', error);
    }
    
    setThemeRatings(ratingsMap);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let mounted = true;

    async function fetchFilteredThemes() {
      setIsLoading(true);
      setError(null);
      const year = searchParams.get('year');
      const season = searchParams.get('season');
      const type = searchParams.get('type');
      let endpoint = 'https://api.animethemes.moe/animetheme';
      const params = new URLSearchParams();
      if (year || season) {
        endpoint = 'https://api.animethemes.moe/anime';
        params.append('include', 'animethemes.song.artists,animethemes.song,animethemes.animethemeentries.videos,images');
        if (year) params.append('filter[year]', year);
        if (season) params.append('filter[season]', season);
      } else {
        params.append('include', 'song.artists,song,anime.images,animethemeentries.videos');
        if (type) params.append('filter[animetheme][type]', type);
      }
      params.append('page[size]', '50');
      if (!year && !season && !type) {
        params.append('sort', '-created_at');
      }
      const cacheKey = createCacheKey('themes', endpoint, params.toString());

      try {
        // fetchAnimeThemesApi já tem cache + retry automático com backoff
        const data = await fetchAnimeThemesApi(endpoint, params, cacheKey);

        if (!mounted) return;

        let finalThemes: AnimeTheme[];
        if (year || season) {
          const animeData = data as { anime: Anime[] };
          const allThemes = animeData.anime.flatMap(anime =>
            anime.animethemes?.map(theme => ({
              ...theme,
              anime: { name: anime.name, slug: anime.slug, images: anime.images }
            })) || []
          );
          finalThemes = type ? allThemes.filter(t => t.slug.startsWith(type)) : allThemes;
        } else {
          finalThemes = (data as ApiThemeResponse).animethemes || [];
        }

        setThemes(finalThemes);
        fetchThemeRatings(finalThemes);
      } catch (err) {
        if (!mounted) return;
        if (err instanceof Error) {
          setError(`A API AnimeThemes está temporariamente indisponível. Erro: ${err.message}`);
        } else {
          setError("Ocorreu um erro desconhecido ao carregar os dados.");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    setRetryFunction(() => fetchFilteredThemes);
    fetchFilteredThemes();

    return () => {
      mounted = false;
    };
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = useCallback((filters: { year: string; season: string; type: string }) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (!filters.year) current.delete('year'); else current.set('year', filters.year);
    if (!filters.season) current.delete('season'); else current.set('season', filters.season);
    if (!filters.type) current.delete('type'); else current.set('type', filters.type);
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const closeModal = useCallback(() => {
    setVideoForModal(null);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const renderFilteredContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-300/10 rounded-lg h-60 animate-pulse"></div>
          ))}
        </div>
      );
    }
    if (error) {
      return <NetworkErrorFallback error={error} onRetry={retryFunction || undefined} />;
    }
    const validThemes = themes.filter(theme => !!theme.anime);
    if (validThemes.length === 0) {
      return <div className="text-center text-gray-400 p-10">Nenhum resultado encontrado.</div>
    }
    return (
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {validThemes.map(theme => {
          const posterImage = theme.anime!.images.find(img => img.facet === 'poster') ||
                              theme.anime!.images.find(img => img.facet === 'Large Cover') ||
                              theme.anime!.images.find(img => img.facet === 'Small Cover');
          const ratingKey = `${theme.anime!.slug}-${theme.slug}`;
          const rating = themeRatings.get(ratingKey);
          return (
            <ThemeCard
              key={`${theme.anime!.slug}-${theme.slug}-${theme.id}`}
              animeName={theme.anime!.name}
              animeSlug={theme.anime!.slug}
              themeId={theme.id}
              themeSlug={theme.slug}
              songTitle={theme.song?.title || 'Untitled'}
              artists={theme.song?.artists}
              posterUrl={posterImage?.link}
              isLoggedIn={!!session?.user}
              videoUrl={theme.animethemeentries[0]?.videos[0]?.link}
              onPlayVideo={setVideoForModal}
              averageRating={rating?.averageScore}
              showRatingControls={true}
            />
          );
        })}
      </motion.div>
    );
  };

  return (
        <>
      <ThemeFilters onFilterChange={handleFilterChange} />
      <main className="container mx-auto p-4 md:p-6">
        {renderFilteredContent()}
      </main>
      <VideoPlayerModal videoUrl={videoForModal} onClose={closeModal} />
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 container mx-auto p-4 md:p-6">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-300/10 rounded-lg h-60 animate-pulse"></div>
        ))}
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
