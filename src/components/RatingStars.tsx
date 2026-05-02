// src/components/RatingStars.tsx
'use client'

import { useState, useEffect, useTransition, useCallback, useMemo, useRef } from 'react'
import { saveRating, getThemeRatingDetails } from '@/app/actions'

interface RatingStarsProps {
  animeSlug: string
  themeSlug: string
  isLoggedIn: boolean
  displayMode?: 'dropdown' | 'stars'
  initialAverageScore?: number | null
  initialRatingCount?: number
  initialUserScore?: number | null
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
  displayMode = 'stars',
  initialAverageScore,
  initialRatingCount,
  initialUserScore,
}: RatingStarsProps) {
  const hasInitialData = initialAverageScore !== undefined || initialUserScore !== undefined;

  const [hoverRating, setHoverRating] = useState(0);
  const [currentAverageScore, setCurrentAverageScore] = useState<number | null>(initialAverageScore ?? null);
  const [currentRatingCount, setCurrentRatingCount] = useState<number>(initialRatingCount ?? 0);
  const [currentUserScore, setCurrentUserScore] = useState<number | null>(initialUserScore ?? null);
  const [isLoading, setIsLoading] = useState(!hasInitialData);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const selectRef = useRef<HTMLSelectElement>(null);

  const cacheKey = useMemo(() => `${animeSlug}-${themeSlug}`, [animeSlug, themeSlug]);

  // Sync state when initial props change (e.g. home page loads ratings async after first render)
  useEffect(() => {
    if (!isSubmitting) {
      setCurrentUserScore(initialUserScore ?? null);
    }
  }, [initialUserScore]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setCurrentAverageScore(initialAverageScore ?? null);
    setCurrentRatingCount(initialRatingCount ?? 0);
  }, [initialAverageScore, initialRatingCount]);

  const fetchDetails = useCallback(async () => {
    const cached = sessionStorage.getItem(`rating-${cacheKey}`);
    if (cached) {
      try {
        const details = JSON.parse(cached);
        const isExpired = Date.now() - details.timestamp > 5 * 60 * 1000;
        if (!isExpired) {
          setCurrentAverageScore(details.averageScore);
          setCurrentRatingCount(details.ratingCount);
          setCurrentUserScore(details.userScore);
          setIsLoading(false);
          return;
        }
        sessionStorage.removeItem(`rating-${cacheKey}`);
      } catch {
        sessionStorage.removeItem(`rating-${cacheKey}`);
      }
    }

    setIsLoading(true);
    try {
      const details = await getThemeRatingDetails(animeSlug, themeSlug);
      setCurrentAverageScore(details.averageScore);
      setCurrentRatingCount(details.ratingCount);
      setCurrentUserScore(details.userScore);
      sessionStorage.setItem(`rating-${cacheKey}`, JSON.stringify({
        averageScore: details.averageScore,
        ratingCount: details.ratingCount,
        userScore: details.userScore,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error("Failed to fetch rating details:", error);
    } finally {
      setIsLoading(false);
    }
  }, [animeSlug, themeSlug, cacheKey]);

  useEffect(() => {
    // Se dados iniciais foram fornecidos, não busca individualmente
    if (hasInitialData) return;
    fetchDetails();
  }, [fetchDetails, hasInitialData]);

  const handleRatingSubmit = (scoreToSave: number | null) => {
    if (!isLoggedIn || isSubmitting) return;
    
    // Atualização otimista da UI
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
        
        // Atualizar cache local em vez de fazer nova requisição
        const cacheData = {
          averageScore: currentAverageScore,
          ratingCount: currentRatingCount,
          userScore: scoreToSave,
          timestamp: Date.now()
        };
        sessionStorage.setItem(`rating-${cacheKey}`, JSON.stringify(cacheData));
        
      } catch (error) {
        console.error("Failed to save rating:", error);
        // Reverter mudança otimista em caso de erro
        fetchDetails(); 
      }
    });
  };



  if (isLoading) {
    return <div className="text-sm text-gray-400 h-10 flex items-center">Loading ratings...</div>;
  }

  const displayScore = hoverRating || currentUserScore || 0;

  const handleStarClick = (e: React.MouseEvent<HTMLButtonElement>, ratingValue: number) => {
    e.stopPropagation(); 

    if (ratingValue === currentUserScore) {
      handleRatingSubmit(null);
    } else {
      handleRatingSubmit(ratingValue);
    }
  };

  const ratingOptions: number[] = [];
  for (let i = 0; i <= 10; i += 0.5) ratingOptions.push(i);

  const scoreColor = (s: number) =>
    s <= 2 ? 'text-red-400' : s <= 4 ? 'text-orange-400' : s <= 6 ? 'text-yellow-400' : s <= 8 ? 'text-emerald-400' : 'text-purple-400';

  const renderRatingControls = () => {
    if (!isLoggedIn) return null;

    if (displayMode === 'dropdown') {
      const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        const score = value === '' ? null : parseFloat(value);
        handleRatingSubmit(score);
        setIsEditing(false);
      };

      // Tem nota e não está editando → mostra o chip clicável
      if (currentUserScore !== null && !isEditing) {
        return (
          <button
            onClick={() => {
              setIsEditing(true);
              setTimeout(() => selectRef.current?.focus(), 0);
            }}
            className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border transition-all
              ${scoreColor(currentUserScore)} border-current/30 bg-current/5 hover:bg-current/15`}
            title="Clique para editar a nota"
          >
            ★ {currentUserScore.toFixed(1)}
            <span className="opacity-60 text-[10px]">✎</span>
          </button>
        );
      }

      // Sem nota ou editando → mostra o select
      return (
        <div className="flex items-center gap-1">
          <select
            ref={selectRef}
            value={currentUserScore ?? ''}
            onChange={handleDropdownChange}
            onBlur={() => { if (currentUserScore !== null) setIsEditing(false); }}
            disabled={isSubmitting}
            className="bg-slate-700 text-white text-xs px-1 py-1 rounded border border-slate-600 focus:border-indigo-400 focus:outline-none transition-colors w-14"
          >
            <option value="">-</option>
            {ratingOptions.map(r => (
              <option key={r} value={r}>{r.toFixed(1)}</option>
            ))}
          </select>
          {isEditing && (
            <button
              onClick={() => setIsEditing(false)}
              className="text-slate-500 hover:text-white text-xs leading-none"
              title="Cancelar"
            >✕</button>
          )}
        </div>
      );
    }

    // Modo estrelas
    return (
      <div 
        className="flex items-center gap-1"
        onMouseLeave={() => setHoverRating(0)}
      >
        {[...Array(10)].map((_, i) => {
          const starIndex = i + 1;
          const halfValue = starIndex - 0.5;
          const fullValue = starIndex;
          
          const baseColorClass = 
            displayScore <= 2 ? 'text-red-400'
            : displayScore <= 4 ? 'text-orange-400'
            : displayScore <= 6 ? 'text-yellow-400'
            : displayScore <= 8 ? 'text-emerald-400'
            : 'text-purple-400';
          
          // Determinar se a estrela está cheia, meio cheia ou vazia
          const isHalfFilled = displayScore === halfValue;
          const isFullyFilled = displayScore >= fullValue;
          
          return (
            <div key={starIndex} className="relative group">
              {/* Estrela de fundo (vazia) */}
              <StarIcon className={`w-4 h-4 transition-all duration-200 ${
                isHalfFilled || isFullyFilled ? 'text-transparent' : 'text-gray-600 group-hover:text-gray-500'
              }`} />
              
              {/* Estrela preenchida */}
              {isFullyFilled && (
                <div className="absolute inset-0">
                  <StarIcon className={`w-6 h-6 transition-all duration-200 ${baseColorClass}`} />
                </div>
              )}
              
              {/* Meia estrela */}
              {isHalfFilled && (
                <div className="absolute inset-0 overflow-hidden">
                  <div className="w-1/2 h-full">
                    <StarIcon className={`w-6 h-6 transition-all duration-200 ${baseColorClass}`} />
                  </div>
                </div>
              )}
              
              {/* Botão invisível para metade esquerda (0.5) */}
              <button
                type="button"
                className="absolute left-0 top-0 w-1/2 h-full bg-transparent border-none cursor-pointer"
                onClick={(e) => handleStarClick(e, halfValue)}
                onMouseEnter={() => { 
                  if (!isSubmitting) setHoverRating(halfValue);
                }}
                disabled={isSubmitting}
                aria-label={`Rate ${halfValue} out of 10`}
              />
              
              {/* Botão invisível para metade direita (1.0) */}
              <button
                type="button"
                className="absolute right-0 top-0 w-1/2 h-full bg-transparent border-none cursor-pointer"
                onClick={(e) => handleStarClick(e, fullValue)}
                onMouseEnter={() => { 
                  if (!isSubmitting) setHoverRating(fullValue);
                }}
                disabled={isSubmitting}
                aria-label={`Rate ${fullValue} out of 10`}
              />
            </div>
          );
        })}
      </div>
    );
  };

  // Renderizar estrelas visuais para mostrar a nota atual
  const renderDisplayStars = () => {
    const displayScore = hoverRating || currentUserScore || currentAverageScore || 0;
    const stars = [];
    
    for (let i = 1; i <= 10; i++) {
      const halfValue = i - 0.5;
      const fullValue = i;
      
      const isFullyFilled = displayScore >= fullValue;
      const isHalfFilled = displayScore >= halfValue && displayScore < fullValue;
      
      const baseColorClass = 
        displayScore <= 2 ? 'text-red-400'
        : displayScore <= 4 ? 'text-orange-400'
        : displayScore <= 6 ? 'text-yellow-400'
        : displayScore <= 8 ? 'text-emerald-400'
        : 'text-purple-400';
      
      stars.push(
        <div key={i} className="relative group">
          {isHalfFilled ? (
            // Meia estrela com overlay
            <div className="relative inline-block text-lg">
              <span className="text-gray-600">★</span>
              <span 
                className={`absolute inset-0 overflow-hidden ${baseColorClass}`}
                style={{ width: '50%' }}
              >
                ★
              </span>
            </div>
          ) : (
            // Estrela cheia ou vazia
            <span className={`text-lg transition-all duration-200 ${
              isFullyFilled ? baseColorClass : 'text-gray-600 group-hover:text-gray-500'
            }`}>
              ★
            </span>
          )}
          
          {/* Botões de interação apenas no modo stars */}
          {displayMode === 'stars' && isLoggedIn && (
            <>
              {/* Botão invisível para metade esquerda (0.5) */}
              <button
                type="button"
                className="absolute left-0 top-0 w-1/2 h-full bg-transparent border-none cursor-pointer"
                onClick={(e) => handleStarClick(e, halfValue)}
                onMouseEnter={() => { 
                  if (!isSubmitting) setHoverRating(halfValue);
                }}
                disabled={isSubmitting}
                aria-label={`Rate ${halfValue} out of 10`}
              />
              
              {/* Botão invisível para metade direita (1.0) */}
              <button
                type="button"
                className="absolute right-0 top-0 w-1/2 h-full bg-transparent border-none cursor-pointer"
                onClick={(e) => handleStarClick(e, fullValue)}
                onMouseEnter={() => { 
                  if (!isSubmitting) setHoverRating(fullValue);
                }}
                disabled={isSubmitting}
                aria-label={`Rate ${fullValue} out of 10`}
              />
            </>
          )}
        </div>
      );
    }
    
    return (
      <div 
        className="flex items-center gap-0.5"
        onMouseLeave={() => displayMode === 'stars' && setHoverRating(0)}
      >
        {stars}
      </div>
    );
  };

  if (displayMode === 'dropdown') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {currentAverageScore !== null && currentRatingCount > 0 && (!isLoggedIn || currentUserScore === null) && (
          <span className="text-xs text-gray-400">
            ⭐ {currentAverageScore.toFixed(1)}
            <span className="opacity-60 ml-0.5">({currentRatingCount})</span>
          </span>
        )}
        {isLoggedIn && renderRatingControls()}
        {isSubmitting && <span className="text-xs text-indigo-400">Salvando...</span>}
      </div>
    );
  }
  
  // Modo stars (páginas de anime/artista)
  return (
    <div className="flex items-center gap-2">
      {renderDisplayStars()}
      <span className="text-sm font-medium text-yellow-300">
        {currentAverageScore?.toFixed(1) ?? 'N/A'}
      </span>
      <span className="text-xs text-gray-400">({currentRatingCount})</span>
      {isSubmitting && (
        <div className="text-xs text-blue-400 ml-2">Salvando...</div>
      )}
    </div>
  );
}