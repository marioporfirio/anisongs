"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ThemeCard from '@/components/ThemeCard';
import ThemeCardSkeleton from '@/components/ThemeCardSkeleton';
import CustomSelect from '@/components/CustomSelect';
import VideoPlayerModal from '@/components/VideoPlayerModal';
import { fetchAnimeThemesApi } from '@/services/cache';
import { getUserRatings } from '@/app/actions';

interface Video { basename: string; link: string; }
interface AnimeThemeEntry { videos: Video[]; }
interface ImageType { facet: 'poster' | 'cover' | 'Large Cover' | 'Small Cover'; link: string; }
interface Artist { id: number; name: string; slug?: string; }
interface Song { title: string; artists?: Artist[]; }
interface Anime { name: string; slug: string; images: ImageType[]; animethemes?: AnimeTheme[]; }
interface AnimeTheme { id: number; slug: string; song: Song | null; animethemeentries: AnimeThemeEntry[]; anime: Anime | null; }

interface UserRating extends AnimeTheme {
  user_score: number;
  created_at: string;
}

type SortOption = 'name' | 'score';
type SortOrder = 'asc' | 'desc';
type ThemeType = 'OP' | 'ED' | 'IN';

export default function MyRatingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [selectedType, setSelectedType] = useState<ThemeType>('OP');
  const [ratings, setRatings] = useState<{ openings: UserRating[]; endings: UserRating[]; inserts: UserRating[] }>({
    openings: [], endings: [], inserts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoForModal, setVideoForModal] = useState<string | null>(null);
  const [sortOptions, setSortOptions] = useState({
    openings: { by: 'score' as SortOption, order: 'desc' as SortOrder },
    endings: { by: 'score' as SortOption, order: 'desc' as SortOrder },
    inserts: { by: 'score' as SortOption, order: 'desc' as SortOrder },
  });

  const createFallbackRating = (rating: { anime_slug: string; theme_slug: string; score: number; created_at: string }): UserRating => {
    const animeName = rating.anime_slug.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    let songTitle = '';
    if (rating.theme_slug.startsWith('OP')) songTitle = `Opening ${rating.theme_slug.replace('OP', '') || '1'}`;
    else if (rating.theme_slug.startsWith('ED')) songTitle = `Ending ${rating.theme_slug.replace('ED', '') || '1'}`;
    else songTitle = `Insert Song ${rating.theme_slug}`;
    return {
      id: Math.floor(Math.random() * 10000),
      slug: rating.theme_slug,
      created_at: rating.created_at,
      song: { title: songTitle, artists: [] },
      anime: { name: animeName, slug: rating.anime_slug, images: [] },
      animethemeentries: [],
      user_score: rating.score,
    } as UserRating;
  };

  const fetchUserRatings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userRatings = await getUserRatings();

      if (!userRatings || userRatings.length === 0) {
        setRatings({ openings: [], endings: [], inserts: [] });
        return;
      }

      const BATCH_SIZE = 50;
      const enrichedRatings: UserRating[] = [];

      for (let i = 0; i < userRatings.length; i += BATCH_SIZE) {
        const batch = userRatings.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async rating => {
            try {
              const endpoint = `https://api.animethemes.moe/anime/${rating.anime_slug}`;
              const params = new URLSearchParams({
                include: 'images,animethemes.song,animethemes.song.artists,animethemes.animethemeentries.videos',
              });
              const data = await fetchAnimeThemesApi(endpoint, params);
              const anime = (data as { anime: Anime }).anime;

              if (!anime?.animethemes) return createFallbackRating(rating);

              const theme = rating.theme_id
                ? anime.animethemes.find(t => t.id === rating.theme_id)
                : anime.animethemes.find(t => t.slug === rating.theme_slug);

              if (!theme) return null;

              return { ...theme, anime, user_score: rating.score, created_at: rating.created_at } as UserRating;
            } catch {
              return createFallbackRating(rating);
            }
          })
        );
        enrichedRatings.push(...results.filter((r): r is UserRating => r !== null));
      }

      setRatings({
        openings: enrichedRatings.filter(r => r.slug.startsWith('OP')),
        endings: enrichedRatings.filter(r => r.slug.startsWith('ED')),
        inserts: enrichedRatings.filter(r => r.slug.startsWith('IN')),
      });
    } catch {
      setError('Erro ao carregar suas avaliações. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (status === 'authenticated') {
      fetchUserRatings();
    }
  }, [status, fetchUserRatings, router]);

  const sortRatings = (list: UserRating[], by: SortOption, order: SortOrder) =>
    [...list].sort((a, b) => {
      const cmp = by === 'name'
        ? (a.anime?.name ?? '').localeCompare(b.anime?.name ?? '')
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

  const getCurrentRatings = () => {
    switch (selectedType) {
      case 'OP': return ratings.openings;
      case 'ED': return ratings.endings;
      case 'IN': return ratings.inserts;
    }
  };

  const getSortKey = (type: ThemeType) =>
    type === 'OP' ? 'openings' : type === 'ED' ? 'endings' : 'inserts';

  const getSortIcon = (type: ThemeType, by: SortOption) => {
    const s = sortOptions[getSortKey(type)];
    if (s.by !== by) return '↕️';
    return s.order === 'desc' ? '↓' : '↑';
  };

  const typeOptions = [
    { value: 'OP', label: 'Openings' },
    { value: 'ED', label: 'Endings' },
    { value: 'IN', label: 'Insert Songs' },
  ];

  const getTypeLabel = (type: ThemeType) =>
    type === 'OP' ? 'Openings' : type === 'ED' ? 'Endings' : 'Insert Songs';

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

  const currentRatings = getCurrentRatings();
  const totalRatings = ratings.openings.length + ratings.endings.length + ratings.inserts.length;
  const sortedRatings = sortRatings(currentRatings, sortOptions[getSortKey(selectedType)].by, sortOptions[getSortKey(selectedType)].order);

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
              <div className="text-3xl font-bold text-purple-400">{loading ? 0 : currentRatings.length}</div>
              <div className="text-gray-400">{getTypeLabel(selectedType)} Avaliados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-400">{loading ? 0 : totalRatings}</div>
              <div className="text-gray-400">Total de Avaliações</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400">
                {loading || currentRatings.length === 0
                  ? '0.0'
                  : (currentRatings.reduce((s, r) => s + r.user_score, 0) / currentRatings.length).toFixed(1)}
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
          <h3 className="text-2xl font-bold mb-2">Nenhuma avaliação de {getTypeLabel(selectedType).toLowerCase()}</h3>
          <p className="text-gray-400">Explore animes e avalie {getTypeLabel(selectedType).toLowerCase()}!</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-2xl font-bold">
              Suas {getTypeLabel(selectedType)} ({sortedRatings.length})
            </h2>
            <div className="flex gap-2">
              {(['name', 'score'] as SortOption[]).map(by => (
                <button
                  key={by}
                  onClick={() => handleSortChange(selectedType, by)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    sortOptions[getSortKey(selectedType)].by === by
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {by === 'name' ? 'Nome' : 'Nota'} {getSortIcon(selectedType, by)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedRatings.map((rating, i) => (
              <div key={`${rating.anime?.slug}-${rating.slug}-${i}`} className="relative">
                <div className="absolute top-2 right-2 z-10 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-bold px-2 py-1 rounded-full shadow-lg">
                  ⭐ {rating.user_score}
                </div>
                <ThemeCard
                  animeName={rating.anime!.name}
                  animeSlug={rating.anime!.slug}
                  themeId={rating.id}
                  themeSlug={rating.slug}
                  songTitle={rating.song!.title}
                  artists={rating.song?.artists}
                  posterUrl={
                    rating.anime!.images?.find(img => img.facet === 'poster')?.link ||
                    rating.anime!.images?.find(img => img.facet === 'Large Cover')?.link
                  }
                  isLoggedIn={!!session}
                  videoUrl={rating.animethemeentries[0]?.videos[0]?.link}
                  onPlayVideo={setVideoForModal}
                  showRatingControls={true}
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
