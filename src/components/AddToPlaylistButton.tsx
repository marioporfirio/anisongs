// src/components/AddToPlaylistButton.tsx
"use client";

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { getUserPlaylists, addThemeToPlaylist, createPlaylist } from '@/app/actions'; // Added createPlaylist

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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(dropdownRef, () => {
    setIsOpen(false);
    setShowCreateForm(false); // Also reset create form visibility
    setNewPlaylistName(''); // Reset new playlist name
  });

  const fetchPlaylists = async () => {
    setLoading(true);
    const data = await getUserPlaylists();
    setPlaylists(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && !showCreateForm) { // Fetch playlists if dropdown is open and not showing create form
      fetchPlaylists();
    }
  }, [isOpen, showCreateForm]);

  const handleAddToPlaylist = async (playlistId: number) => {
    const formData = new FormData();
    formData.append('playlistId', playlistId.toString());
    formData.append('themeId', themeId.toString());
    
    const result = await addThemeToPlaylist(formData);
    alert(result.message); // Consider a more subtle notification system in the future
    if (result.success) {
      setIsOpen(false);
    }
  };

  const handleCreatePlaylist = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newPlaylistName.trim()) {
      alert("O nome da playlist não pode estar vazio.");
      return;
    }
    setIsCreating(true);
    const formData = new FormData();
    formData.append('name', newPlaylistName.trim());
    // formData.append('description', ''); // Optional: add description field if needed
    // formData.append('isPublic', 'off'); // Default to private or add UI for this

    try {
      // createPlaylist action doesn't return the new playlist ID directly in this version
      // It revalidates path, so we'll refetch playlists.
      // For a better UX, createPlaylist could return the new playlist, then add to it.
      await createPlaylist(formData); 
      setNewPlaylistName('');
      setShowCreateForm(false);
      await fetchPlaylists(); // Refresh playlist list
      // Ideally, find the new playlist and call handleAddToPlaylist for it.
      // For simplicity now, user has to re-open and select the new playlist.
      // Or, if createPlaylist returned the new playlist:
      // const newPlaylist = await createPlaylist(formData); // (if it returned the playlist)
      // await handleAddToPlaylist(newPlaylist.id);
      alert("Playlist criada! Agora você pode adicioná-la a partir da lista.");
    } catch (error) {
      console.error("Erro ao criar playlist:", error);
      alert(error instanceof Error ? error.message : "Não foi possível criar a playlist.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) setShowCreateForm(false); // Reset create form if closing
        }}
        className="p-2 bg-gray-600 rounded-full hover:bg-gray-500 transition"
        title="Adicionar à Playlist"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 overflow-hidden">
          <div className="p-3 text-sm font-semibold text-white border-b border-gray-700">
            {showCreateForm ? 'Criar Nova Playlist' : 'Adicionar a...'}
          </div>
          
          {showCreateForm ? (
            <form onSubmit={handleCreatePlaylist} className="p-3 space-y-3">
              <input 
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Nome da Playlist"
                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                disabled={isCreating}
              />
              <div className="flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => { setShowCreateForm(false); setNewPlaylistName(''); }} 
                  className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-500 rounded-md transition"
                  disabled={isCreating}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 rounded-md transition"
                  disabled={isCreating}
                >
                  {isCreating ? 'Criando...' : 'Criar e Adicionar'}
                </button>
              </div>
            </form>
          ) : (
            <>
              {loading ? (
                <div className="p-3 text-gray-400 text-sm">Carregando playlists...</div>
              ) : (
                <ul className="max-h-48 overflow-y-auto">
                  {playlists.length > 0 ? (
                    playlists.map(playlist => (
                      <li key={playlist.id}>
                        <button
                          onClick={() => handleAddToPlaylist(playlist.id)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm transition"
                        >
                          {playlist.name}
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="px-3 py-2 text-gray-500 text-sm">Nenhuma playlist encontrada.</li>
                  )}
                </ul>
              )}
              <div className="border-t border-gray-700 p-2">
                <button 
                  onClick={() => setShowCreateForm(true)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm text-indigo-400 rounded-md transition"
                >
                  + Criar nova playlist
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}