// src/app/anime/[slug]/page.tsx

import Image from "next/image";
import ThemeListClient from "./ThemeListClient";
import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import { getThemeRatingDetailsBatch } from '@/app/actions';

// Tipagens
export interface RatingData { average_score: number | null; rating_count: number; user_score: number | null; }
export interface ThemeWithRating extends AnimeThemeForDetail { ratingData: RatingData; }
interface Video { link: string; }
interface AnimeThemeEntry { videos: Video[]; }

// Nova interface para Artist
interface Artist {
  id: number;
  name: string;
  slug: string; // Adicionando slug caso seja útil para links futuros
}

interface Song {
  title: string;
  artists?: Artist[]; // Array de artistas, opcional
}

export interface AnimeThemeForDetail { id: number; slug: string; song: Song | null; animethemeentries: AnimeThemeEntry[]; }
interface AnimeDetail { name: string; synopsis: string; year: number; season: string; images: Array<{ facet: 'poster' | 'cover' | 'Large Cover' | 'Small Cover', link: string }>; animethemes: AnimeThemeForDetail[]; }

// Função para buscar dados da API externa
async function getAnimeDetails(slug: string): Promise<AnimeDetail> {
    const API_URL = `https://api.animethemes.moe/anime/${slug}?include=images,animethemes.song,animethemes.song.artists,animethemes.animethemeentries.videos`;
    let response: Response;
    try {
        response = await fetch(API_URL, { next: { revalidate: 3600 } });
    } catch {
        throw new Error('Não foi possível conectar à API do AnimeThemes. Verifique sua conexão.');
    }
    if (response.status === 404) notFound();
    if (!response.ok) {
        throw new Error(`API retornou status ${response.status}. Tente novamente em instantes.`);
    }
    const data = await response.json();
    if (!data.anime) notFound();
    return data.anime;
}

// Define a interface para as props da página de forma explícita e simples.
interface AnimeDetailPageProps {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Componente principal da página
export default async function AnimeDetailPage({ params }: AnimeDetailPageProps) {
  const { slug } = params;

  // Busca dados críticos — falha aqui mostra 404 ou erro real
  const anime = await getAnimeDetails(slug);

  // Auth e ratings são opcionais — falha aqui não quebra a página
  const [session, ratingsMap] = await Promise.all([
    auth().catch(() => null),
    getThemeRatingDetailsBatch(
      anime.animethemes.map(t => ({ animeSlug: slug, themeSlug: t.slug }))
    ).catch(() => new Map()),
  ]);

  const isLoggedIn = !!session?.user?.id;
  const images = Array.isArray(anime.images) ? anime.images : [];
  const posterImage = images.find(img => img.facet === 'poster') ||
                    images.find(img => img.facet === 'Large Cover') ||
                    images.find(img => img.facet === 'Small Cover');
  const coverImage = images.find(img => img.facet === 'cover' || img.facet === 'Large Cover');

  const themesWithRatings: ThemeWithRating[] = anime.animethemes.map(theme => {
    const r = ratingsMap.get(`${slug}-${theme.slug}`);
    return {
      ...theme,
      ratingData: {
        average_score: r?.averageScore ?? null,
        rating_count: r?.ratingCount ?? 0,
        user_score: r?.userScore ?? null,
      },
    };
  });

  const getThemeNumber = (s: string) => { const match = s.match(/\d+/); return match ? parseInt(match[0], 10) : Infinity; };
  const sorted = [...themesWithRatings].sort((a, b) => getThemeNumber(a.slug) - getThemeNumber(b.slug));
  const openings = sorted.filter(t => t.slug.startsWith('OP'));
  const endings  = sorted.filter(t => t.slug.startsWith('ED'));
  const others   = sorted.filter(t => !t.slug.startsWith('OP') && !t.slug.startsWith('ED'));

  return (
    <main className="container mx-auto p-4 md:p-8 text-white">
      <section className="relative h-48 md:h-64 rounded-lg overflow-hidden mb-6 shadow-lg bg-slate-900/50 backdrop-blur-sm border border-slate-300/10">
        {coverImage && (
          <Image
            src={coverImage.link}
            alt={`Cover image for ${anime.name}`}
            fill
            className="object-cover opacity-30"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
      </section>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        <div className="md:w-1/4 flex-shrink-0 relative -mt-24 md:-mt-32 z-10">
          <div className="relative w-full h-auto aspect-[2/3] rounded-lg overflow-hidden shadow-xl bg-slate-900/50 backdrop-blur-sm border border-slate-300/10">
            {posterImage && (
              <Image
                src={posterImage.link}
                alt={`Poster for ${anime.name}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 25vw, 25vw"
              />
            )}
          </div>
          <div className="mt-4 text-center md:text-left">
            <h1 className="text-3xl font-bold text-white">{anime.name}</h1>
            <p className="text-lg text-slate-400">{anime.year} | {anime.season}</p>
          </div>
        </div>

        <div className="md:w-3/4">
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-slate-300/10">
            <h2 className="text-xl font-semibold text-white mb-3">Sinopse</h2>
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{anime.synopsis || "Sinopse não disponível."}</p>
          </div>

          <div className="mt-8">
            <h2 className="text-2xl font-bold text-white mb-4">Músicas</h2>
            <ThemeListClient
              openings={openings}
              endings={endings}
              others={others}
              animeSlug={slug}
              isLoggedIn={isLoggedIn}
            />
          </div>
        </div>
      </div>
    </main>
  );
}