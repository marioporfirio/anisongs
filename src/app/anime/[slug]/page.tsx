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

interface Artist {
  id: number;
  name: string;
  slug: string;
}

interface Song {
  title: string;
  artists?: Artist[];
}

export interface AnimeThemeForDetail { id: number; slug: string; song: Song | null; animethemeentries: AnimeThemeEntry[]; }
interface AnimeDetail { name: string; synopsis: string; year: number; season: string; images: Array<{ facet: 'poster' | 'cover' | 'Large Cover' | 'Small Cover', link: string }>; animethemes: AnimeThemeForDetail[]; }

interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  synopsis: string | null;
  year: number | null;
  season: string | null;
  images: {
    jpg: { large_image_url: string | null };
    webp: { large_image_url: string | null };
  };
}

// Busca temas e vídeos — crítico, erro aqui quebra a página
async function getAnimeDetails(slug: string): Promise<AnimeDetail> {
    const API_URL = `https://api.animethemes.moe/anime/${slug}?include=images,animethemes.song,animethemes.song.artists,animethemes.animethemeentries.videos`;
    let response: Response;
    try {
        response = await fetch(API_URL, {
            next: { revalidate: 3600 },
            headers: { 'User-Agent': 'AniSongs/1.0 (https://github.com/marioporfirio/anisongs)' },
        });
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

// Busca metadados da Jikan (MAL) — opcional, falha não quebra a página
async function getJikanData(slug: string): Promise<JikanAnime | null> {
  try {
    const query = encodeURIComponent(slug.replace(/-/g, ' '));
    const response = await fetch(
      `https://api.jikan.moe/v4/anime?q=${query}&limit=1`,
      { next: { revalidate: 86400 } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.data?.[0] ?? null;
  } catch {
    return null;
  }
}

interface AnimeDetailPageProps {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function AnimeDetailPage({ params }: AnimeDetailPageProps) {
  const { slug } = params;

  // AnimeThemes é crítico — falha mostra 404 ou erro real
  const anime = await getAnimeDetails(slug);

  // Jikan, auth e ratings são opcionais — falha não quebra a página
  const [jikan, session, ratingsMap] = await Promise.all([
    getJikanData(slug),
    auth().catch(() => null),
    getThemeRatingDetailsBatch(
      anime.animethemes.map(t => ({ animeSlug: slug, themeSlug: t.slug }))
    ).catch(() => new Map()),
  ]);

  const isLoggedIn = !!session?.user?.id;

  // Metadados: Jikan tem precedência (mais rápido/estável), AnimeThemes como fallback
  const displayName = anime.name;
  const displaySynopsis = jikan?.synopsis || anime.synopsis || '';
  const displayYear = jikan?.year ?? anime.year;
  const displaySeason = jikan?.season ?? anime.season;

  // Poster: preferir MAL (Jikan), depois AnimeThemes
  const jikanPoster = jikan?.images?.webp?.large_image_url || jikan?.images?.jpg?.large_image_url;
  const images = Array.isArray(anime.images) ? anime.images : [];
  const atPoster = images.find(img => img.facet === 'poster') ||
                   images.find(img => img.facet === 'Large Cover') ||
                   images.find(img => img.facet === 'Small Cover');
  const posterSrc = jikanPoster || atPoster?.link || null;

  // Cover banner: apenas AnimeThemes tem isso
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
            alt={`Cover image for ${displayName}`}
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
            {posterSrc && (
              <Image
                src={posterSrc}
                alt={`Poster for ${displayName}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 25vw, 25vw"
              />
            )}
          </div>
          <div className="mt-4 text-center md:text-left">
            <h1 className="text-3xl font-bold text-white">{displayName}</h1>
            <p className="text-lg text-slate-400 capitalize">{displayYear}{displaySeason ? ` | ${displaySeason}` : ''}</p>
          </div>
        </div>

        <div className="md:w-3/4">
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-slate-300/10">
            <h2 className="text-xl font-semibold text-white mb-3">Sinopse</h2>
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{displaySynopsis || "Sinopse não disponível."}</p>
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