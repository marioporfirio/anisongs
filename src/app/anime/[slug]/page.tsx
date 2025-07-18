// src/app/anime/[slug]/page.tsx

import Image from "next/image";
import ThemeListClient from "./ThemeListClient";
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
    const response = await fetch(API_URL, { next: { revalidate: 3600 } });
    if (!response.ok) { throw new Error('Falha ao buscar dados do anime da API externa.'); }
    const data = await response.json();
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

  const cookieStore = await cookies();

  const supabase = createServerClient(
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
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );

  const [userResponse, anime] = await Promise.all([
    supabase.auth.getUser(),
    getAnimeDetails(slug)
  ]);

  const user = userResponse.data.user;
  const posterImage = anime.images.find(img => img.facet === 'poster') ||
                    anime.images.find(img => img.facet === 'Large Cover') ||
                    anime.images.find(img => img.facet === 'Small Cover');

  const themesWithRatings = await Promise.all(
    anime.animethemes.map(async (theme): Promise<ThemeWithRating> => {
      const { data: avgData } = await supabase.rpc('get_theme_average_rating', { p_anime_slug: slug, p_theme_slug: theme.slug });
      let userScore = null;
      if (user) {
        const { data: userRating } = await supabase.from('ratings').select('score').eq('user_id', user.id).eq('anime_slug', slug).eq('theme_slug', theme.slug).single();
        userScore = userRating?.score ?? null;
      }
      return { ...theme, ratingData: { average_score: avgData?.[0]?.average_score ?? null, rating_count: avgData?.[0]?.rating_count ?? 0, user_score: userScore } };
    })
  );

  const openings: ThemeWithRating[] = [];
  const endings: ThemeWithRating[] = [];
  const others: ThemeWithRating[] = [];
  const getThemeNumber = (s: string) => { const match = s.match(/\d+/); return match ? parseInt(match[0], 10) : Infinity; };
  const sortedThemes = [...themesWithRatings].sort((a, b) => getThemeNumber(a.slug) - getThemeNumber(b.slug));
  sortedThemes.forEach(theme => {
    if (theme.slug.startsWith('OP')) openings.push(theme);
    else if (theme.slug.startsWith('ED')) endings.push(theme);
    else others.push(theme);
  });

  return (
    <main className="container mx-auto p-4 md:p-8 text-white">
        <section className="flex flex-col md:flex-row gap-8 mb-10">
            <div className="md:w-1/4 w-2/3 mx-auto flex-shrink-0">
                <Image src={posterImage?.link || '/placeholder.png'} alt={`Poster de ${anime.name}`} width={400} height={600} className="w-full h-auto rounded-lg shadow-lg" priority />
            </div>
            <div className="md:w-3/4">
                <h1 className="text-4xl lg:text-5xl font-bold mb-2">{anime.name}</h1>
                <p className="text-lg text-gray-400 mb-4">{anime.year} • {anime.season}</p>
                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{anime.synopsis || "Sinopse não disponível."}</p>
            </div>
        </section>
        <section>
            <ThemeListClient 
                openings={openings}
                endings={endings}
                others={others}
                animeSlug={slug}
                isLoggedIn={!!user}
            />
        </section>
    </main>
  );
}