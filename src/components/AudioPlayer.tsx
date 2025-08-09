// src/components/AudioPlayer.tsx
"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { type EnrichedPlaylistTheme } from '@/app/playlists/[id]/page';
import PlaylistReorder from './PlaylistReorder';

interface AudioPlayerProps {
  themes: EnrichedPlaylistTheme[];
}

export default function AudioPlayer({ themes }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [repeatMode, setRepeatMode] = useState<'off' | 'track' | 'playlist'>('off');
  const [isShuffle, setIsShuffle] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [showReorder, setShowReorder] = useState(false);
  const [playedTracks, setPlayedTracks] = useState<Set<number>>(new Set());
  const [audioStatus, setAudioStatus] = useState<'loading' | 'ready' | 'error' | 'playing' | 'paused'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Simplified audio loading without cache for now

  // Filter themes that have audio (video links) and log for debugging
  const playableThemes = useMemo(() => {
    const filtered = themes.filter(theme => {
      console.log('🎵 Theme:', theme.title, 'VideoLink:', theme.videoLink);
      return theme.videoLink && theme.videoLink.trim() !== '';
    });
    console.log('🎵 Total themes:', themes.length, 'Playable themes:', filtered.length);
    return filtered;
  }, [themes]);
  
  // Demo data for testing when no real themes are available
  const demoThemes = useMemo(() => [
    {
      playlist_theme_id: 1,
      theme_id: 1,
      title: "Demo Song 1",
      animeName: "Demo Anime",
      animeSlug: "demo-anime",
      type: "OP1",
      videoLink: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav" // Free demo audio
    },
    {
      playlist_theme_id: 2,
      theme_id: 2,
      title: "Demo Song 2",
      animeName: "Demo Anime 2",
      animeSlug: "demo-anime-2",
      type: "ED1",
      videoLink: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav" // Free demo audio
    }
  ], []);
  
  // Use demo themes if no playable themes are available
  const [orderedThemes, setOrderedThemes] = useState<EnrichedPlaylistTheme[]>([]);
  
  const finalThemes = useMemo(() => {
    const baseThemes = playableThemes.length > 0 ? playableThemes : demoThemes;
    return orderedThemes.length > 0 ? orderedThemes : baseThemes;
  }, [playableThemes, demoThemes, orderedThemes]);
  
  // Initialize ordered themes when themes change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const baseThemes = playableThemes.length > 0 ? playableThemes : demoThemes;
    if (baseThemes.length > 0 && orderedThemes.length === 0) {
      setOrderedThemes(baseThemes);
    }
  }, [playableThemes, demoThemes, orderedThemes.length]);
  
  // Handle playlist reordering
  const handleReorder = useCallback((newOrder: EnrichedPlaylistTheme[]) => {
    setOrderedThemes(newOrder);
    
    // Adjust current track index if needed
    const currentTrack = finalThemes[currentTrackIndex];
    if (currentTrack) {
      const newIndex = newOrder.findIndex(theme => theme.playlist_theme_id === currentTrack.playlist_theme_id);
      if (newIndex !== -1 && newIndex !== currentTrackIndex) {
        setCurrentTrackIndex(newIndex);
      }
    }
  }, [finalThemes, currentTrackIndex]);

  useEffect(() => {
    if (finalThemes.length > 0) {
      setShuffledIndices(Array.from({ length: finalThemes.length }, (_, i) => i));
      // Carregar a primeira música na inicialização
      if (audioRef.current && finalThemes[0]?.videoLink) {
        console.log('🎵 Loading initial track:', finalThemes[0].videoLink);
        
        // Check browser support for WebM
        const audio = audioRef.current;
        const canPlayWebM = audio.canPlayType('video/webm; codecs="vorbis"') !== '';
        const canPlayWav = audio.canPlayType('audio/wav') !== '';
        console.log('🎵 Browser WebM support:', canPlayWebM, 'WAV support:', canPlayWav);
        
        audio.src = finalThemes[0].videoLink;
        audio.preload = 'auto';
        audio.load();
      }
    }
  }, [finalThemes, finalThemes.length]);

  // Garantir que o currentTrackIndex seja válido quando finalThemes mudar
  useEffect(() => {
    if (finalThemes.length === 0) {
      setCurrentTrackIndex(0);
    } else if (currentTrackIndex >= finalThemes.length) {
      setCurrentTrackIndex(Math.max(0, finalThemes.length - 1));
    }
  }, [finalThemes.length]);

  // Resetar histórico quando shuffle é ativado/desativado ou playlist muda
  useEffect(() => {
    setPlayedTracks(new Set());
  }, [isShuffle, finalThemes.length]);

  const getCurrentTrack = useCallback(() => {
    if (finalThemes.length === 0) return undefined;
    if (isShuffle && shuffledIndices.length > 0) {
      const shuffleIndex = shuffledIndices[currentTrackIndex];
      return shuffleIndex !== undefined ? finalThemes[shuffleIndex] : finalThemes[0];
    }
    return finalThemes[currentTrackIndex] || finalThemes[0];
  }, [isShuffle, shuffledIndices, currentTrackIndex, finalThemes]);

  const shuffleArray = (array: number[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const toggleShuffle = () => {
    if (!isShuffle) {
      // Ativando shuffle
      const newShuffledIndices = shuffleArray(Array.from({ length: finalThemes.length }, (_, i) => i));
      setShuffledIndices(newShuffledIndices);
      // Encontrar a posição atual na nova ordem embaralhada
      const currentShuffleIndex = newShuffledIndices.indexOf(currentTrackIndex);
      setCurrentTrackIndex(currentShuffleIndex);
    } else {
      // Desativando shuffle - voltar ao índice original
      const originalIndex = shuffledIndices[currentTrackIndex];
      setCurrentTrackIndex(originalIndex);
    }
    setIsShuffle(!isShuffle);
  };

  const toggleRepeatMode = () => {
    if (repeatMode === 'off') {
      setRepeatMode('track');
    } else if (repeatMode === 'track') {
      setRepeatMode('playlist');
    } else {
      setRepeatMode('off');
    }
  };

  const playTrack = (index: number) => {
    if (index >= 0 && index < finalThemes.length) {
      setCurrentTrackIndex(index);
      setIsPlaying(true);
    }
  };

  const loadAudioWithFallback = async (audioElement: HTMLAudioElement, url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        audioElement.removeEventListener('canplay', onCanPlay);
        audioElement.removeEventListener('loadeddata', onLoadedData);
        audioElement.removeEventListener('error', onError);
      };
      
      const onCanPlay = () => {
        cleanup();
        resolve();
      };
      
      const onLoadedData = () => {
        cleanup();
        resolve();
      };
      
      const onError = () => {
        cleanup();
        reject(new Error('Failed to load audio'));
      };
      
      audioElement.addEventListener('canplay', onCanPlay);
      audioElement.addEventListener('loadeddata', onLoadedData);
      audioElement.addEventListener('error', onError);
      
      // Simple direct loading
      console.log('🎵 Loading audio directly:', url);
      audioElement.src = url;
      audioElement.preload = 'auto';
      audioElement.load();
    });
  };

  const togglePlayPause = async () => {
    console.log('🎵 togglePlayPause called:', { isPlaying, currentTrackIndex });
    if (audioRef.current) {
      if (isPlaying) {
        console.log('🎵 Pausing audio');
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          const audio = audioRef.current;
          const currentTrack = getCurrentTrack();
          console.log('🎵 Attempting to play:', { currentTrack: currentTrack?.title, videoLink: currentTrack?.videoLink });
          
          if (!currentTrack?.videoLink) {
            console.error('🎵 No video link available');
            setErrorMessage('Nenhum link de áudio disponível');
            return;
          }
          
          // Garantir que a música correta está carregada
          if (audio.src !== currentTrack.videoLink) {
            console.log('🎵 Loading new track:', currentTrack.videoLink);
            setAudioStatus('loading');
            
            try {
              await loadAudioWithFallback(audio, currentTrack.videoLink);
            } catch (error) {
              console.error('🎵 Failed to load audio:', error);
              setAudioStatus('error');
              setErrorMessage('Falha ao carregar áudio');
              return;
            }
          }
          
          // Tentar reproduzir
          await audio.play();
          setIsPlaying(true);
          setAudioStatus('playing');
        } catch (error) {
          console.error('Error playing audio:', error);
          setIsPlaying(false);
          setAudioStatus('error');
          setErrorMessage('Erro ao reproduzir áudio');
        }
      }
    }
  };

  const stopTrack = () => {
    if (audioRef.current) {
      const audio = audioRef.current;
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const nextTrack = () => {
    console.log('🎵 nextTrack called:', { currentTrackIndex, isShuffle, finalThemesLength: finalThemes.length });
    if (finalThemes.length === 0) return;
    
    if (isShuffle) {
      // No modo shuffle, priorizar músicas não tocadas
      if (finalThemes.length > 1) {
        const unplayedTracks = Array.from({ length: finalThemes.length }, (_, i) => i)
          .filter(index => !playedTracks.has(index) && index !== currentTrackIndex);
        
        console.log('🎵 Shuffle mode - unplayed tracks:', unplayedTracks);
        
        let randomIndex;
        if (unplayedTracks.length > 0) {
          // Escolher uma música não tocada
          randomIndex = unplayedTracks[Math.floor(Math.random() * unplayedTracks.length)];
          console.log('🎵 Selected unplayed track:', randomIndex);
        } else {
          // Todas as músicas foram tocadas, resetar histórico e escolher aleatoriamente
          console.log('🎵 All tracks played, resetting history');
          setPlayedTracks(new Set([currentTrackIndex]));
          do {
            randomIndex = Math.floor(Math.random() * finalThemes.length);
          } while (randomIndex === currentTrackIndex && finalThemes.length > 1);
          console.log('🎵 Selected random track after reset:', randomIndex);
        }
        setCurrentTrackIndex(Math.min(randomIndex, finalThemes.length - 1));
      } else {
        // Playlist com apenas uma música, manter a atual
        console.log('🎵 Single track playlist, staying at index 0');
        setCurrentTrackIndex(0);
      }
    } else {
      // Modo sequencial: se estiver na última, vai para a primeira
      const nextIndex = (currentTrackIndex + 1) % finalThemes.length;
      console.log('🎵 Sequential mode - next index:', nextIndex);
      setCurrentTrackIndex(nextIndex);
    }
    // Manter o estado de reprodução ao trocar de música
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };



  const previousTrack = () => {
    if (finalThemes.length === 0) return;
    
    if (isShuffle) {
      // No modo shuffle, priorizar músicas não tocadas
      if (finalThemes.length > 1) {
        const unplayedTracks = Array.from({ length: finalThemes.length }, (_, i) => i)
          .filter(index => !playedTracks.has(index) && index !== currentTrackIndex);
        
        let randomIndex;
        if (unplayedTracks.length > 0) {
          // Escolher uma música não tocada
          randomIndex = unplayedTracks[Math.floor(Math.random() * unplayedTracks.length)];
        } else {
          // Todas as músicas foram tocadas, resetar histórico e escolher aleatoriamente
          setPlayedTracks(new Set([currentTrackIndex]));
          do {
            randomIndex = Math.floor(Math.random() * finalThemes.length);
          } while (randomIndex === currentTrackIndex && finalThemes.length > 1);
        }
        setCurrentTrackIndex(Math.min(randomIndex, finalThemes.length - 1));
      } else {
        // Playlist com apenas uma música, manter a atual
        setCurrentTrackIndex(0);
      }
    } else {
      // Modo sequencial: se estiver na primeira, vai para a última
      const prevIndex = currentTrackIndex === 0 ? finalThemes.length - 1 : currentTrackIndex - 1;
      setCurrentTrackIndex(prevIndex);
    }
    // Manter o estado de reprodução ao trocar de música
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const newTime = audioRef.current.currentTime;
      // Só atualizar se a diferença for significativa (evita loops infinitos)
      if (Math.abs(newTime - currentTime) > 0.1) {
        setCurrentTime(newTime);
      }
    }
  };

  const handleLoadedMetadata = () => {
    console.log('🎵 handleLoadedMetadata called');
    if (audioRef.current) {
      const newDuration = audioRef.current.duration;
      console.log('🎵 Audio duration loaded:', newDuration);
      if (isFinite(newDuration)) {
        setDuration(newDuration);
      } else {
        console.warn('🎵 Invalid duration received:', newDuration);
      }
    }
  };

  const handleEnded = () => {
    console.log('🎵 handleEnded called:', { repeatMode });
    if (repeatMode === 'track') {
      // Repetir a música atual
      console.log('🎵 Repeating current track');
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(error => {
          console.error('🎵 Error replaying track:', error);
          setIsPlaying(false);
        });
      }
    } else {
      // Garantir que a próxima música toque automaticamente
      console.log('🎵 Moving to next track automatically');
      setIsPlaying(true);
      nextTrack();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const loadAndPlayTrack = async () => {
      const currentTrack = getCurrentTrack();
      console.log('🎵 loadAndPlayTrack useEffect triggered:', {
        currentTrackIndex,
        currentTrack: currentTrack?.title,
        videoLink: currentTrack?.videoLink,
        isPlaying
      });
      
      if (audioRef.current && currentTrack?.videoLink) {
        const audio = audioRef.current;
        const newSrc = currentTrack.videoLink;
        
        // Always load the track when it changes
        if (audio.src !== newSrc) {
          console.log('🎵 Loading new audio source:', newSrc);
          
          // Check if the URL is valid and accessible
          if (newSrc && newSrc.startsWith('http')) {
            audio.src = newSrc;
            audio.preload = 'auto';
            audio.load();
          } else {
            console.error('🎵 Invalid audio source:', newSrc);
            return;
          }
          
          // Adicionar música atual ao histórico de tocadas
          setPlayedTracks(prev => {
            const newSet = new Set([...prev, currentTrackIndex]);
            console.log('🎵 Updated played tracks:', Array.from(newSet));
            return newSet;
          });
        }
        
        if (isPlaying) {
          try {
            // Wait for the audio to be ready
            await new Promise((resolve, reject) => {
              const onCanPlay = () => {
                audio.removeEventListener('canplay', onCanPlay);
                audio.removeEventListener('error', onError);
                audio.removeEventListener('loadeddata', onLoadedData);
                resolve(void 0);
              };
              const onLoadedData = () => {
                audio.removeEventListener('canplay', onCanPlay);
                audio.removeEventListener('error', onError);
                audio.removeEventListener('loadeddata', onLoadedData);
                resolve(void 0);
              };
              const onError = () => {
                audio.removeEventListener('canplay', onCanPlay);
                audio.removeEventListener('error', onError);
                audio.removeEventListener('loadeddata', onLoadedData);
                reject(new Error('Failed to load audio'));
              };
              
              if (audio.readyState >= 2) {
                resolve(void 0);
              } else {
                audio.addEventListener('canplay', onCanPlay);
                audio.addEventListener('loadeddata', onLoadedData);
                audio.addEventListener('error', onError);
              }
            });
            
            await audio.play();
          } catch (error) {
            console.error('Error playing audio:', error);
            setIsPlaying(false);
          }
        }
      }
    };
    
    loadAndPlayTrack();
  }, [currentTrackIndex, isShuffle, isPlaying, getCurrentTrack]);

  if (finalThemes.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-300/10 rounded-lg shadow-lg p-6 text-center">
        <p className="text-gray-400">Nenhuma música disponível para reprodução.</p>
      </div>
    );
  }

  const currentTrack = getCurrentTrack();

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-300/10 rounded-lg shadow-lg">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="w-full p-4 flex items-center justify-between text-white hover:bg-slate-700/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.5 13.5H2a1 1 0 01-1-1V7.5a1 1 0 011-1h2.5l3.883-3.316a1 1 0 011.617.816zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">Player de Áudio</span>
        </div>
        <svg 
          className={`w-5 h-5 transition-transform ${isVisible ? 'rotate-180' : ''}`} 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isVisible && (
        <div className="p-4 border-t border-slate-300/10">
          {/* Current Track Info */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">{currentTrack?.title}</h3>
            <p className="text-sm text-gray-400">
              {currentTrack?.animeName} - {currentTrack?.type.toUpperCase()}
            </p>
            
            {/* Status and Error Messages */}
            {audioStatus === 'loading' && (
              <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Carregando áudio...
              </p>
            )}
            {audioStatus === 'error' && errorMessage && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errorMessage}
              </p>
            )}
            {audioStatus === 'ready' && !isPlaying && (
               <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                 <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                 </svg>
                 Pronto para reproduzir
               </p>
             )}
             

          </div>

          {/* Audio Element */}
          <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onPlay={() => {
              console.log('🎵 Audio play event triggered');
              setIsPlaying(true);
              setAudioStatus('playing');
              setErrorMessage('');
            }}
            onPause={() => {
              console.log('🎵 Audio pause event triggered');
              setIsPlaying(false);
              setAudioStatus('paused');
            }}
            onError={(e) => {
              console.error('🎵 Audio error:', e);
              const error = audioRef.current?.error;
              console.error('🎵 Audio error details:', error);
              setIsPlaying(false);
              setAudioStatus('error');
              
              // Set user-friendly error message
              let message = 'Erro ao carregar áudio';
              if (error) {
                switch (error.code) {
                  case MediaError.MEDIA_ERR_ABORTED:
                    message = 'Reprodução cancelada';
                    break;
                  case MediaError.MEDIA_ERR_NETWORK:
                    message = 'Erro de rede ao carregar áudio';
                    break;
                  case MediaError.MEDIA_ERR_DECODE:
                    message = 'Erro ao decodificar áudio';
                    break;
                  case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    message = 'Formato de áudio não suportado';
                    break;
                  default:
                    message = 'Erro desconhecido ao reproduzir áudio';
                }
              }
              setErrorMessage(message);
              
              // Try to handle the error gracefully
              const currentTrack = getCurrentTrack();
              if (currentTrack) {
                console.log('🎵 Attempting to recover from audio error');
                // You could implement fallback logic here
              }
            }}
            onLoadStart={() => {
              console.log('🎵 Audio load start');
              setAudioStatus('loading');
              setErrorMessage('');
            }}
            onCanPlay={() => {
              console.log('🎵 Audio can play');
              setAudioStatus('ready');
            }}
            onLoadedData={() => {
              console.log('🎵 Audio loaded data');
              setAudioStatus('ready');
            }}
            onStalled={() => console.log('🎵 Audio stalled')}
            onSuspend={() => console.log('🎵 Audio suspended')}
            onWaiting={() => console.log('🎵 Audio waiting')}
            preload="metadata"
          >
            {/* Fallback message for browsers that don't support audio */}
            Seu navegador não suporta o elemento de áudio.
          </audio>

          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={toggleShuffle}
              className={`p-2 rounded-full transition-colors ${
                isShuffle ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
              }`}
              title="Embaralhar"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 4a1 1 0 00-2 0v3a1 1 0 002 0V5.414l4.293 4.293a1 1 0 001.414 0L13 7.414V9a1 1 0 102 0V4a1 1 0 00-1-1H9a1 1 0 100 2h1.586L9 6.586 6.707 4.293A1 1 0 005 4zM5 16a1 1 0 00-2 0v-3a1 1 0 002 0v1.586l4.293-4.293a1 1 0 001.414 0L13 12.586V11a1 1 0 102 0v5a1 1 0 00-1 1H9a1 1 0 100-2h1.586L9 13.414l-2.293 2.293A1 1 0 005 16z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              onClick={previousTrack}
              className="p-2 bg-slate-600 text-white rounded-full hover:bg-slate-500 transition-colors"
              title="Anterior"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
              </svg>
            </button>

            <button
              onClick={togglePlayPause}
              className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
              title={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            <button
              onClick={stopTrack}
              className="p-2 bg-slate-600 text-white rounded-full hover:bg-slate-500 transition-colors"
              title="Parar"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6 6a1 1 0 011-1h6a1 1 0 011 1v8a1 1 0 01-1 1H7a1 1 0 01-1-1V6z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              onClick={nextTrack}
              className="p-2 bg-slate-600 text-white rounded-full hover:bg-slate-500 transition-colors"
              title="Próxima"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
              </svg>
            </button>

            <button
              onClick={toggleRepeatMode}
              className={`p-2 rounded-full transition-colors relative ${
                repeatMode !== 'off' ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
              }`}
              title={repeatMode === 'off' ? 'Repetir' : repeatMode === 'track' ? 'Repetir música' : 'Repetir playlist'}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              {repeatMode === 'track' && (
                <span className="absolute -top-1 -right-1 bg-indigo-400 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  1
                </span>
              )}
              {repeatMode === 'playlist' && (
                <span className="absolute -top-1 -right-1 bg-indigo-400 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  ∞
                </span>
              )}
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.5 13.5H2a1 1 0 01-1-1V7.5a1 1 0 011-1h2.5l3.883-3.316a1 1 0 011.617.816zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>



          {/* Playlist */}
          <div className="max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-300">Fila de Reprodução</h4>
              <button
                onClick={() => setShowReorder(!showReorder)}
                className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
                {showReorder ? 'Ocultar' : 'Organizar'}
              </button>
            </div>
            <div className="space-y-1">
              {finalThemes.map((theme, index) => {
                const isCurrentTrack = isShuffle 
                  ? shuffledIndices[currentTrackIndex] === index
                  : currentTrackIndex === index;
                
                return (
                  <button
                    key={theme.playlist_theme_id}
                    onClick={() => playTrack(index)}
                    className={`w-full text-left p-2 rounded text-sm transition-colors ${
                      isCurrentTrack 
                        ? 'bg-indigo-600/50 text-white' 
                        : 'hover:bg-slate-700/50 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500 w-6">
                        #{(index + 1).toString().padStart(2, '0')}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium">{theme.title}</div>
                        <div className="text-xs text-gray-400">
                          {theme.animeName} - {theme.type.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Playlist Reorder Component */}
          {showReorder && (
            <div className="mt-4">
              <PlaylistReorder
                themes={finalThemes}
                onReorder={handleReorder}
                currentTrackIndex={currentTrackIndex}
                onTrackSelect={playTrack}
              />
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}