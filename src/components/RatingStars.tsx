// src/components/RatingStars.tsx
'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { saveRating, getThemeRatingDetails } from '@/app/actions'

interface RatingStarsProps {
  animeSlug: string
  themeSlug: string
  isLoggedIn: boolean
}

// Ícone de estrela SVG - onMouseEnter foi movido para o wrapper do ícone
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
    // Não precisa mais setar isLoading aqui, o estado inicial já cuida disso
    try {
      const details = await getThemeRatingDetails(animeSlug, themeSlug);
      setCurrentAverageScore(details.averageScore);
      setCurrentRatingCount(details.ratingCount);
      setCurrentUserScore(details.userScore); // A lógica de login agora é tratada no backend/ação
    } catch (error) {
      console.error("Failed to fetch rating details:", error);
    } finally {
      setIsLoading(false);
    }
  }, [animeSlug, themeSlug]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Função centralizada para lidar com a submissão
  const handleRatingSubmit = (scoreToSave: number | null) => {
    if (!isLoggedIn || isSubmitting) return; // Proteção extra

    // Atualização otimista da UI para resposta imediata
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
        // Re-sincroniza com o servidor para obter a média e contagem atualizadas
        await fetchDetails(); 
      } catch (error) {
        console.error("Failed to save rating:", error);
        // Em caso de erro, reverte a atualização otimista buscando os dados reais
        fetchDetails(); 
      }
    });
  };

  // Nova função para lidar com o clique na estrela
  const handleStarClick = (ratingValue: number) => {
    // Se o usuário clicar na nota atual, remove a nota (envia null)
    if (ratingValue === currentUserScore) {
      handleRatingSubmit(null);
    } else {
      // Caso contrário, define a nova nota
      handleRatingSubmit(ratingValue);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-400 h-10 flex items-center">Loading ratings...</div>;
  }

  // A nota a ser exibida (hover ou a nota atual do usuário)
  const displayScore = hoverRating || currentUserScore || 0;

  const renderRatingControls = () => {
    if (!isLoggedIn) return null;

    return (
      <div 
        className="flex items-center relative"
        onMouseLeave={() => setHoverRating(0)} // Reseta o hover ao sair da área das estrelas
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
            // Agora usamos um botão para semântica e acessibilidade
            <button
              key={ratingValue}
              type="button" // Previne submissão de formulário
              className="appearance-none bg-transparent border-none p-0"
              onClick={() => handleStarClick(ratingValue)}
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
    // Não precisamos mais de um formulário, pode ser um div
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