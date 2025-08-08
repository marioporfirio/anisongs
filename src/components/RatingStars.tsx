// src/components/RatingStars.tsx
'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { saveRating, getThemeRatingDetails } from '@/app/actions'
import type { MouseEvent } from 'react'; // Importe o tipo MouseEvent

interface RatingStarsProps {
  animeSlug: string
  themeSlug: string
  isLoggedIn: boolean
}

const StarIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor"
  >
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </svg>
);

export default function RatingStars({
  animeSlug,
  themeSlug,
  isLoggedIn,
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [currentAverageScore, setCurrentAverageScore] = useState<number | null>(null);
  const [currentRatingCount, setCurrentRatingCount] = useState<number>(0);
  const [currentUserScore, setCurrentUserScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, startSubmitTransition] = useTransition();

  const fetchDetails = useCallback(async () => {
    try {
      const details = await getThemeRatingDetails(animeSlug, themeSlug);
      setCurrentAverageScore(details.averageScore);
      setCurrentRatingCount(details.ratingCount);
      setCurrentUserScore(details.userScore);
    } catch (error) {
      console.error("Failed to fetch rating details:", error);
    } finally {
      setIsLoading(false);
    }
  }, [animeSlug, themeSlug]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleRatingSubmit = (scoreToSave: number | null) => {
    if (!isLoggedIn || isSubmitting) return;
    setCurrentUserScore(scoreToSave);
    
    startSubmitTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('animeSlug', animeSlug);
        formData.append('themeSlug', themeSlug);
        if (scoreToSave !== null) {
          formData.append('score', scoreToSave.toString());
        }
        await saveRating(formData);
        await fetchDetails(); 
      } catch (error) {
        console.error("Failed to save rating:", error);
        fetchDetails(); 
      }
    });
  };

  const handleStarClick = (e: MouseEvent<HTMLButtonElement>, ratingValue: number) => {
    // AQUI ESTÁ A MUDANÇA PRINCIPAL!
    e.stopPropagation(); 

    if (ratingValue === currentUserScore) {
      handleRatingSubmit(null);
    } else {
      handleRatingSubmit(ratingValue);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-400 h-10 flex items-center">Loading ratings...</div>;
  }

  const displayScore = hoverRating || currentUserScore || 0;

  const renderRatingControls = () => {
    if (!isLoggedIn) return null;

    return (
      <div 
        className="flex items-center relative"
        onMouseLeave={() => setHoverRating(0)}
      >
        {[...Array(10)].map((_, i) => {
          const ratingValue = i + 1;
          const baseColorClass = 
            displayScore <= 2 ? 'text-red-500'
            : displayScore <= 4 ? 'text-orange-400'
            : displayScore <= 6 ? 'text-yellow-400'
            : displayScore <= 8 ? 'text-teal-400'
            : 'text-indigo-400';
          const starIconClassName = `w-6 h-6 transition-colors duration-200 ${
            ratingValue <= displayScore ? baseColorClass : 'text-gray-600'
          } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`;

          return (
            <button
              key={ratingValue}
              type="button"
              className="appearance-none bg-transparent border-none p-0"
              // AQUI ESTÁ A MUDANÇA PRINCIPAL!
              // Passamos o evento (e) para a função handler.
              onClick={(e) => handleStarClick(e, ratingValue)}
              onMouseEnter={() => { 
                if (!isSubmitting) setHoverRating(ratingValue);
              }}
              disabled={isSubmitting}
              aria-label={`Rate ${ratingValue} out of 10`}
            >
              <StarIcon className={starIconClassName} />
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <div className="flex items-center gap-1 text-sm text-yellow-400">
        <StarIcon className="w-5 h-5" />
        <span className="font-bold text-lg">{currentAverageScore?.toFixed(1) ?? 'N/A'}</span>
        <span className="text-gray-400">({currentRatingCount} votos)</span>
      </div>

      {renderRatingControls()}
      {isSubmitting && <div className="text-sm text-gray-400">Saving...</div>}
    </div>
  );
}