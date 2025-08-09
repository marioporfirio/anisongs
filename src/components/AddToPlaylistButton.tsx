// src/components/AddToPlaylistButton.tsx
"use client";

import { useState, useEffect, useRef, FormEvent } from 'react';
import { createPortal } from 'react-dom';
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
  const [isAdded, setIsAdded] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(dropdownRef, () => {
    setIsOpen(false);
    setShowCreateForm(false);
    setNewPlaylistName('');
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchPlaylists = async () => {
    setLoading(true);
    const data = await getUserPlaylists();
    setPlaylists(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && !showCreateForm) {
      fetchPlaylists();
    }
  }, [isOpen, showCreateForm]);

  useEffect(() => {
    const handleResize = () => {
      if (isOpen) {
        calculateDropdownPosition();
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        calculateDropdownPosition();
      }
    };

    if (isOpen) {
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen]);

  const handleAddToPlaylist = async (playlistId: number) => {
    const formData = new FormData();
    formData.append('playlistId', playlistId.toString());
    formData.append('themeId', themeId.toString());
    
    const result = await addThemeToPlaylist(formData);
    if (result.success) {
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
      setIsOpen(false);
    }
  };

  const calculateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 256; // w-64 = 16rem = 256px
      const dropdownHeight = 200; // estimated height
      
      // Posicionar dropdown com margem adequada do botão
      let top = rect.bottom + 12; // 12px de margem abaixo do botão
      let left = rect.right - dropdownWidth + 8; // Mais próximo do botão
      
      // Se não há espaço abaixo, posicionar acima
      if (top + dropdownHeight > window.innerHeight - 12) {
        top = rect.top - dropdownHeight - 12; // 12px de margem acima do botão
      }
      if (left < 8) {
        left = 8;
      }
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8;
      }
      
      setDropdownPosition({ top, left });
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

    try {
      await createPlaylist(formData); 
      setNewPlaylistName('');
      setShowCreateForm(false);
      await fetchPlaylists();
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    } catch (error) {
      console.error("Erro ao criar playlist:", error);
      alert(error instanceof Error ? error.message : "Não foi possível criar a playlist.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative">
      <button 
        ref={buttonRef}
        onClick={() => {
          if (!isOpen) {
            calculateDropdownPosition();
          }
          setIsOpen(!isOpen);
          if (isOpen) setShowCreateForm(false);
        }}
        className={`p-2 ${isAdded ? 'bg-green-600/80' : 'bg-indigo-600/80'} rounded-full hover:bg-indigo-600/100 transition-all duration-300 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40`}
        title="Adicionar à Playlist"
      >
        {isAdded ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white animate-scale-check" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
          </svg>
        )}
      </button>

      {isOpen && mounted && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed w-64 bg-slate-800/90 backdrop-blur-sm border border-slate-300/10 rounded-lg shadow-lg z-[9999] overflow-hidden"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
        >
          <div className="p-3 text-sm font-semibold text-white border-b border-slate-300/10">
            {showCreateForm ? 'Criar Nova Playlist' : 'Adicionar a...'}
          </div>
          
          {showCreateForm ? (
            <form onSubmit={handleCreatePlaylist} className="p-3 space-y-3">
              <input 
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Nome da Playlist"
                className="w-full bg-slate-700/50 backdrop-blur-sm border border-slate-600/80 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                disabled={isCreating}
              />
              <div className="flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => { setShowCreateForm(false); setNewPlaylistName(''); }} 
                  className="px-3 py-1.5 text-xs bg-slate-600/80 hover:bg-slate-600/100 rounded-md transition shadow-md shadow-slate-500/20 hover:shadow-slate-500/40"
                  disabled={isCreating}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 rounded-md transition shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/40"
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
                          className="w-full text-left px-3 py-2 hover:bg-slate-700/50 text-sm transition"
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
                  className="w-full text-left px-3 py-2 hover:bg-slate-700/50 text-sm text-indigo-400 rounded-md transition"
                >
                  + Criar nova playlist
                </button>
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}