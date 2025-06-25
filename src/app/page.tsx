// src/app/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import VideoPlayerModal from "@/components/VideoPlayerModal";
import ThemeFilters from "@/components/ThemeFilters";

// Tipagens
interface Video { basename: string; link: string; }
interface AnimeThemeEntry { videos: Video[]; }
interface ImageType { facet: 'poster' | 'cover'; link: string; }
interface Song { title: string; }
interface Anime { name: string; slug: string; images: ImageType[]; animethemes?: AnimeTheme[]; }
interface AnimeTheme { id: number; slug: string; song: Song | null; animethemeentries: AnimeThemeEntry[]; anime: Anime | null; }
interface ApiThemeResponse { animethemes: AnimeTheme[]; }

// Componente Card
function ThemeCard({ theme, onPlay }: { theme: AnimeTheme; onPlay: (url: string, event?: React.MouseEvent) => void; }) {
  if (!theme.anime) return null; 
  const video = theme.animethemeentries[0]?.videos[0];
  const posterImage = theme.anime.images.find(img => img.facet === 'poster');
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg group h-full flex flex-col">
      <div className="relative w-full h-40 overflow-hidden bg-black flex-shrink-0">
        {posterImage && (<Image src={posterImage.link} alt="" fill className="object-cover blur-lg scale-110 brightness-50"/>)}
        <Image src={posterImage?.link || '/placeholder.png'} alt={`Poster for ${theme.anime.name}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-contain" priority={true}/>
        {video && (<button onClick={(e) => onPlay(video.link, e)} className="absolute inset-0 z-10 bg-black bg-opacity-40 flex items-center justify-center text-white text-5xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">▶</button>)}
      </div>
      <div className="p-3 flex-grow">
        <h3 className="text-md font-bold text-white truncate" title={theme.song?.title || 'Untitled'}>{theme.song?.title || 'Untitled'}</h3>
        <p className="text-sm text-gray-400 truncate" title={theme.anime.name}>{theme.anime.name}</p>
        <p className="text-xs text-indigo-400 font-semibold mt-1">{theme.slug.toUpperCase()}</p>
      </div>
    </div>
  );
}

// Componente principal da página com a lógica de filtros
function HomePageContent() {
  const [themes, setThemes] = useState<AnimeTheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
        params.append('include', 'animethemes.song,animethemes.animethemeentries.videos,images');
        if (year) params.append('filter[year]', year);
        if (season) params.append('filter[season]', season);
      } else {
        params.append('include', 'song,anime.images,animethemeentries.videos');
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
            const allThemes = (data.anime as Anime[]).flatMap(anime => 
                anime.animethemes?.map(theme => ({
                    ...theme,
                    anime: { name: anime.name, slug: anime.slug, images: anime.images }
                })) || []
            );
            const finalThemes = type ? allThemes.filter(t => t.slug.startsWith(type)) : allThemes;
            setThemes(finalThemes);
        } else {
            setThemes((data as ApiThemeResponse).animethemes || []);
        }

      } catch (err) {
        console.error("Falha ao buscar os temas:", err);
        if (err instanceof Error) setError(err.message);
        else setError("Ocorreu um erro desconhecido.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchFilteredThemes();
  }, [searchParams]);

  const handlePlay = (url: string, event?: React.MouseEvent) => { event?.preventDefault(); setSelectedVideoUrl(url); };
  
  const handleFilterChange = (filters: { year: string; season: string; type: string }) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (!filters.year) current.delete('year'); else current.set('year', filters.year);
    if (!filters.season) current.delete('season'); else current.set('season', filters.season);
    if (!filters.type) current.delete('type'); else current.set('type', filters.type);
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  };

  const renderFilteredContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg h-60 animate-pulse"></div>
          ))}
        </div>
      );
    }
    if (error) {
      return <div className="text-center text-red-400 p-10 bg-red-900/20 rounded-lg">{error}</div>;
    }
    
    const validThemes = themes.filter(theme => !!theme.anime);

    if (validThemes.length === 0) {
      return <div className="text-center text-gray-400 p-10">Nenhum resultado encontrado para os filtros selecionados.</div>
    }
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {validThemes.map(theme => (
            <Link key={`${theme.anime!.slug}-${theme.slug}-${theme.id}`} href={`/anime/${theme.anime!.slug}`} className="block hover:scale-105 transition-transform duration-300">
              <ThemeCard theme={theme} onPlay={handlePlay}/>
            </Link>
        ))}
      </div>
    );
  };

  return (
    <>
      <ThemeFilters onFilterChange={handleFilterChange} />
      <div className="container mx-auto p-4 md:p-6">
        {renderFilteredContent()}
      </div>
      <VideoPlayerModal videoUrl={selectedVideoUrl} onClose={() => setSelectedVideoUrl(null)} />
    </>
  );
}

// Componente Page com Suspense
export default function Page() {
  return (
    <Suspense fallback={<div className="text-center text-white p-10">Carregando...</div>}>
      <HomePageContent />
    </Suspense>
  );
}