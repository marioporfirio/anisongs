// src/app/anime/[slug]/ThemeListClient.tsx
'use client';

import { useState } from 'react';
import VideoPlayerModal from '@/components/VideoPlayerModal';
import RatingStars from '@/components/RatingStars';
import type { ThemeWithRating } from './page'; // Importa os tipos atualizados

// Componente para a linha de um tema
function ThemeItem({
  theme,
  animeSlug,
  isLoggedIn,
  onPlay,
}: {
  theme: ThemeWithRating;
  animeSlug: string;
  isLoggedIn: boolean;
  onPlay: (url: string) => void;
}) {
  const video = theme.animethemeentries[0]?.videos[0];
  return (
    <div className="bg-gray-800 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex-grow w-full">
        <div className='flex justify-between items-start'>
            <div>
                <span className="font-bold text-indigo-400 text-sm">{theme.slug.toUpperCase()}</span>
                <p className="text-lg text-white">{theme.song?.title || "Título Desconhecido"}</p>
            </div>
            {video && (
            <button
              onClick={() => onPlay(video.link)}
              className="bg-indigo-600 text-white px-3 py-1.5 rounded-full hover:bg-indigo-500 transition-colors flex-shrink-0 ml-4 sm:hidden" // Botão menor para mobile
            >
              ▶
            </button>
          )}
        </div>
        <div className="mt-2">
          <RatingStars
            animeSlug={animeSlug}
            themeSlug={theme.slug}
            userScore={theme.ratingData.user_score}
            averageScore={theme.ratingData.average_score}
            ratingCount={theme.ratingData.rating_count}
            isLoggedIn={isLoggedIn}
          />
        </div>
      </div>
      {video && (
        <button
          onClick={() => onPlay(video.link)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-500 transition-colors flex-shrink-0 ml-4 hidden sm:block"
        >
          ▶ Assistir
        </button>
      )}
    </div>
  );
}

// O componente principal com as PROPS CORRIGIDAS
export default function ThemeListClient({
  openings,
  endings,
  others,
  animeSlug, // Prop adicionada
  isLoggedIn, // Prop adicionada
}: {
  openings: ThemeWithRating[];
  endings: ThemeWithRating[];
  others: ThemeWithRating[];
  animeSlug: string; // Tipo adicionado
  isLoggedIn: boolean; // Tipo adicionado
}) {
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);

  const handlePlay = (url: string) => setSelectedVideoUrl(url);
  const handleCloseModal = () => setSelectedVideoUrl(null);

  const hasAnyTheme = openings.length > 0 || endings.length > 0 || others.length > 0;
  if (!hasAnyTheme) {
    return <p className="text-gray-400">Nenhum tema musical encontrado para este anime.</p>;
  }

  return (
    <>
      <div className="space-y-8">
        {openings.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold border-b-2 border-indigo-500 pb-2 mb-6">Aberturas</h2>
            <div className="space-y-4">
              {openings.map(theme => (
                <ThemeItem key={theme.id} theme={theme} animeSlug={animeSlug} isLoggedIn={isLoggedIn} onPlay={handlePlay} />
              ))}
            </div>
          </section>
        )}
        {endings.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold border-b-2 border-pink-500 pb-2 mb-6">Encerramentos</h2>
            <div className="space-y-4">
              {endings.map(theme => (
                 <ThemeItem key={theme.id} theme={theme} animeSlug={animeSlug} isLoggedIn={isLoggedIn} onPlay={handlePlay} />
              ))}
            </div>
          </section>
        )}
        {others.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold border-b-2 border-teal-500 pb-2 mb-6">Outros Temas</h2>
            <div className="space-y-4">
              {others.map(theme => (
                 <ThemeItem key={theme.id} theme={theme} animeSlug={animeSlug} isLoggedIn={isLoggedIn} onPlay={handlePlay} />
              ))}
            </div>
          </section>
        )}
      </div>
      <VideoPlayerModal videoUrl={selectedVideoUrl} onClose={handleCloseModal} />
    </>
  );
}