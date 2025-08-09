// src/components/PlaylistReorder.tsx
"use client";

import { useState, useRef } from 'react';
import { type EnrichedPlaylistTheme } from '@/app/playlists/[id]/page';

interface PlaylistReorderProps {
  themes: EnrichedPlaylistTheme[];
  onReorder: (newOrder: EnrichedPlaylistTheme[]) => void;
  currentTrackIndex: number;
  onTrackSelect: (index: number) => void;
  className?: string;
}

export default function PlaylistReorder({
  themes,
  onReorder,
  currentTrackIndex,
  onTrackSelect,
  className = ''
}: PlaylistReorderProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
    
    // Add visual feedback
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragCounter.current++;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      return;
    }

    const newThemes = [...themes];
    const draggedTheme = newThemes[draggedIndex];
    
    // Remove the dragged item
    newThemes.splice(draggedIndex, 1);
    
    // Insert at new position
    newThemes.splice(dropIndex, 0, draggedTheme);
    
    onReorder(newThemes);
    
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    
    const newThemes = [...themes];
    [newThemes[index], newThemes[index - 1]] = [newThemes[index - 1], newThemes[index]];
    onReorder(newThemes);
  };

  const moveDown = (index: number) => {
    if (index === themes.length - 1) return;
    
    const newThemes = [...themes];
    [newThemes[index], newThemes[index + 1]] = [newThemes[index + 1], newThemes[index]];
    onReorder(newThemes);
  };

  const moveToTop = (index: number) => {
    if (index === 0) return;
    
    const newThemes = [...themes];
    const theme = newThemes.splice(index, 1)[0];
    newThemes.unshift(theme);
    onReorder(newThemes);
  };

  const moveToBottom = (index: number) => {
    if (index === themes.length - 1) return;
    
    const newThemes = [...themes];
    const theme = newThemes.splice(index, 1)[0];
    newThemes.push(theme);
    onReorder(newThemes);
  };

  if (themes.length === 0) {
    return (
      <div className={`bg-slate-800/50 backdrop-blur-sm border border-slate-300/10 rounded-lg shadow-lg p-6 text-center ${className}`}>
        <p className="text-gray-400">Nenhuma música na playlist para organizar.</p>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800/50 backdrop-blur-sm border border-slate-300/10 rounded-lg shadow-lg ${className}`}>
      <div className="p-4 border-b border-slate-300/10">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
          Organizar Playlist
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Arraste as músicas para reordenar ou use os botões de controle
        </p>
      </div>

      <div className="p-4">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {themes.map((theme, index) => {
            const isCurrentTrack = currentTrackIndex === index;
            const isDraggedOver = dragOverIndex === index;
            const isDragged = draggedIndex === index;
            
            return (
              <div
                key={theme.playlist_theme_id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className={`
                  group relative bg-slate-700/50 rounded-lg p-3 transition-all duration-200 cursor-move
                  ${isCurrentTrack ? 'ring-2 ring-indigo-500 bg-indigo-600/20' : ''}
                  ${isDraggedOver ? 'border-2 border-dashed border-indigo-400 bg-indigo-500/10' : 'border border-slate-600'}
                  ${isDragged ? 'opacity-50 scale-95' : 'hover:bg-slate-600/50'}
                `}
              >
                {/* Drag Handle */}
                <div className="absolute left-1 top-1/2 transform -translate-y-1/2 text-gray-500 group-hover:text-gray-300">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </div>

                {/* Track Number */}
                <div className="absolute left-8 top-1/2 transform -translate-y-1/2">
                  <span className="text-xs font-mono text-gray-400 bg-slate-800 px-2 py-1 rounded">
                    #{(index + 1).toString().padStart(2, '0')}
                  </span>
                </div>

                {/* Track Info */}
                <div className="ml-20 mr-32">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onTrackSelect(index)}
                      className="text-left flex-1 hover:text-indigo-300 transition-colors"
                    >
                      <div className="font-medium text-white">{theme.title}</div>
                      <div className="text-sm text-gray-400">
                        {theme.animeName} - {theme.type.toUpperCase()}
                      </div>
                    </button>
                    
                    {isCurrentTrack && (
                      <div className="flex items-center gap-1 text-indigo-400">
                        <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs">Tocando</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveToTop(index)}
                      disabled={index === 0}
                      className="p-1 bg-slate-600 text-white rounded hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Mover para o topo"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-1 bg-slate-600 text-white rounded hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Mover para cima"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === themes.length - 1}
                      className="p-1 bg-slate-600 text-white rounded hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Mover para baixo"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveToBottom(index)}
                      disabled={index === themes.length - 1}
                      className="p-1 bg-slate-600 text-white rounded hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Mover para o final"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-4 pt-4 border-t border-slate-300/10">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const shuffled = [...themes].sort(() => Math.random() - 0.5);
                onReorder(shuffled);
              }}
              className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-colors"
            >
              🔀 Embaralhar Tudo
            </button>
            <button
              onClick={() => {
                const sorted = [...themes].sort((a, b) => a.title.localeCompare(b.title));
                onReorder(sorted);
              }}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
            >
              🔤 Ordenar por Título
            </button>
            <button
              onClick={() => {
                const sorted = [...themes].sort((a, b) => a.animeName.localeCompare(b.animeName));
                onReorder(sorted);
              }}
              className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
            >
              📺 Ordenar por Anime
            </button>
            <button
              onClick={() => {
                const reversed = [...themes].reverse();
                onReorder(reversed);
              }}
              className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 transition-colors"
            >
              🔄 Inverter Ordem
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}