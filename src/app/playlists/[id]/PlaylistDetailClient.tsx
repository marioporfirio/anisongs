// src/app/playlists/[id]/PlaylistDetailClient.tsx
"use client";

import { useState } from 'react';
import { type EnrichedTheme } from './page'; // CORRIGIDO: import de tipo
import { removeThemeFromPlaylist } from '@/app/actions'; // CORRIGIDO: import da action
import VideoPlayerModal from '@/components/VideoPlayerModal';

export default function PlaylistDetailClient({ initialThemes, playlistId, isOwner }: { initialThemes: EnrichedTheme[], playlistId: number, isOwner: boolean }) {
  const [themes, setThemes] = useState(initialThemes);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);

  const handleRemoveTheme = async (playlistThemeId: number, themeIdToRemove: number) => {
    if (!confirm("Tem certeza que deseja remover esta música da playlist?")) return;
    const formData = new FormData();
    formData.append('playlistId', playlistId.toString());
    formData.append('playlistThemeId', playlistThemeId.toString());
    const result = await removeThemeFromPlaylist(formData);
    if (result.success) { setThemes(currentThemes => currentThemes.filter(t => t.id !== themeIdToRemove)); }
    alert(result.message);
  };
  
  if (themes.length === 0) { return <div className="bg-gray-800 p-6 rounded-lg text-center text-gray-400">Esta playlist está vazia.</div>; }

  return (
    <>
      <div className="space-y-4">
        {themes.map(theme => {
          const video = theme.animethemeentries[0]?.videos[0];
          return (
            <div key={theme.id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center gap-4">
              <div className="flex-grow">
                <span className="font-bold text-indigo-400 text-sm">{theme.slug.toUpperCase()}</span>
                <p className="text-lg text-white">{theme.song?.title || 'Título Desconhecido'}</p>
                <p className="text-sm text-gray-400">{theme.anime.name}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isOwner && (
                  <button onClick={() => handleRemoveTheme(theme.playlistThemeId, theme.id)} className="p-2 bg-red-800 rounded-full hover:bg-red-700 transition" title="Remover da Playlist">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                  </button>
                )}
                {video && ( <button onClick={() => setSelectedVideoUrl(video.link)} className="bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-500 transition-colors">▶</button> )}
              </div>
            </div>
          )
        })}
      </div>
      <VideoPlayerModal videoUrl={selectedVideoUrl} onClose={() => setSelectedVideoUrl(null)} />
    </>
  );
}