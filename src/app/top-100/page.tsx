"use client";

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { Session } from '@supabase/supabase-js';
import ThemeCard from '@/components/ThemeCard';
import ThemeCardSkeleton from '@/components/ThemeCardSkeleton';
import CustomSelect from '@/components/CustomSelect';
import VideoPlayerModal from '@/components/VideoPlayerModal';
import { getTopRatedThemesClient } from '@/services/ratings';

// Usar as mesmas interfaces da página principal
interface Video { basename: string; link: string; }
interface AnimeThemeEntry { videos: Video[]; }
interface ImageType { facet: 'poster' | 'cover' | 'Large Cover' | 'Small Cover'; link: string; }
interface Artist { id: number; name: string; slug?: string; }
interface Song { title: string; artists?: Artist[]; }
interface Anime { name: string; slug: string; images: ImageType[]; animethemes?: AnimeTheme[]; }
interface AnimeTheme { id: number; slug: string; song: Song | null; animethemeentries: AnimeThemeEntry[]; anime: Anime | null; }

interface TopTheme extends AnimeTheme {
  average_score: number;
  rating_count: number;
}

type ThemeType = 'OP' | 'ED' | 'IN';

export default function Top100Page() {
  const [themes, setThemes] = useState<AnimeTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [selectedType, setSelectedType] = useState<ThemeType>('OP');
  const [videoForModal, setVideoForModal] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const closeModal = () => {
    setVideoForModal(null);
  };

  // Função para criar tema com dados corretos do banco
  const createThemeFromDatabase = (ratedTheme: { anime_slug: string; theme_slug: string; average_score: number; rating_count: number }, index: number): TopTheme => {
    const formattedAnimeName = ratedTheme.anime_slug
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (l: string) => l.toUpperCase());
    
    // Criar título de música mais específico baseado no tipo
    let songTitle = '';
    if (ratedTheme.theme_slug.startsWith('OP')) {
      const opNumber = ratedTheme.theme_slug.replace('OP', '');
      songTitle = `Opening ${opNumber || '1'}`;
    } else if (ratedTheme.theme_slug.startsWith('ED')) {
      const edNumber = ratedTheme.theme_slug.replace('ED', '');
      songTitle = `Ending ${edNumber || '1'}`;
    } else {
      songTitle = `Insert Song ${ratedTheme.theme_slug}`;
    }
    
    return {
      id: index + 1,
      type: ratedTheme.theme_slug.startsWith('OP') ? 'OP' : ratedTheme.theme_slug.startsWith('ED') ? 'ED' : 'IN',
      sequence: parseInt(ratedTheme.theme_slug.replace(/[^0-9]/g, '')) || 1,
      slug: ratedTheme.theme_slug,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      song: {
        id: index + 1,
        title: songTitle,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        artists: []
      },
      anime: {
        id: index + 1,
        name: formattedAnimeName,
        slug: ratedTheme.anime_slug,
        year: 2023,
        season: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        images: []
      },
      animethemeentries: [],
      average_score: ratedTheme.average_score,
      rating_count: ratedTheme.rating_count,
    } as TopTheme;
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    getSession();
  }, [supabase.auth]);



  const fetchTopThemes = useCallback(async (type: ThemeType) => {
    setLoading(true);
    
    try {
       
       // Buscar temas mais bem avaliados do banco de dados
       const topRatedThemes = await getTopRatedThemesClient(type, 100);
       
       // Top temas encontrados no banco
      
      if (topRatedThemes.length === 0) {
         setThemes([]);
         setLoading(false);
         return;
       }
      
      // Buscar detalhes dos temas da API AnimeThemes
        const themeDetailsPromises = topRatedThemes.map(async (ratedTheme, index) => {
          try {
            // Usar endpoint confiável com ID quando disponível
              let apiUrl: string;
              if (ratedTheme.anime_id) {
                // Usar endpoint confiável por ID (igual página principal)
                apiUrl = `https://api.animethemes.moe/anime/${ratedTheme.anime_id}?include=images,animethemes.song,animethemes.song.artists,animethemes.animethemeentries.videos`;
              } else {
                // Fallback para endpoint por slug (dados antigos)
                apiUrl = `https://api.animethemes.moe/anime/${ratedTheme.anime_slug}?include=images,animethemes.song,animethemes.song.artists,animethemes.animethemeentries.videos`;
              }
            
            const response = await fetch(apiUrl, {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              cache: 'no-cache',
            });
            
            if (!response.ok) {
             // Usar dados do banco quando API falha
             return createThemeFromDatabase(ratedTheme, index);
           }
           
           const data = await response.json();
           const anime = data.anime;
           
           if (!anime || !anime.animethemes) {
              console.warn(`⚠️ Dados incompletos na API (sem anime ou temas):`, ratedTheme.anime_slug);
              // Usar dados do banco quando API não tem dados completos
              return createThemeFromDatabase(ratedTheme, index);
            }
            
            // Encontrar o tema específico dentro do anime
               let theme;
               if (ratedTheme.theme_id) {
                 // Buscar por ID quando disponível (mais preciso)
                 theme = anime.animethemes.find((t: AnimeTheme) => t.id === ratedTheme.theme_id);
                 console.log(`🎯 Buscando tema por ID: theme_id=${ratedTheme.theme_id}`);
               } else {
                 // Fallback: buscar por slug (dados antigos)
                 theme = anime.animethemes.find((t: AnimeTheme) => t.slug === ratedTheme.theme_slug);
                 console.log(`⚠️ Buscando tema por slug: ${ratedTheme.theme_slug}`);
               }
            
            if (!theme || !theme.song) {
              console.warn(`⚠️ Tema específico não encontrado no anime:`, ratedTheme.theme_slug);
              return createThemeFromDatabase(ratedTheme, index);
            }
            
            // Adicionar dados do anime ao tema
            theme.anime = anime;
            
            // SÓ retornar se tiver TODOS os dados reais
            return {
              ...theme,
              average_score: ratedTheme.average_score,
              rating_count: ratedTheme.rating_count,
            } as TopTheme;
          } catch (error) {
            console.error(`❌ Erro ao buscar tema ${ratedTheme.anime_slug}-${ratedTheme.theme_slug}:`, error);
            return null; // NÃO mostrar dados inventados
          }
        });
       
       const themeDetails = await Promise.all(themeDetailsPromises);
       const validThemes = themeDetails.filter((theme): theme is TopTheme => theme !== null);
       
       // Temas válidos processados
        
        // Se não há temas válidos, a lista ficará vazia
        
        setThemes(validThemes);
       
     } catch (err) {
        console.error('Erro ao buscar temas:', err);
     } finally {
      setLoading(false);
    }
   }, []);

  useEffect(() => {
    fetchTopThemes(selectedType);
  }, [selectedType, fetchTopThemes]);

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
              <div className="text-3xl font-bold text-purple-400">{themes.length}</div>
              <div className="text-gray-400">{getTypeLabel(selectedType)} Avaliados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-400">
                {themes.length > 0 ? Math.max(...themes.map(t => (t as TopTheme).average_score)).toFixed(1) : '0.0'}
              </div>
              <div className="text-gray-400">Maior Nota</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">
                {themes.length > 0 ? 
                  (themes.reduce((acc, theme) => acc + (theme as TopTheme).average_score, 0) / themes.length).toFixed(1)
                  : '0.0'
                }
              </div>
              <div className="text-gray-400">Nota Média</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Temas */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <ThemeCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <>
          {themes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎵</div>
              <h3 className="text-2xl font-bold mb-2">Nenhum {getTypeLabel(selectedType).toLowerCase()} encontrado</h3>
              <p className="text-gray-400">
                Não foi possível encontrar {getTypeLabel(selectedType).toLowerCase()} no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">
                Top {themes.length} {getTypeLabel(selectedType)}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {themes.map((theme, index) => (
                  <div key={`${theme.id || index}-${index}`} className="relative">
                    {/* Ranking Badge */}
                    <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">
                      #{index + 1}
                    </div>
                    
                    {/* Rating Badge */}
                    <div className="absolute top-2 right-2 z-10 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-bold px-2 py-1 rounded-full shadow-lg">
                      ⭐ {(theme as TopTheme).average_score.toFixed(1)}
                    </div>
                    
                    <ThemeCard
                      key={`${theme.anime!.slug}-${theme.slug}-${theme.id}`}
                      animeName={theme.anime!.name}
                      animeSlug={theme.anime!.slug}
                      themeId={theme.id}
                      themeSlug={theme.slug}
                      songTitle={theme.song!.title}
                      artists={theme.song!.artists}
                      posterUrl={
                        theme.anime!.images?.find(img => img.facet === 'poster')?.link ||
                        theme.anime!.images?.find(img => img.facet === 'Large Cover')?.link ||
                        theme.anime!.images?.find(img => img.facet === 'Small Cover')?.link
                      }
                      isLoggedIn={!!session}
                      videoUrl={theme.animethemeentries[0]?.videos[0]?.link}
                      onPlayVideo={setVideoForModal}
                      showRatingControls={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
        

      <VideoPlayerModal videoUrl={videoForModal} onClose={closeModal} />
      </div>
    );
  }