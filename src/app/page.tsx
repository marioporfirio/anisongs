// src/app/page.tsx
"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { Session } from '@supabase/supabase-js';
import { motion } from 'framer-motion';

import VideoPlayerModal from "@/components/VideoPlayerModal";
import ThemeFilters from "@/components/ThemeFilters";
import ThemeCard from "@/components/ThemeCard";

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
  const [session, setSession] = useState<Session | null>(null);
  const [videoForModal, setVideoForModal] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    getSession();
  }, [supabase]);

  useEffect(() => {
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
      const API_URL = `${endpoint}?${params.toString()}`;
      try {
        const response = await fetch(API_URL);
        if (!response.ok) { throw new Error(`A API respondeu com o status: ${response.status}`); }
        const data = await response.json();
        if (year || season) {
            const allThemes = (data.anime as Anime[]).flatMap(anime => anime.animethemes?.map(theme => ({...theme, anime: { name: anime.name, slug: anime.slug, images: anime.images }})) || []);
            const finalThemes = type ? allThemes.filter(t => t.slug.startsWith(type)) : allThemes;
            setThemes(finalThemes);
        } else {
            setThemes((data as ApiThemeResponse).animethemes || []);
        }
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError("Ocorreu um erro desconhecido.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchFilteredThemes();
  }, [searchParams]);

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
      return <div className="text-center text-red-400 p-10 bg-red-900/20 rounded-lg">{error}</div>;
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
              isLoggedIn={!!session}
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
