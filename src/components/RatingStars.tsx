// src/components/RatingStars.tsx
'use client'

import { useState } from 'react'
import { saveRating } from '@/app/actions'
import type { FormEvent } from 'react'

interface RatingStarsProps {
  animeSlug: string
  themeSlug: string
  userScore: number | null
  averageScore: number | null
  ratingCount: number
  isLoggedIn: boolean
}

// Ícone de estrela SVG - AGORA ACEITA onMouseEnter
const StarIcon = ({ className, onMouseEnter }: { className?: string; onMouseEnter?: () => void }) => (
  <svg 
    className={className} 
    onMouseEnter={onMouseEnter} // Prop aplicada aqui
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor"
  >
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </svg>
)

export default function RatingStars({
  animeSlug,
  themeSlug,
  userScore,
  averageScore,
  ratingCount,
  isLoggedIn,
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0)

  return (
    <form action={saveRating} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <input type="hidden" name="animeSlug" value={animeSlug} />
      <input type="hidden" name="themeSlug" value={themeSlug} />

      <div className="flex items-center gap-1 text-sm text-yellow-400">
        <StarIcon className="w-5 h-5" />
        <span className="font-bold text-lg">{averageScore?.toFixed(1) ?? 'N/A'}</span>
        <span className="text-gray-400">({ratingCount} votos)</span>
      </div>

      {isLoggedIn && (
        <div 
          className="flex items-center"
          onMouseLeave={() => setHoverRating(0)}
        >
          {[...Array(10)].map((_, i) => {
            const ratingValue = i + 1
            return (
              <label key={ratingValue} className="cursor-pointer">
                <input
                  type="radio"
                  name="score"
                  value={ratingValue}
                  className="sr-only"
                  onClick={(e: FormEvent<HTMLInputElement>) => {
                    (e.currentTarget as HTMLInputElement).form?.requestSubmit()
                  }}
                />
                <StarIcon
                  className={`w-6 h-6 transition-colors ${
                    ratingValue <= (hoverRating || userScore || 0)
                      ? 'text-yellow-400'
                      : 'text-gray-600'
                  }`}
                  onMouseEnter={() => setHoverRating(ratingValue)}
                />
              </label>
            )
          })}
        </div>
      )}
    </form>
  )
}