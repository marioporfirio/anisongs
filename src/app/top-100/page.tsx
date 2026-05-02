"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import ThemeCard from '@/components/ThemeCard';
import ThemeCardSkeleton from '@/components/ThemeCardSkeleton';
import CustomSelect from '@/components/CustomSelect';
import VideoPlayerModal from '@/components/VideoPlayerModal';
import { getTopThemesWithData, type TopThemeResult } from '@/app/actions';

type ThemeType = 'OP' | 'ED' | 'IN';

export default function Top100Page() {
  const [themes, setThemes] = useState<TopThemeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const [selectedType, setSelectedType] = useState<ThemeType>('OP');
  const [videoForModal, setVideoForModal] = useState<string | null>(null);

  const fetchTopThemes = useCallback(async (type: ThemeType) => {
    setLoading(true);
    try {
      const data = await getTopThemesWithData(type, 100);
      setThemes(data);
    } catch {
      setThemes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopThemes(selectedType);
  }, [selectedType, fetchTopThemes]);

  const getTypeLabel = (type: ThemeType) =>
    type === 'OP' ? 'Openings' : type === 'ED' ? 'Endings' : 'Insert Songs';

  const typeOptions = [
    { value: 'OP', label: 'Openings' },
    { value: 'ED', label: 'Endings' },
    { value: 'IN', label: 'Insert Songs' },
  ];

  return (
    <div className="container mx-auto p-4 md:p-6 text-white">
      <div className="mb-8 relative z-50">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/80">
          <h2 className="text-xl font-bold mb-4">Filtrar por Tipo</h2>
          <div className="max-w-xs">
            <CustomSelect
              options={typeOptions}
              value={selectedType}
              onChange={(value) => setSelectedType(value as ThemeType)}
              placeholder="Selecione o tipo"
            />
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/80">
          <h2 className="text-xl font-bold mb-4">Estatísticas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">{themes.length}</div>
              <div className="text-gray-400">{getTypeLabel(selectedType)} Avaliados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-400">
                {themes.length > 0 ? Math.max(...themes.map(t => t.average_score)).toFixed(1) : '0.0'}
              </div>
              <div className="text-gray-400">Maior Nota</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">
                {themes.length > 0
                  ? (themes.reduce((acc, t) => acc + t.average_score, 0) / themes.length).toFixed(1)
                  : '0.0'}
              </div>
              <div className="text-gray-400">Nota Média</div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, i) => <ThemeCardSkeleton key={i} />)}
        </div>
      ) : themes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎵</div>
          <h3 className="text-2xl font-bold mb-2">
            Nenhum {getTypeLabel(selectedType).toLowerCase()} encontrado
          </h3>
          <p className="text-gray-400">
            Não há avaliações suficientes no momento.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">
            Top {themes.length} {getTypeLabel(selectedType)}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {themes.map((theme, index) => (
              <div key={`${theme.anime.slug}-${theme.slug}-${index}`} className="relative">
                <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">
                  #{index + 1}
                </div>
                <div className="absolute top-2 right-2 z-10 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-bold px-2 py-1 rounded-full shadow-lg">
                  ⭐ {theme.average_score.toFixed(1)}
                </div>
                <ThemeCard
                  animeName={theme.anime.name}
                  animeSlug={theme.anime.slug}
                  themeId={theme.id}
                  themeSlug={theme.slug}
                  songTitle={theme.song?.title ?? ''}
                  artists={theme.song?.artists}
                  posterUrl={
                    theme.anime.images?.find(img => img.facet === 'poster')?.link ||
                    theme.anime.images?.find(img => img.facet === 'Large Cover')?.link ||
                    theme.anime.images?.find(img => img.facet === 'Small Cover')?.link
                  }
                  isLoggedIn={!!session}
                  videoUrl={theme.animethemeentries[0]?.videos[0]?.link}
                  onPlayVideo={setVideoForModal}
                  showRatingControls={true}
                  ratingData={{ averageScore: theme.average_score, ratingCount: theme.rating_count, userScore: null }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <VideoPlayerModal videoUrl={videoForModal} onClose={() => setVideoForModal(null)} />
    </div>
  );
}
