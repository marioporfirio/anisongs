// Client-side functions for ratings
import { createBrowserClient } from '@supabase/ssr';

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
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .rpc('get_theme_rating_details', {
        p_anime_slug: animeSlug,
        p_theme_slug: themeSlug,
        p_user_id: user?.id,
      })
      .single();

    if (error) {
      console.error("Error calling RPC get_theme_rating_details:", error);
      return { averageScore: null, ratingCount: 0, userScore: null };
    }
    
    const result = data as {
      average_score: number | null;
      rating_count: number;
      user_score: number | null;
    };
    
    const averageScore = result.average_score ? parseFloat(Number(result.average_score).toFixed(1)) : null;

    return {
      averageScore,
      ratingCount: result.rating_count || 0,
      userScore: result.user_score || null,
    };
  } catch (error) {
    console.error('Error in getThemeRatingDetailsClient:', error);
    return { averageScore: null, ratingCount: 0, userScore: null };
  }
}