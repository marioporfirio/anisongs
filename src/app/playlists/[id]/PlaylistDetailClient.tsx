// src/app/playlists/[id]/PlaylistDetailClient.tsx
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Import useRouter
import { type ClientPlaylistDetails, type EnrichedPlaylistTheme } from './page'; // Use updated types from page.tsx
import { removeThemeFromPlaylist } from '@/app/actions';
import VideoPlayerModal from '@/components/VideoPlayerModal';
import AudioPlayer from '@/components/AudioPlayer';

interface PlaylistDetailClientProps {
  playlist: ClientPlaylistDetails;
  isOwner: boolean;
  // isLoggedIn: boolean; // Removed as it's not used
}

export default function PlaylistDetailClient({ playlist, isOwner }: PlaylistDetailClientProps) { // Removed isLoggedIn from destructuring
  const router = useRouter(); // Initialize router
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [removingThemeId, setRemovingThemeId] = useState<number | null>(null); // For button disabled state

  const handleRemoveTheme = async (playlistThemeId: number) => {
    if (!confirm("Tem certeza que deseja remover esta música da playlist?")) return;
    
    setRemovingThemeId(playlistThemeId); // Disable button during operation
    const formData = new FormData();
    formData.append('playlistId', playlist.id.toString()); // playlist.id from props
    formData.append('playlistThemeId', playlistThemeId.toString());
    
    try {
      const result = await removeThemeFromPlaylist(formData);
      alert(result.message); // Or use a more sophisticated notification system
      if (result.success) {
        router.refresh(); // Refresh server component data to re-fetch the themes
      }
    } catch (error) {
      console.error("Erro ao remover tema:", error);
      alert(error instanceof Error ? error.message : "Ocorreu um erro desconhecido.");
    } finally {
      setRemovingThemeId(null); // Re-enable button
    }
  };

  const handlePlayVideo = (url: string) => {
    setSelectedVideoUrl(url);
  };

  const handleCloseModal = () => {
    setSelectedVideoUrl(null);
  };
  
  if (playlist.themes.length === 0) { 
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-300/10 rounded-lg shadow-lg p-6 text-center">
        <p className="text-gray-400 text-lg">Esta playlist ainda não tem músicas.</p>
        {isOwner && (
          <p className="text-gray-500 mt-2">Você pode adicionar músicas navegando pelo site e usando o botão de adicionar à playlist.</p>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Audio Player */}
      <div className="mb-6">
        <AudioPlayer themes={playlist.themes} />
      </div>
      
      <div className="space-y-4">
        {playlist.themes.map((themeItem: EnrichedPlaylistTheme) => (
          <div key={themeItem.playlist_theme_id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-300/10 rounded-lg shadow-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-300 hover:border-indigo-500/50 hover:shadow-indigo-500/20 hover:shadow-2xl">
            <div className="flex-grow">
              <span className="font-bold text-indigo-400 text-sm">{themeItem.type.toUpperCase()}</span>
              <p className="text-lg text-white">{themeItem.title}</p>
              <Link href={`/anime/${themeItem.animeSlug}`} className="text-sm text-gray-400 hover:text-indigo-300 transition-colors">
                {themeItem.animeName}
              </Link>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mt-3 sm:mt-0">
              {themeItem.videoLink && (
                <button 
                  onClick={() => handlePlayVideo(themeItem.videoLink!)} 
                  className="bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-500 transition-colors text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
                >
                  ▶ Assistir
                </button>
              )}
              {isOwner && (
                <button 
                  onClick={() => handleRemoveTheme(themeItem.playlist_theme_id)} 
                  className="p-2 bg-red-700 rounded-full hover:bg-red-600 transition disabled:opacity-50 shadow-lg shadow-red-500/20 hover:shadow-red-500/40" 
                  title="Remover da Playlist"
                  disabled={removingThemeId === themeItem.playlist_theme_id}
                >
                  {removingThemeId === themeItem.playlist_theme_id ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <VideoPlayerModal videoUrl={selectedVideoUrl} onClose={handleCloseModal} />
    </>
  );
}