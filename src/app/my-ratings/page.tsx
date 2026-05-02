"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ThemeCard from '@/components/ThemeCard';
import ThemeCardSkeleton from '@/components/ThemeCardSkeleton';
import CustomSelect from '@/components/CustomSelect';
import VideoPlayerModal from '@/components/VideoPlayerModal';
import { getMyRatingsWithData, deleteAllMyRatings, type MyRatingResult } from '@/app/actions';

type SortOption = 'name' | 'score';
type SortOrder = 'asc' | 'desc';
type ThemeType = 'OP' | 'ED' | 'IN';

interface RatingGroups {
  openings: MyRatingResult[];
  endings: MyRatingResult[];
  inserts: MyRatingResult[];
}

export default function MyRatingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [selectedType, setSelectedType] = useState<ThemeType>('OP');
  const [ratings, setRatings] = useState<RatingGroups>({ openings: [], endings: [], inserts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoForModal, setVideoForModal] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortOptions, setSortOptions] = useState({
    openings: { by: 'score' as SortOption, order: 'desc' as SortOrder },
    endings:  { by: 'score' as SortOption, order: 'desc' as SortOrder },
    inserts:  { by: 'score' as SortOption, order: 'desc' as SortOrder },
  });

  const fetchRatings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyRatingsWithData();
      setRatings({
        openings: data.filter(r => r.slug.startsWith('OP')),
        endings:  data.filter(r => r.slug.startsWith('ED')),
        inserts:  data.filter(r => !r.slug.startsWith('OP') && !r.slug.startsWith('ED')),
      });
    } catch {
      setError('Erro ao carregar suas avaliações. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/login'); return; }
    if (status === 'authenticated') fetchRatings();
  }, [status, fetchRatings, router]);

  const sortList = (list: MyRatingResult[], by: SortOption, order: SortOrder) =>
    [...list].sort((a, b) => {
      const cmp = by === 'name'
        ? a.anime.name.localeCompare(b.anime.name)
        : a.user_score - b.user_score;
      return order === 'asc' ? cmp : -cmp;
    });

  const handleSortChange = (type: ThemeType, by: SortOption) => {
    setSortOptions(prev => {
      const key = type === 'OP' ? 'openings' : type === 'ED' ? 'endings' : 'inserts';
      const cur = prev[key];
      return { ...prev, [key]: { by, order: cur.by === by && cur.order === 'desc' ? 'asc' : 'desc' } };
    });
  };

  const getSortKey = (type: ThemeType) =>
    type === 'OP' ? 'openings' : type === 'ED' ? 'endings' : 'inserts';

  const getSortIcon = (type: ThemeType, by: SortOption) => {
    const s = sortOptions[getSortKey(type)];
    if (s.by !== by) return '↕️';
    return s.order === 'desc' ? '↓' : '↑';
  };

  const handleDeleteAll = async () => {
    if (!confirm('Tem certeza? Todas as suas avaliações serão apagadas permanentemente.')) return;
    setIsDeleting(true);
    try {
      await deleteAllMyRatings();
      setRatings({ openings: [], endings: [], inserts: [] });
    } finally {
      setIsDeleting(false);
    }
  };

  const getTypeLabel = (type: ThemeType) =>
    type === 'OP' ? 'Openings' : type === 'ED' ? 'Endings' : 'Insert Songs';

  const typeOptions = [
    { value: 'OP', label: 'Openings' },
    { value: 'ED', label: 'Endings' },
    { value: 'IN', label: 'Insert Songs' },
  ];

  if (status === 'loading') {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => <ThemeCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6 text-white">
        <div className="bg-red-900/50 border border-red-600 rounded-xl p-6">
          <h3 className="text-red-400 font-semibold mb-2">Erro</h3>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  const currentList = ratings[getSortKey(selectedType)];
  const totalRatings = ratings.openings.length + ratings.endings.length + ratings.inserts.length;
  const { by, order } = sortOptions[getSortKey(selectedType)];
  const sortedRatings = sortList(currentList, by, order);

  return (
    <div className="container mx-auto p-4 md:p-6 text-white">
      <div className="mb-8 relative z-50">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/80">
          <h2 className="text-xl font-bold mb-4">Filtrar por Tipo</h2>
          <div className="max-w-xs">
            <CustomSelect
              options={typeOptions}
              value={selectedType}
              onChange={value => setSelectedType(value as ThemeType)}
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
              <div className="text-3xl font-bold text-purple-400">{loading ? 0 : currentList.length}</div>
              <div className="text-gray-400">{getTypeLabel(selectedType)} Avaliados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-400">{loading ? 0 : totalRatings}</div>
              <div className="text-gray-400">Total de Avaliações</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400">
                {loading || currentList.length === 0
                  ? '0.0'
                  : (currentList.reduce((s, r) => s + r.user_score, 0) / currentList.length).toFixed(1)}
              </div>
              <div className="text-gray-400">Nota Média</div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => <ThemeCardSkeleton key={i} />)}
        </div>
      ) : sortedRatings.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⭐</div>
          <h3 className="text-2xl font-bold mb-2">
            Nenhuma avaliação de {getTypeLabel(selectedType).toLowerCase()}
          </h3>
          <p className="text-gray-400">Explore animes e avalie {getTypeLabel(selectedType).toLowerCase()}!</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-2xl font-bold">
              Suas {getTypeLabel(selectedType)} ({sortedRatings.length})
            </h2>
            <div className="flex gap-2">
              {(['name', 'score'] as SortOption[]).map(opt => (
                <button
                  key={opt}
                  onClick={() => handleSortChange(selectedType, opt)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    by === opt ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {opt === 'name' ? 'Nome' : 'Nota'} {getSortIcon(selectedType, opt)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedRatings.map((rating, i) => (
              <div key={`${rating.anime.slug}-${rating.slug}-${i}`} className="relative">
                <div className="absolute top-2 right-2 z-10 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-bold px-2 py-1 rounded-full shadow-lg">
                  ⭐ {rating.user_score}
                </div>
                <ThemeCard
                  animeName={rating.anime.name}
                  animeSlug={rating.anime.slug}
                  themeId={rating.id}
                  themeSlug={rating.slug}
                  songTitle={rating.song?.title ?? ''}
                  artists={rating.song?.artists}
                  posterUrl={rating.anime.posterUrl ?? undefined}
                  isLoggedIn={!!session}
                  videoUrl={rating.animethemeentries[0]?.videos[0]?.link}
                  onPlayVideo={setVideoForModal}
                  showRatingControls={true}
                  ratingData={{ averageScore: null, ratingCount: 0, userScore: rating.user_score }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {totalRatings > 0 && (
        <div className="mt-12 border-t border-red-900/40 pt-8">
          <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-6 max-w-md">
            <h3 className="text-red-400 font-semibold mb-1">Zona de Perigo</h3>
            <p className="text-gray-400 text-sm mb-4">
              Apaga permanentemente todas as suas {totalRatings} avaliações. Essa ação não pode ser desfeita.
            </p>
            <button
              onClick={handleDeleteAll}
              disabled={isDeleting}
              className="bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
            >
              {isDeleting ? 'Apagando...' : 'Apagar todas as avaliações'}
            </button>
          </div>
        </div>
      )}

      <VideoPlayerModal videoUrl={videoForModal} onClose={() => setVideoForModal(null)} />
    </div>
  );
}
