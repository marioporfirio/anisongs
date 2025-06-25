// src/app/actions.ts
'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// Função para criar um cliente Supabase para Server Actions
function createSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          return (await cookies()).get(name)?.value
        },
        async set(name: string, value: string, options) {
          // Removido o try-catch, pois a recomendação é ignorar o erro.
          await (await cookies()).set({ name, value, ...options })
        },
        async remove(name: string, options) {
          // Removido o try-catch, pois a recomendação é ignorar o erro.
          await (await cookies()).set({ name, value: '', ...options })
        },
      },
    }
  )
}

export async function saveRating(formData: FormData) {
  const supabase = createSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { throw new Error("Você precisa estar logado para avaliar.") }

  const score = formData.get('score') as string
  const animeSlug = formData.get('animeSlug') as string
  const themeSlug = formData.get('themeSlug') as string

  if (!score || !animeSlug || !themeSlug) { throw new Error("Dados insuficientes para salvar a avaliação.") }

  const { error } = await supabase.from('ratings').upsert({
    user_id: user.id,
    anime_slug: animeSlug,
    theme_slug: themeSlug,
    score: parseFloat(score),
  })

  if (error) {
    console.error("Erro ao salvar avaliação:", error)
    throw new Error("Não foi possível salvar sua avaliação. Tente novamente.")
  }

  revalidatePath(`/anime/${animeSlug}`)
}