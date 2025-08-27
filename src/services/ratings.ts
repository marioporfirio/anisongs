// Client-side functions for ratings
import { createBrowserClient } from '@supabase/ssr';
import { apiCache } from './cache';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getTopRatedThemesClient(type: 'OP' | 'ED' | 'IN', limit: number = 100): Promise<{
  anime_slug: string;
  theme_slug: string;
  anime_id?: number;
  theme_id?: number;
  average_score: number;
  rating_count: number;
}[]> {
  try {
    // Debug: verificar se há dados na tabela ratings
    const { data: testData, error: testError } = await supabase
      .from('ratings')
      .select('anime_slug, theme_slug, anime_id, theme_id, score')
      .limit(5);
    
    console.log('🔍 Dados de teste na tabela ratings:', testData);
    
    if (testError) {
      console.error('❌ Erro ao acessar tabela ratings:', testError);
      return [];
    }
    
    // Tentar função RPC primeiro
    const { data, error } = await supabase
      .rpc('get_top_rated_themes_by_type', {
        p_theme_type: type,
        p_limit: limit
      });

    if (error) {
      console.error('❌ Erro na função RPC:', error);
      
      // Fallback: query manual se RPC falhar
      console.log('🔄 Tentando query manual como fallback...');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('ratings')
        .select('anime_slug, theme_slug, anime_id, theme_id, score')
        .like('theme_slug', `${type}%`)
        .order('score', { ascending: false })
        .limit(limit);
        
      if (fallbackError) {
        console.error('❌ Erro no fallback:', fallbackError);
        return [];
      }
      
      // Processar dados manualmente
       const groupedData = fallbackData?.reduce((acc, rating) => {
         const key = `${rating.anime_slug}-${rating.theme_slug}`;
         if (!acc[key]) {
           acc[key] = {
             anime_slug: rating.anime_slug,
             theme_slug: rating.theme_slug,
             anime_id: rating.anime_id,
             theme_id: rating.theme_id,
             scores: [],
             rating_count: 0
           };
         }
         acc[key].scores.push(rating.score);
         acc[key].rating_count++;
         return acc;
       }, {} as Record<string, {
         anime_slug: string;
         theme_slug: string;
         anime_id?: number;
         theme_id?: number;
         scores: number[];
         rating_count: number;
       }>) || {};
       
       const processedData = Object.values(groupedData).map((item) => ({
         anime_slug: item.anime_slug,
         theme_slug: item.theme_slug,
         anime_id: item.anime_id,
         theme_id: item.theme_id,
         average_score: item.scores.reduce((sum: number, score: number) => sum + score, 0) / item.scores.length,
         rating_count: item.rating_count
       })).sort((a, b) => b.average_score - a.average_score);
      
      console.log('✅ Dados processados manualmente:', processedData);
      return processedData;
    }

    console.log('✅ Dados da RPC:', data);
    return data || [];
  } catch (error) {
    console.error('🚨 Erro geral em getTopRatedThemesClient:', error);
    return [];
  }
}

export async function getThemeRatingDetailsClient(animeSlug: string, themeSlug: string): Promise<{
  averageScore: number | null;
  ratingCount: number;
  userScore: number | null;
}> {
  try {
    // Tentar buscar do cache primeiro
    const cached = apiCache.getRatingData(animeSlug, themeSlug);
    if (cached) {
      console.log(`📦 Rating cache hit: ${animeSlug}-${themeSlug}`);
      return cached;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Buscar estatísticas gerais do tema
    const { data: stats, error: statsError } = await supabase
      .rpc('get_theme_rating_stats', {
        p_anime_slug: animeSlug,
        p_theme_slug: themeSlug
      });

    if (statsError) {
      console.error('Erro ao buscar estatísticas:', statsError);
      return { averageScore: null, ratingCount: 0, userScore: null };
    }

    let userScore = null;
    if (userId) {
      // Buscar avaliação do usuário
      const { data: userRating, error: userError } = await supabase
        .from('ratings')
        .select('score')
        .eq('user_id', userId)
        .eq('anime_slug', animeSlug)
        .eq('theme_slug', themeSlug)
        .single();

      if (!userError && userRating) {
        userScore = userRating.score;
      }
    }

    const result = {
      averageScore: stats?.[0]?.average_score || null,
      ratingCount: stats?.[0]?.rating_count || 0,
      userScore
    };

    // Salvar no cache
    apiCache.setRatingData(animeSlug, themeSlug, result);
    
    return result;
  } catch (error) {
    console.error('Failed to fetch rating details:', error);
    return { averageScore: null, ratingCount: 0, userScore: null };
  }
}

// Função otimizada para buscar ratings em lote
export async function getThemeRatingDetailsBatch(themes: Array<{animeSlug: string, themeSlug: string}>): Promise<Map<string, {
  averageScore: number | null;
  ratingCount: number;
  userScore: number | null;
}>> {
  const results = new Map();
  const uncachedThemes: Array<{animeSlug: string, themeSlug: string}> = [];
  
  // Verificar cache primeiro
  for (const theme of themes) {
    const cached = apiCache.getRatingData(theme.animeSlug, theme.themeSlug);
    if (cached) {
      results.set(`${theme.animeSlug}-${theme.themeSlug}`, cached);
    } else {
      uncachedThemes.push(theme);
    }
  }
  
  if (uncachedThemes.length === 0) {
    console.log(`📦 All ${themes.length} ratings found in cache`);
    return results;
  }
  
  console.log(`🌐 Fetching ${uncachedThemes.length} ratings from database`);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    // Buscar estatísticas em lote (máximo 50 por vez)
    const BATCH_SIZE = 50;
    for (let i = 0; i < uncachedThemes.length; i += BATCH_SIZE) {
      const batch = uncachedThemes.slice(i, i + BATCH_SIZE);
      
      // Buscar estatísticas gerais para o lote
      const statsPromises = batch.map(async (theme) => {
        try {
          const { data: stats, error } = await supabase
            .rpc('get_theme_rating_stats', {
              p_anime_slug: theme.animeSlug,
              p_theme_slug: theme.themeSlug
            });
          
          if (error) {
            console.error(`Erro ao buscar stats para ${theme.animeSlug}-${theme.themeSlug}:`, error);
            return null;
          }
          
          return {
            key: `${theme.animeSlug}-${theme.themeSlug}`,
            animeSlug: theme.animeSlug,
            themeSlug: theme.themeSlug,
            averageScore: stats?.[0]?.average_score || null,
            ratingCount: stats?.[0]?.rating_count || 0
          };
        } catch (error) {
          console.error(`Erro ao processar ${theme.animeSlug}-${theme.themeSlug}:`, error);
          return null;
        }
      });
      
      const statsResults = await Promise.all(statsPromises);
      
      // Buscar avaliações do usuário em lote se logado
      const userRatings = new Map();
      if (userId) {
        try {
          const { data: userRatingData, error: userError } = await supabase
            .from('ratings')
            .select('anime_slug, theme_slug, score')
            .eq('user_id', userId)
            .in('anime_slug', batch.map(t => t.animeSlug))
            .in('theme_slug', batch.map(t => t.themeSlug));
          
          if (!userError && userRatingData) {
            userRatingData.forEach(rating => {
              userRatings.set(`${rating.anime_slug}-${rating.theme_slug}`, rating.score);
            });
          }
        } catch (error) {
          console.error('Erro ao buscar avaliações do usuário:', error);
        }
      }
      
      // Combinar resultados
      statsResults.forEach(stat => {
        if (stat) {
          const result = {
            averageScore: stat.averageScore,
            ratingCount: stat.ratingCount,
            userScore: userRatings.get(stat.key) || null
          };
          
          results.set(stat.key, result);
          // Salvar no cache
          apiCache.setRatingData(stat.animeSlug, stat.themeSlug, result);
        }
      });
    }
  } catch (error) {
    console.error('Erro ao buscar ratings em lote:', error);
  }
  
  return results;
}