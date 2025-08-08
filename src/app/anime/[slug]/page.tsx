// src/app/anime/[slug]/page.tsx

import Image from "next/image";
import ThemeListClient from "./ThemeListClient";
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

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
    if (!response.ok) {
        if (response.status === 404) {
            notFound(); // Dispara o erro 404 do Next.js
        }
        // Para outros erros (500, 503, etc.), lança um erro que será pego pelo try/catch
        throw new Error('Falha ao buscar dados do anime da API externa.');
    }
    const data = await response.json();
    // Se a API retornar 200 mas sem o objeto anime, trata como não encontrado
    if (!data.anime) {
        notFound();
    }
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

  try {
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

    // Busca dados do usuário e do anime em paralelo
    const [userResponse, anime] = await Promise.all([
      supabase.auth.getUser(),
      getAnimeDetails(slug)
    ]);

    const user = userResponse.data.user;
    const images = Array.isArray(anime.images) ? anime.images : [];
    const posterImage = images.find(img => img.facet === 'poster') ||
                      images.find(img => img.facet === 'Large Cover') ||
                      images.find(img => img.facet === 'Small Cover');

    const coverImage = images.find(img => img.facet === 'cover' || img.facet === 'Large Cover');

    // Busca as avaliações para cada música
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

    // Organiza as músicas por tipo (OP, ED, Outros)
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

    // Renderiza a página com sucesso
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
                  isLoggedIn={!!user}
                />
              </div>
            </div>
          </div>
      </main>
    );
  } catch (error) {
    console.error(`Erro ao carregar a página do anime ${slug}:`, error);
    // Renderiza uma página de erro amigável
    return (
      <main className="container mx-auto p-4 md:p-8 text-white text-center">
        <h1 className="text-3xl font-bold text-red-500 mb-4">Erro ao Carregar Dados</h1>
        <p className="text-gray-300">
          Ocorreu um erro inesperado ao tentar buscar as informações deste anime.
        </p>
        <p className="text-gray-400 mt-2">
          A API externa pode estar temporariamente indisponível. Por favor, tente novamente mais tarde.
        </p>
      </main>
    );
  }
}