// src/components/RatingStars.tsx
'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { saveRating, getThemeRatingDetails } from '@/app/actions'
import type { FormEvent } from 'react'

interface RatingStarsProps {
  animeSlug: string
  themeSlug: string
  isLoggedIn: boolean
  // userScore, averageScore, ratingCount are now fetched internally
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
  const [isLoading, setIsLoading] = useState(true); // For loading initial rating details
  const [isSubmitting, startSubmitTransition] = useTransition();

  const fetchDetails = useCallback(async () => {
    if (!animeSlug || !themeSlug) return;
    setIsLoading(true);
    try {
      const details = await getThemeRatingDetails(animeSlug, themeSlug);
      setCurrentAverageScore(details.averageScore);
      setCurrentRatingCount(details.ratingCount);
      if (isLoggedIn) { // Only set user score if logged in, otherwise it remains null
        setCurrentUserScore(details.userScore);
        console.log("Fetched user score:", details.userScore); // Add this line
      } else {
        setCurrentUserScore(null); // Ensure user score is null if not logged in
      }
    } catch (error) {
      console.error("Failed to fetch rating details:", error);
      // Optionally set some error state to display to user
    } finally {
      setIsLoading(false);
    }
  }, [animeSlug, themeSlug, isLoggedIn]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleRatingSubmit = async (event: FormEvent<HTMLInputElement>) => {
    event.preventDefault(); // Prevent default form submission
    const form = event.currentTarget.form;
    if (!form) return;

    const formData = new FormData(form);
    const score = formData.get('score');
    let scoreToSave: number | null = score ? parseFloat(score as string) : null;

    // If the user clicks on their current score, remove the rating
    if (scoreToSave === currentUserScore) {
      scoreToSave = null;
    }

    if (!isLoggedIn) return; // Not logged in, do nothing

    startSubmitTransition(async () => {
      try {
        const newFormData = new FormData();
        newFormData.append('animeSlug', animeSlug);
        newFormData.append('themeSlug', themeSlug);
        if (scoreToSave !== null) {
          newFormData.append('score', scoreToSave.toString());
        }
        await saveRating(newFormData);
        await fetchDetails(); 
      } catch (error) {
        console.error("Failed to save rating:", error);
        // Handle error (e.g., show a message to the user)
        // Optionally, revert optimistic update or re-fetch old state if needed
      }
    });
  };

  if (isLoading && !currentAverageScore) { // Show basic loader only on initial load
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
          } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`;

          return (
            <label key={ratingValue} className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
              <input
                type="radio"
                name="score"
                value={ratingValue}
                className="sr-only"
                checked={currentUserScore !== null && (currentUserScore as number) === ratingValue} // Reflect current user's score
                onChange={(e) => { e.stopPropagation(); handleRatingSubmit(e); }} // Stop propagation
                disabled={isSubmitting}
              />
              <StarIcon
                className={starIconClassName}
                onMouseEnter={() => { 
                  if (!isSubmitting) {
                    setHoverRating(ratingValue);
                  }
                }}
              />
            </label>
          );
        })}
      </div>
    );
  };

  return (
    <form className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <input type="hidden" name="animeSlug" value={animeSlug} />
      <input type="hidden" name="themeSlug" value={themeSlug} />

      <div className="flex items-center gap-1 text-sm text-yellow-400">
        <StarIcon className="w-5 h-5" />
        <span className="font-bold text-lg">{currentAverageScore?.toFixed(1) ?? 'N/A'}</span>
        <span className="text-gray-400">({currentRatingCount} votos)</span>
      </div>

      {renderRatingControls()}
      {isSubmitting && <div className="text-sm text-gray-400">Saving...</div>}
    </form>
  );
}