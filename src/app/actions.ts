'use server'

import { auth } from '@/auth'
import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Schemas de validação
const RatingSchema = z.object({
  animeSlug: z.string().min(1),
  themeSlug: z.string().min(1),
  score: z.union([
    z.string().transform(val => parseFloat(val)),
    z.null(),
    z.undefined(),
  ]).optional().transform(val => {
    if (val === null || val === undefined) return null;
    const parsed = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(parsed) ? null : parsed;
  }).refine(val => val === null || (val >= 0 && val <= 10)),
});

const PlaylistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
});

const PlaylistThemeSchema = z.object({
  playlistId: z.string().min(1).transform(val => parseInt(val)),
  themeId: z.string().min(1).transform(val => parseInt(val)),
});

const PlaylistActionSchema = z.object({
  playlistId: z.string().min(1).transform(val => parseInt(val)),
});

const RemoveThemeSchema = z.object({
  playlistId: z.string().min(1).transform(val => parseInt(val)),
  playlistThemeId: z.string().min(1).transform(val => parseInt(val)),
});

// Salvar, atualizar ou remover avaliação
export async function saveRating(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Você precisa estar logado para avaliar.');

  const userId = session.user.id;

  const validated = RatingSchema.safeParse({
    animeSlug: formData.get('animeSlug'),
    themeSlug: formData.get('themeSlug'),
    score: formData.get('score'),
  });

  if (!validated.success) throw new Error(`Dados inválidos: ${validated.error.message}`);

  const { animeSlug, themeSlug, score } = validated.data;

  let animeId: number | null = null;
  let themeId: number | null = null;

  if (score !== null) {
    try {
      const res = await fetch(`https://api.animethemes.moe/anime/${animeSlug}?include=animethemes`);
      if (res.ok) {
        const data = await res.json();
        animeId = data.anime?.id ?? null;
        const theme = data.anime?.animethemes?.find(
          (t: { id: number; slug: string }) => t.slug === themeSlug
        );
        themeId = theme?.id ?? null;
      }
    } catch {
      // IDs são opcionais — continua sem eles
    }
  }

  if (score === null) {
    await sql`
      DELETE FROM ratings
      WHERE user_id = ${userId}
        AND anime_slug = ${animeSlug}
        AND theme_slug = ${themeSlug}
    `;
  } else {
    await sql`
      INSERT INTO ratings (user_id, anime_slug, theme_slug, anime_id, theme_id, score)
      VALUES (${userId}, ${animeSlug}, ${themeSlug}, ${animeId}, ${themeId}, ${score})
      ON CONFLICT (user_id, anime_slug, theme_slug)
      DO UPDATE SET score = EXCLUDED.score,
                    anime_id = EXCLUDED.anime_id,
                    theme_id = EXCLUDED.theme_id
    `;
  }

  revalidatePath(`/anime/${animeSlug}`);
}

// Detalhes de avaliação de um tema
export async function getThemeRatingDetails(animeSlug: string, themeSlug: string) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const rows = await sql`
    SELECT
      ROUND(AVG(score)::numeric, 1) AS average_score,
      COUNT(*)::int                 AS rating_count
    FROM ratings
    WHERE anime_slug = ${animeSlug} AND theme_slug = ${themeSlug}
  `;

  let userScore: number | null = null;
  if (userId) {
    const ur = await sql`
      SELECT score FROM ratings
      WHERE user_id = ${userId}
        AND anime_slug = ${animeSlug}
        AND theme_slug = ${themeSlug}
    `;
    userScore = ur[0]?.score ?? null;
  }

  const row = rows[0];
  return {
    averageScore: row?.average_score ? parseFloat(Number(row.average_score).toFixed(1)) : null,
    ratingCount: row?.rating_count ?? 0,
    userScore,
  };
}

// Buscar avaliações em lote (usado na home page)
export async function getThemeRatingDetailsBatch(
  themes: Array<{ animeSlug: string; themeSlug: string }>
): Promise<Map<string, { averageScore: number | null; ratingCount: number; userScore: number | null }>> {
  const results = new Map<string, { averageScore: number | null; ratingCount: number; userScore: number | null }>();

  if (themes.length === 0) return results;

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const animeSlugs = [...new Set(themes.map(t => t.animeSlug))];

  // Busca estatísticas gerais em um único query
  const stats = await sql`
    SELECT
      anime_slug,
      theme_slug,
      ROUND(AVG(score)::numeric, 1) AS average_score,
      COUNT(*)::int                  AS rating_count
    FROM ratings
    WHERE anime_slug = ANY(${animeSlugs})
    GROUP BY anime_slug, theme_slug
  `;

  // Busca avaliações do usuário se logado
  const userRatingsMap = new Map<string, number>();
  if (userId) {
    const userRatings = await sql`
      SELECT anime_slug, theme_slug, score
      FROM ratings
      WHERE user_id = ${userId}
        AND anime_slug = ANY(${animeSlugs})
    `;
    userRatings.forEach(r => {
      userRatingsMap.set(`${r.anime_slug}-${r.theme_slug}`, Number(r.score));
    });
  }

  // Monta mapa de resultados para os temas pedidos
  const statsMap = new Map<string, { averageScore: number | null; ratingCount: number }>();
  stats.forEach(row => {
    statsMap.set(`${row.anime_slug}-${row.theme_slug}`, {
      averageScore: row.average_score ? parseFloat(Number(row.average_score).toFixed(1)) : null,
      ratingCount: Number(row.rating_count),
    });
  });

  themes.forEach(theme => {
    const key = `${theme.animeSlug}-${theme.themeSlug}`;
    const stat = statsMap.get(key);
    if (stat && stat.ratingCount > 0) {
      results.set(key, {
        ...stat,
        userScore: userRatingsMap.get(key) ?? null,
      });
    }
  });

  return results;
}

// Top 100 temas por tipo
export async function getTopRatedThemes(type: 'OP' | 'ED' | 'IN', limit = 100) {
  const rows = await sql`
    SELECT
      anime_slug,
      theme_slug,
      ROUND(AVG(score)::numeric, 1) AS average_score,
      COUNT(*)::int                  AS rating_count
    FROM ratings
    WHERE theme_slug LIKE ${type + '%'}
    GROUP BY anime_slug, theme_slug
    HAVING COUNT(*) >= 1
    ORDER BY average_score DESC, rating_count DESC
    LIMIT ${limit}
  `;

  return rows.map(r => ({
    anime_slug: r.anime_slug as string,
    theme_slug: r.theme_slug as string,
    average_score: parseFloat(Number(r.average_score).toFixed(1)),
    rating_count: Number(r.rating_count),
  }));
}

// Playlists do usuário logado
export async function getUserPlaylists() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const rows = await sql`
    SELECT id, name
    FROM playlists
    WHERE user_id = ${session.user.id}
    ORDER BY created_at DESC
  `;
  return rows as { id: number; name: string }[];
}

// Adicionar tema a playlist
export async function addThemeToPlaylist(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: 'Usuário não autenticado.' };

    const validated = PlaylistThemeSchema.safeParse({
      playlistId: formData.get('playlistId'),
      themeId: formData.get('themeId'),
    });
    if (!validated.success) return { success: false, message: 'Dados inválidos.' };

    const { playlistId, themeId } = validated.data;
    const userId = session.user.id;

    const owned = await sql`
      SELECT id FROM playlists WHERE id = ${playlistId} AND user_id = ${userId}
    `;
    if (owned.length === 0) return { success: false, message: 'Playlist não encontrada.' };

    await sql`
      INSERT INTO playlist_themes (playlist_id, theme_id) VALUES (${playlistId}, ${themeId})
      ON CONFLICT (playlist_id, theme_id) DO NOTHING
    `;

    revalidatePath(`/playlists/${playlistId}`);
    return { success: true, message: 'Música adicionada com sucesso!' };
  } catch (error) {
    console.error('addThemeToPlaylist error:', error);
    return { success: false, message: 'Erro ao adicionar música.' };
  }
}

// Criar playlist (form action — retorno void para compatibilidade com <form action>)
export async function createPlaylist(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const validated = PlaylistSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    isPublic: formData.get('isPublic') === 'on',
  });
  if (!validated.success) return;

  const { name, description, isPublic } = validated.data;

  await sql`
    INSERT INTO playlists (user_id, name, description, is_public)
    VALUES (${session.user.id}, ${name}, ${description ?? null}, ${isPublic})
  `;

  revalidatePath('/playlists');
}

// Criar playlist retornando o ID — usada pelo AddToPlaylistButton
export async function createPlaylistWithId(name: string): Promise<{ success: boolean; id?: number; message?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: 'Usuário não autenticado.' };

    if (!name.trim()) return { success: false, message: 'Nome inválido.' };

    const rows = await sql`
      INSERT INTO playlists (user_id, name, description, is_public)
      VALUES (${session.user.id}, ${name.trim()}, null, false)
      RETURNING id
    `;

    revalidatePath('/playlists');
    return { success: true, id: rows[0].id as number };
  } catch (error) {
    console.error('createPlaylistWithId error:', error);
    return { success: false, message: 'Erro ao criar playlist.' };
  }
}

// Deletar playlist
export async function deletePlaylist(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Usuário não autenticado.' };

  const validated = PlaylistActionSchema.safeParse({ playlistId: formData.get('playlistId') });
  if (!validated.success) return { success: false, message: 'Dados inválidos.' };

  const { playlistId } = validated.data;
  const userId = session.user.id;

  const owned = await sql`SELECT user_id FROM playlists WHERE id = ${playlistId}`;
  if (owned.length === 0 || owned[0].user_id !== userId) {
    return { success: false, message: 'Não autorizado.' };
  }

  await sql`DELETE FROM playlists WHERE id = ${playlistId}`;

  revalidatePath('/playlists');
  return { success: true, message: 'Playlist deletada!' };
}

// Remover tema de playlist
export async function removeThemeFromPlaylist(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Usuário não autenticado.' };

  const validated = RemoveThemeSchema.safeParse({
    playlistId: formData.get('playlistId'),
    playlistThemeId: formData.get('playlistThemeId'),
  });
  if (!validated.success) return { success: false, message: 'Dados inválidos.' };

  const { playlistId, playlistThemeId } = validated.data;

  const owned = await sql`SELECT user_id FROM playlists WHERE id = ${playlistId}`;
  if (owned.length === 0 || owned[0].user_id !== session.user.id) {
    return { success: false, message: 'Não autorizado.' };
  }

  await sql`DELETE FROM playlist_themes WHERE id = ${playlistThemeId}`;

  revalidatePath(`/playlists/${playlistId}`);
  return { success: true, message: 'Música removida!' };
}

export interface PlaylistThemeItemData {
  playlist_theme_id: number;
  theme_id: number;
}

export interface PlaylistDetails {
  id: number;
  name: string;
  description: string | null;
  themes: PlaylistThemeItemData[];
  is_public: boolean;
  user_id: string;
}

// Detalhes de uma playlist
export async function getPlaylistDetails(playlistId: number): Promise<PlaylistDetails | null> {
  const rows = await sql`
    SELECT id, name, description, user_id, is_public
    FROM playlists
    WHERE id = ${playlistId}
  `;
  if (rows.length === 0) return null;

  const playlist = rows[0];

  if (!playlist.is_public) {
    const session = await auth();
    if (!session?.user?.id) return null;

    const userId = session.user.id;
    const isOwner = playlist.user_id === userId;

    if (!isOwner) {
      const collab = await sql`
        SELECT id FROM playlist_collaborators
        WHERE playlist_id = ${playlistId}
          AND user_id = ${userId}
          AND status = 'accepted'
      `;
      if (collab.length === 0) return null;
    }
  }

  const themes = await sql`
    SELECT id, theme_id
    FROM playlist_themes
    WHERE playlist_id = ${playlistId}
    ORDER BY created_at ASC
  `;

  return {
    id: playlist.id as number,
    name: playlist.name as string,
    description: playlist.description as string | null,
    is_public: playlist.is_public as boolean,
    user_id: playlist.user_id as string,
    themes: themes.map(t => ({
      playlist_theme_id: t.id as number,
      theme_id: t.theme_id as number,
    })),
  };
}

// Avaliações do usuário logado (para a página my-ratings)
export async function getUserRatings() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const rows = await sql`
    SELECT anime_slug, theme_slug, anime_id, theme_id, score, created_at
    FROM ratings
    WHERE user_id = ${session.user.id}
    ORDER BY created_at DESC
  `;

  return rows as {
    anime_slug: string;
    theme_slug: string;
    anime_id: number | null;
    theme_id: number | null;
    score: number;
    created_at: string;
  }[];
}

// --- Cache de dados do AnimeThemes ---

interface CachedAnimeData {
  name: string;
  slug: string;
  images: Array<{ facet: string; link: string }>;
  jikanPoster?: string | null;
  animethemes: Array<{
    id: number;
    slug: string;
    song: { title: string; artists?: Array<{ id: number; name: string; slug?: string }> } | null;
    animethemeentries: Array<{ videos: Array<{ link: string }> }>;
  }>;
}

function resolveAtPoster(images: Array<{ facet: string; link: string }>): string | null {
  return (
    images.find(img => img.facet === 'poster')?.link ||
    images.find(img => img.facet === 'Large Cover')?.link ||
    images.find(img => img.facet === 'Small Cover')?.link ||
    null
  );
}

async function fetchJikanPoster(slug: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(slug.replace(/-/g, ' '));
    const res = await fetch(`https://api.jikan.moe/v4/anime?q=${query}&limit=1`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const anime = data.data?.[0];
    return anime?.images?.webp?.large_image_url || anime?.images?.jpg?.large_image_url || null;
  } catch {
    return null;
  }
}

async function fetchAnimeBatch(slugs: string[]): Promise<Map<string, CachedAnimeData>> {
  if (slugs.length === 0) return new Map();

  const cachedRows = await sql`
    SELECT slug, data FROM anime_cache
    WHERE slug = ANY(${slugs})
    AND cached_at > NOW() - INTERVAL '24 hours'
  `;

  const result = new Map<string, CachedAnimeData>();
  const cachedSlugs = new Set<string>();
  for (const row of cachedRows) {
    result.set(row.slug as string, row.data as CachedAnimeData);
    cachedSlugs.add(row.slug as string);
  }

  const missingSlugs = slugs.filter(s => !cachedSlugs.has(s));
  if (missingSlugs.length === 0) return result;

  const CONCURRENT = 10;
  for (let i = 0; i < missingSlugs.length; i += CONCURRENT) {
    const batch = missingSlugs.slice(i, i + CONCURRENT);
    const fetched = await Promise.all(
      batch.map(async slug => {
        const [atRes, jikanPoster] = await Promise.all([
          fetch(
            `https://api.animethemes.moe/anime/${slug}?include=images,animethemes.song,animethemes.song.artists,animethemes.animethemeentries.videos`,
            {
              next: { revalidate: 86400 },
              headers: { 'User-Agent': 'AniSongs/1.0 (https://github.com/marioporfirio/anisongs)' },
              signal: AbortSignal.timeout(8000),
            }
          ).then(r => r.ok ? r.json() : null).catch(() => null),
          fetchJikanPoster(slug),
        ]);

        const anime: CachedAnimeData | null = atRes?.anime ?? null;
        if (!anime) return null;
        anime.jikanPoster = jikanPoster;
        return { slug, anime };
      })
    );

    for (const item of fetched) {
      if (!item) continue;
      result.set(item.slug, item.anime);
      await sql`
        INSERT INTO anime_cache (slug, data, cached_at)
        VALUES (${item.slug}, ${JSON.stringify(item.anime)}, NOW())
        ON CONFLICT (slug) DO UPDATE
          SET data = EXCLUDED.data, cached_at = NOW()
      `;
    }
  }

  return result;
}

export interface EnrichedTheme {
  id: number;
  slug: string;
  song: { title: string; artists?: Array<{ id: number; name: string; slug?: string }> } | null;
  animethemeentries: Array<{ videos: Array<{ link: string }> }>;
  anime: { name: string; slug: string; posterUrl: string | null };
}

export interface TopThemeResult extends EnrichedTheme {
  average_score: number;
  rating_count: number;
  user_score: number | null;
}

export interface MyRatingResult extends EnrichedTheme {
  user_score: number;
  created_at: string;
}

export async function getTopThemesWithData(type: 'OP' | 'ED' | 'IN', limit = 100): Promise<TopThemeResult[]> {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const rows = await sql`
    SELECT anime_slug, theme_slug,
           ROUND(AVG(score)::numeric, 1) AS average_score,
           COUNT(*)::int                  AS rating_count
    FROM ratings
    WHERE theme_slug LIKE ${type + '%'}
    GROUP BY anime_slug, theme_slug
    HAVING COUNT(*) >= 1
    ORDER BY average_score DESC, rating_count DESC
    LIMIT ${limit}
  `;

  if (rows.length === 0) return [];

  const slugs = [...new Set(rows.map(r => r.anime_slug as string))];
  const [animeMap, userScoreMap] = await Promise.all([
    fetchAnimeBatch(slugs),
    userId
      ? sql`
          SELECT anime_slug, theme_slug, score
          FROM ratings
          WHERE user_id = ${userId}
            AND anime_slug = ANY(${slugs})
            AND theme_slug LIKE ${type + '%'}
        `.then(rs => {
          const m = new Map<string, number>();
          rs.forEach(r => m.set(`${r.anime_slug}-${r.theme_slug}`, Number(r.score)));
          return m;
        })
      : Promise.resolve(new Map<string, number>()),
  ]);

  const results: TopThemeResult[] = [];
  for (const row of rows) {
    const animeSlug = row.anime_slug as string;
    const themeSlug = row.theme_slug as string;
    const anime = animeMap.get(animeSlug);
    const userScore = userScoreMap.get(`${animeSlug}-${themeSlug}`) ?? null;

    if (!anime) {
      const name = animeSlug.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const label = themeSlug.startsWith('OP')
        ? `Opening ${themeSlug.replace('OP', '') || '1'}`
        : themeSlug.startsWith('ED')
        ? `Ending ${themeSlug.replace('ED', '') || '1'}`
        : `Insert Song ${themeSlug}`;
      results.push({
        id: results.length + 1,
        slug: themeSlug,
        song: { title: label, artists: [] },
        animethemeentries: [],
        anime: { name, slug: animeSlug, posterUrl: null },
        average_score: parseFloat(Number(row.average_score).toFixed(1)),
        rating_count: Number(row.rating_count),
        user_score: userScore,
      });
      continue;
    }

    const theme = anime.animethemes?.find(t => t.slug === themeSlug);
    if (!theme) continue;

    results.push({
      ...theme,
      anime: {
        name: anime.name,
        slug: anime.slug,
        posterUrl: anime.jikanPoster || resolveAtPoster(anime.images),
      },
      average_score: parseFloat(Number(row.average_score).toFixed(1)),
      rating_count: Number(row.rating_count),
      user_score: userScore,
    });
  }

  return results;
}

export async function getMyRatingsWithData(): Promise<MyRatingResult[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const rows = await sql`
    SELECT anime_slug, theme_slug, score, created_at
    FROM ratings
    WHERE user_id = ${session.user.id}
    ORDER BY created_at DESC
  `;

  if (rows.length === 0) return [];

  const slugs = [...new Set(rows.map(r => r.anime_slug as string))];
  const animeMap = await fetchAnimeBatch(slugs);

  const results: MyRatingResult[] = [];
  for (const row of rows) {
    const animeSlug = row.anime_slug as string;
    const themeSlug = row.theme_slug as string;
    const anime = animeMap.get(animeSlug);

    if (!anime) {
      const name = animeSlug.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const label = themeSlug.startsWith('OP')
        ? `Opening ${themeSlug.replace('OP', '') || '1'}`
        : themeSlug.startsWith('ED')
        ? `Ending ${themeSlug.replace('ED', '') || '1'}`
        : `Insert Song ${themeSlug}`;
      results.push({
        id: results.length + 1,
        slug: themeSlug,
        song: { title: label, artists: [] },
        animethemeentries: [],
        anime: { name, slug: animeSlug, posterUrl: null },
        user_score: Number(row.score),
        created_at: row.created_at as string,
      });
      continue;
    }

    const theme = anime.animethemes?.find(t => t.slug === themeSlug);
    if (!theme) continue;

    results.push({
      ...theme,
      anime: {
        name: anime.name,
        slug: anime.slug,
        posterUrl: anime.jikanPoster || resolveAtPoster(anime.images),
      },
      user_score: Number(row.score),
      created_at: row.created_at as string,
    });
  }

  return results;
}

export async function deleteAllMyRatings(): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false };

  await sql`DELETE FROM ratings WHERE user_id = ${session.user.id}`;
  revalidatePath('/my-ratings');
  return { success: true };
}
