"use client";

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { Session } from '@supabase/supabase-js';
import ThemeCard from '@/components/ThemeCard';
import ThemeCardSkeleton from '@/components/ThemeCardSkeleton';
import CustomSelect from '@/components/CustomSelect';
import VideoPlayerModal from '@/components/VideoPlayerModal';

// Interfaces
interface Video { basename: string; link: string; }
interface AnimeThemeEntry { videos: Video[]; }
interface ImageType { facet: 'poster' | 'cover' | 'Large Cover' | 'Small Cover'; link: string; }
interface Artist { id: number; name: string; slug?: string; }
interface Song { title: string; artists?: Artist[]; }
interface Anime { name: string; slug: string; images: ImageType[]; }
interface AnimeTheme { id: number; slug: string; song: Song | null; animethemeentries: AnimeThemeEntry[]; anime: Anime | null; }

interface UserRating extends AnimeTheme {
  user_score: number;
  created_at: string;
}

type SortOption = 'name' | 'score';
type SortOrder = 'asc' | 'desc';
type ThemeType = 'OP' | 'ED' | 'IN';

export default function MyRatingsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [selectedType, setSelectedType] = useState<ThemeType>('OP');
  const [ratings, setRatings] = useState<{
    openings: UserRating[];
    endings: UserRating[];
    inserts: UserRating[];
  }>({ openings: [], endings: [], inserts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoForModal, setVideoForModal] = useState<string | null>(null);
  
  // Estados de ordenação para cada tipo
  const [sortOptions, setSortOptions] = useState<{
    openings: { by: SortOption; order: SortOrder };
    endings: { by: SortOption; order: SortOrder };
    inserts: { by: SortOption; order: SortOrder };
  }>({
    openings: { by: 'score', order: 'desc' },
    endings: { by: 'score', order: 'desc' },
    inserts: { by: 'score', order: 'desc' }
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const closeModal = () => {
    setVideoForModal(null);
  };

  const fetchUserRatings = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Buscar todas as avaliações do usuário
      const { data: userRatings, error: ratingsError } = await supabase
        .from('ratings')
        .select('anime_slug, theme_slug, anime_id, theme_id, score, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (ratingsError) {
        throw ratingsError;
      }
      
      console.log('📊 Avaliações encontradas no Supabase:', userRatings?.length || 0);
      
      console.log('✅ Usando dados reais do Supabase');
      const testRatings = userRatings || [];
      
      if (!testRatings || testRatings.length === 0) {
        console.log('⚠️ Nenhuma avaliação encontrada, mas continuando o fluxo');
        setRatings({ openings: [], endings: [], inserts: [] });
        setLoading(false);
        return;
      }
      
      console.log('📊 Avaliações do usuário encontradas:', testRatings.length);
      
      // Buscar detalhes de cada tema da API AnimeThemes
      const enrichedRatings = await Promise.all(
        testRatings.map(async (rating) => {
          try {
              // Sempre usar slug primeiro (mais confiável que anime_id desatualizado)
              const apiUrl = `https://api.animethemes.moe/anime/${rating.anime_slug}?include=images,animethemes.song,animethemes.song.artists,animethemes.animethemeentries.videos`;
              
              // Se slug falhar, tentar por ID como fallback
              const shouldTryById = Boolean(rating.anime_id);
              
              const response = await fetch(apiUrl, {
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                },
                cache: 'no-cache',
              });
              
              if (!response.ok && shouldTryById) {
                 console.warn(`⚠️ API falhou por slug para ${rating.anime_slug}:`, response.status);
                 console.log(`🔄 Tentando por ID: anime_id=${rating.anime_id}`);
                 
                 // Tentar por ID como fallback
                 const apiUrlById = `https://api.animethemes.moe/anime/${rating.anime_id}?include=images,animethemes.song,animethemes.song.artists,animethemes.animethemeentries.videos`;
                 const responseById = await fetch(apiUrlById, {
                   headers: {
                     'Accept': 'application/json',
                     'Content-Type': 'application/json',
                   },
                   cache: 'no-cache',
                 });
                 
                 if (!responseById.ok) {
                   console.warn(`⚠️ API falhou também por ID para ${rating.anime_id}:`, responseById.status);
                   return createFallbackRating(rating);
                 }
                 
                 const dataById = await responseById.json();
                 const animeById = dataById.anime;
                 
                 if (!animeById || !animeById.animethemes) {
                   console.warn(`⚠️ Dados incompletos na API por ID:`, rating.anime_id);
                   return createFallbackRating(rating);
                 }
                 
                 // Processar dados do ID
                 let themeById;
                 if (rating.theme_id) {
                   themeById = animeById.animethemes.find((t: AnimeTheme) => t.id === rating.theme_id);
                 } else {
                   themeById = animeById.animethemes.find((t: AnimeTheme) => t.slug === rating.theme_slug);
                 }
                 
                 if (!themeById || !themeById.song) {
                   console.warn(`⚠️ Tema não encontrado por ID:`, rating.theme_slug);
                   return createFallbackRating(rating);
                 }
                 
                 themeById.anime = animeById;
                 console.log(`✅ Tema encontrado por ID:`, themeById.anime.name, themeById.song.title);
                 
                 return {
                   ...themeById,
                   user_score: rating.score,
                   created_at: rating.created_at
                 } as UserRating;
                 
               } else if (!response.ok) {
                 console.warn(`⚠️ API falhou para ${rating.anime_slug}-${rating.theme_slug}:`, response.status);
                 return createFallbackRating(rating);
               }
              
              const data = await response.json();
              const anime = data.anime;
              
              if (!anime || !anime.animethemes) {
                console.warn(`⚠️ Dados incompletos na API (sem anime ou temas):`, rating.anime_slug);
                return createFallbackRating(rating);
              }
              
              // Encontrar o tema específico dentro do anime
              let theme;
              if (rating.theme_id) {
                // Buscar por ID quando disponível (mais preciso)
                theme = anime.animethemes.find((t: AnimeTheme) => t.id === rating.theme_id);
                console.log(`🎯 Buscando tema por ID: theme_id=${rating.theme_id}`);
              } else {
                // Fallback: buscar por slug
                theme = anime.animethemes.find((t: AnimeTheme) => t.slug === rating.theme_slug);
                console.log(`⚠️ Buscando tema por slug: ${rating.theme_slug}`);
              }
              
              if (!theme) {
                return createFallbackRating(rating);
              }
              
              // Adicionar dados do anime ao tema
              theme.anime = anime;
              
              // Retornar dados reais da API
              return {
                ...theme,
                user_score: rating.score,
                created_at: rating.created_at
              } as UserRating;
              
            } catch (error) {
              console.error(`❌ Erro ao buscar tema ${rating.anime_slug}-${rating.theme_slug}:`, error);
              return null; // NÃO mostrar dados inventados - igual ao Top 100
            }
        })
      );
      
      // Filtrar apenas temas válidos com dados reais da API (igual ao Top 100)
      const validRatings = enrichedRatings.filter((rating): rating is UserRating => rating !== null);
      
      const openings = validRatings.filter(rating => rating.slug.startsWith('OP'));
      const endings = validRatings.filter(rating => rating.slug.startsWith('ED'));
      const inserts = validRatings.filter(rating => rating.slug.startsWith('IN'));
      
      setRatings({
        openings,
        endings,
        inserts
      });
      
    } catch (err) {
      console.error('Erro ao buscar avaliações:', err);
      setError('Erro ao carregar suas avaliações. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session?.user?.id) {
        await fetchUserRatings(session.user.id);
      } else {
        setLoading(false);
      }
    };
    getSession();
  }, [supabase, fetchUserRatings]);

  const createFallbackRating = (rating: { anime_slug: string; theme_slug: string; score: number; created_at: string }): UserRating => {
    const formattedAnimeName = rating.anime_slug
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (l: string) => l.toUpperCase());
    
    // Criar título de música mais específico baseado no tipo (igual ao Top 100)
    let songTitle = '';
    if (rating.theme_slug.startsWith('OP')) {
      const opNumber = rating.theme_slug.replace('OP', '');
      songTitle = `Opening ${opNumber || '1'}`;
    } else if (rating.theme_slug.startsWith('ED')) {
      const edNumber = rating.theme_slug.replace('ED', '');
      songTitle = `Ending ${edNumber || '1'}`;
    } else {
      songTitle = `Insert Song ${rating.theme_slug}`;
    }
    
    return {
      id: Math.floor(Math.random() * 10000), // ID único
      slug: rating.theme_slug,
      created_at: rating.created_at,
      updated_at: new Date().toISOString(),
      song: {
        title: songTitle,
        artists: []
      },
      anime: {
        name: formattedAnimeName,
        slug: rating.anime_slug,
        images: []
      },
      animethemeentries: [],
      user_score: rating.score
    } as UserRating;
  };
  
  const sortRatings = (ratings: UserRating[], sortBy: SortOption, order: SortOrder): UserRating[] => {
    // Verificação de segurança para garantir que ratings é um array
    if (!Array.isArray(ratings)) {
      console.warn('sortRatings recebeu um valor que não é array:', ratings);
      return [];
    }
    
    return [...ratings].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        const nameA = a.anime?.name || 'Unknown';
        const nameB = b.anime?.name || 'Unknown';
        comparison = nameA.localeCompare(nameB);
      } else if (sortBy === 'score') {
        comparison = a.user_score - b.user_score;
      }
      
      return order === 'asc' ? comparison : -comparison;
    });
  };
  
  const handleSortChange = (type: ThemeType, sortBy: SortOption) => {
    setSortOptions(prev => {
      const sortKey = type === 'OP' ? 'openings' : type === 'ED' ? 'endings' : 'inserts';
      const currentSort = prev[sortKey];
      const newOrder = currentSort.by === sortBy && currentSort.order === 'desc' ? 'asc' : 'desc';
      
      return {
        ...prev,
        [sortKey]: { by: sortBy, order: newOrder }
      };
    });
  };
  
  const getSortedRatings = (type: ThemeType): UserRating[] => {
    const sortKey = type === 'OP' ? 'openings' : type === 'ED' ? 'endings' : 'inserts';
    const sortOption = sortOptions[sortKey];
    
    // Usar getCurrentRatings() em vez de ratings[typeKey]
    const ratingsArray = getCurrentRatings();
    
    console.log(`🔧 getSortedRatings para ${type}:`, {
      type,
      sortKey,
      ratingsArray: ratingsArray,
      ratingsArrayLength: ratingsArray?.length || 0,
      sortOption
    });
    
    return sortRatings(ratingsArray, sortOption.by, sortOption.order);
  };
  
  const getSortIcon = (type: ThemeType, sortBy: SortOption): string => {
    const sortKey = type === 'OP' ? 'openings' : type === 'ED' ? 'endings' : 'inserts';
    const currentSort = sortOptions[sortKey];
    
    if (currentSort.by !== sortBy) return '↕️';
    return currentSort.order === 'desc' ? '↓' : '↑';
  };

  // Remover estado de loading separado - mostrar interface completa sempre
  
  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-600">
              Minhas Avaliações
            </h1>
          </div>
        </div>
        
        <div className="bg-red-900/50 border border-red-600 rounded-xl p-6 mb-8">
          <h3 className="text-red-400 font-semibold mb-2">Erro</h3>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }
  
  const getTypeLabel = (type: ThemeType) => {
    switch (type) {
      case 'OP': return 'Openings';
      case 'ED': return 'Endings';
      case 'IN': return 'Insert Songs';
      default: return type;
    }
  };

  const typeOptions = [
    { value: 'OP', label: 'Openings' },
    { value: 'ED', label: 'Endings' },
    { value: 'IN', label: 'Insert Songs' }
  ];

  const getCurrentRatings = (): UserRating[] => {
    let result: UserRating[];
    switch (selectedType) {
      case 'OP': result = ratings.openings; break;
      case 'ED': result = ratings.endings; break;
      case 'IN': result = ratings.inserts; break;
      default: result = [];
    }
    
    console.log(`🎯 getCurrentRatings para ${selectedType}:`, {
      selectedType,
      result: result,
      resultLength: result?.length || 0,
      ratingsState: ratings
    });
    
    return result || [];
  };

  const totalRatings = ratings.openings.length + ratings.endings.length + ratings.inserts.length;
  const currentRatings = getCurrentRatings();
  
  console.log('🔍 Debug My Ratings:', {
    selectedType,
    totalRatings,
    currentRatings: currentRatings.length,
    ratingsState: ratings,
    currentRatingsData: currentRatings
  });

  return (
    <div className="container mx-auto p-4 md:p-6 text-white">
      {/* Seletor de Tipo */}
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

      {/* Estatísticas */}
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
                {loading ? '0.0' : currentRatings.length > 0 ? (currentRatings.reduce((sum, r) => sum + r.user_score, 0) / currentRatings.length).toFixed(1) : '0.0'}
              </div>
              <div className="text-gray-400">Nota Média</div>
            </div>
          </div>
        </div>
      </div>
        
      {loading ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-2xl font-bold">
              Suas {getTypeLabel(selectedType)} (0)
            </h2>
            
            <div className="flex gap-2">
              <button
                disabled
                className="px-4 py-2 rounded-lg font-semibold bg-gray-700 text-gray-300 cursor-not-allowed"
              >
                Nome ↕️
              </button>
              
              <button
                disabled
                className="px-4 py-2 rounded-lg font-semibold bg-gray-700 text-gray-300 cursor-not-allowed"
              >
                Nota ↕️
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <ThemeCardSkeleton key={index} />
            ))}
          </div>
        </div>
      ) : currentRatings.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⭐</div>
          <h3 className="text-2xl font-bold mb-2">Nenhuma avaliação de {getTypeLabel(selectedType).toLowerCase()}</h3>
          <p className="text-gray-400">
            Comece explorando animes e avaliando {getTypeLabel(selectedType).toLowerCase()}!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-2xl font-bold">
              Suas {getTypeLabel(selectedType)} ({currentRatings.length})
            </h2>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleSortChange(selectedType, 'name')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  sortOptions[selectedType === 'OP' ? 'openings' : selectedType === 'ED' ? 'endings' : 'inserts'].by === 'name'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Nome {getSortIcon(selectedType, 'name')}
              </button>
              
              <button
                onClick={() => handleSortChange(selectedType, 'score')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  sortOptions[selectedType === 'OP' ? 'openings' : selectedType === 'ED' ? 'endings' : 'inserts'].by === 'score'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Nota {getSortIcon(selectedType, 'score')}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {getSortedRatings(selectedType).map((rating, index) => {
              console.log(`🎯 Renderizando card ${index}:`, rating);
              return (
                <div key={`${rating.anime?.slug}-${rating.slug}-${index}`} className="relative">
                  <div className="absolute top-2 right-2 z-10 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-bold px-2 py-1 rounded-full shadow-lg">
                    ⭐ {rating.user_score}
                  </div>
                  
                  <ThemeCard
                    animeName={rating.anime!.name}
                    animeSlug={rating.anime!.slug}
                    themeId={rating.id}
                    themeSlug={rating.slug}
                    songTitle={rating.song!.title}
                    artists={rating.song!.artists}
                    posterUrl={
                      rating.anime!.images?.find(img => img.facet === 'poster')?.link ||
                      rating.anime!.images?.find(img => img.facet === 'Large Cover')?.link ||
                      rating.anime!.images?.find(img => img.facet === 'Small Cover')?.link
                    }
                    isLoggedIn={!!session}
                    videoUrl={rating.animethemeentries[0]?.videos[0]?.link}
                    onPlayVideo={setVideoForModal}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
      <VideoPlayerModal videoUrl={videoForModal} onClose={closeModal} />
    </div>
  );
}