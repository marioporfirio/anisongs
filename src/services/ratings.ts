// Re-exporta funções de avaliação das server actions
// As queries agora rodam server-side com Neon
export { getThemeRatingDetailsBatch, getTopRatedThemes } from '@/app/actions'

// Cliente para buscar top rated (chamado de componentes cliente via server actions)
export async function getTopRatedThemesClient(
  type: 'OP' | 'ED' | 'IN',
  limit = 100
): Promise<{
  anime_slug: string;
  theme_slug: string;
  anime_id?: number;
  theme_id?: number;
  average_score: number;
  rating_count: number;
}[]> {
  // Esta função é chamada de server components — usa a action diretamente
  const { getTopRatedThemes } = await import('@/app/actions')
  return getTopRatedThemes(type, limit)
}
