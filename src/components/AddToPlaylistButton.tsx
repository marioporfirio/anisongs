// src/components/AddToPlaylistButton.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { getUserPlaylists, addThemeToPlaylist } from '@/app/actions';

interface AddToPlaylistButtonProps {
  themeId: number;
}

interface Playlist {
  id: number;
  name: string;
}

export default function AddToPlaylistButton({ themeId }: AddToPlaylistButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(dropdownRef, () => setIsOpen(false));

  useEffect(() => {
    if (isOpen && playlists.length === 0) { // Busca apenas se não tiver buscado antes
      setLoading(true);
      getUserPlaylists().then(data => {
        setPlaylists(data);
        setLoading(false);
      });
    }
  }, [isOpen, playlists.length]);

  const handleAddToPlaylist = async (playlistId: number) => {
    const formData = new FormData();
    formData.append('playlistId', playlistId.toString());
    formData.append('themeId', themeId.toString());
    
    const result = await addThemeToPlaylist(formData);
    alert(result.message);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-gray-600 rounded-full hover:bg-gray-500 transition"
        title="Adicionar à Playlist"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
          <div className="p-2 text-sm font-bold text-white border-b border-gray-700">Adicionar a...</div>
          {loading ? (
            <div className="p-2 text-gray-400">Carregando...</div>
          ) : (
            <ul>
              {playlists.length > 0 ? (
                playlists.map(playlist => (
                  <li key={playlist.id}>
                    <button
                      onClick={() => handleAddToPlaylist(playlist.id)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-700"
                    >
                      {playlist.name}
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-4 py-2 text-gray-500">Nenhuma playlist.</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}