// src/app/anime/[slug]/page.tsx
import Image from "next/image";
import ThemeListClient from "./ThemeListClient";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Tipagens
export interface RatingData { average_score: number | null; rating_count: number; user_score: number | null; }
export interface ThemeWithRating extends AnimeThemeForDetail { ratingData: RatingData; }
interface Video { link: string; }
interface AnimeThemeEntry { videos: Video[]; }
interface Song { title: string; }
export interface AnimeThemeForDetail { id: number; slug: string; song: Song | null; animethemeentries: AnimeThemeEntry[]; }
interface AnimeDetail { name: string; synopsis: string; year: number; season: string; images: Array<{ facet: 'poster' | 'cover', link: string }>; animethemes: AnimeThemeForDetail[]; }

// Função para buscar dados da API externa
async function getAnimeDetails(slug: string): Promise<AnimeDetail> {
    const API_URL = `https://api.animethemes.moe/anime/${slug}?include=images,animethemes.song,animethemes.animethemeentries.videos`;
    const response = await fetch(API_URL, { next: { revalidate: 3600 } });
    if (!response.ok) { throw new Error('Falha ao buscar dados do anime da API externa.'); }
    const data = await response.json();
    return data.anime;
}

// Componente principal da página
export default async function AnimeDetailPage(props: { params: { slug: string } }) {
  const { slug } = props.params;

  // CORREÇÃO APLICADA AQUI
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          const cookieStore = await cookies();
          return cookieStore.getAll();
        },
        async setAll(cookiesToSet) {
          const cookieStore = await cookies();
          try {
            cookiesToSet.forEach(({ name, value, options }) => 
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignorar erros em Server Components
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
  const posterImage = anime.images.find(img => img.facet === 'poster');

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