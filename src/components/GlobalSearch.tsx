// src/components/GlobalSearch.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useDebounce } from '@/hooks/useDebounce';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';

// Tipagens
interface SearchResult {
  anime?: Array<{ slug: string; name: string; }>;
  animethemes?: Array<{ slug: string; anime: { slug: string; name: string; }; song: { title: string; }; }>;
  artists?: Array<{ slug: string; name: string; }>;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 500);
  useOnClickOutside(searchContainerRef, () => setIsDropdownOpen(false));

  useEffect(() => {
    if (debouncedQuery.length < 3) {
      setResults(null);
      setIsDropdownOpen(false);
      return;
    }

    setIsDropdownOpen(true);

    async function fetchSearchResults() {
      setIsLoading(true);
      
      const encodedQuery = encodeURIComponent(debouncedQuery);
      
      // --- TENTATIVA FINAL DE URL: Usando 'include' de forma mais específica ---
      // Pedimos para a busca incluir as relações 'song' e 'anime' para os temas.
      // Isso é o que nosso JSX precisa para funcionar sem erros.
      const API_URL = `https://api.animethemes.moe/search?q=${encodedQuery}&include[animetheme]=song,anime`;

      try {
        const response = await fetch(API_URL);
        if (!response.ok) {
          const errorBody = await response.text();
          console.error("Corpo do erro da API:", errorBody);
          throw new Error(`A API respondeu com o status: ${response.status}`);
        }
        const data = await response.json();
        setResults(data.search || {}); 
      } catch (error) {
        console.error("Erro ao buscar resultados:", error);
        setResults({});
      } finally {
        setIsLoading(false);
      }
    }

    fetchSearchResults();
  }, [debouncedQuery]);

  const handleLinkClick = () => {
    setIsDropdownOpen(false);
    setQuery('');
  };

  const hasResults = results && ((results.anime?.length ?? 0) > 0 || (results.artists?.length ?? 0) > 0 || (results.animethemes?.length ?? 0) > 0);

  return (
    <div className="relative w-full max-w-xs md:max-w-sm" ref={searchContainerRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (query.length > 2) setIsDropdownOpen(true); }}
        placeholder="Buscar animes, músicas, artistas..."
        className="w-full bg-gray-700 text-white px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
      />

      {isDropdownOpen && (
        <div className="absolute top-full mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-30 max-h-96 overflow-y-auto">
          {isLoading && <div className="p-4 text-gray-400 text-center">Buscando...</div>}
          
          {!isLoading && !hasResults && debouncedQuery.length > 2 && (
            <div className="p-4 text-gray-400 text-center">Nenhum resultado encontrado.</div>
          )}

          {!isLoading && hasResults && (
            <ul>
              {(results.anime?.length ?? 0) > 0 && (
                <>
                  <li className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Animes</li>
                  {results.anime?.map(anime => (
                    <li key={`anime-search-${anime.slug}`}>
                      <Link href={`/anime/${anime.slug}`} onClick={handleLinkClick} className="block px-4 py-2 hover:bg-gray-700 transition-colors">
                        {anime.name}
                      </Link>
                    </li>
                  ))}
                </>
              )}
              {(results.artists?.length ?? 0) > 0 && (
                <>
                  <li className="px-4 py-2 text-xs font-bold text-gray-500 uppercase border-t border-gray-700">Artistas</li>
                  {results.artists?.map(artist => (
                    <li key={`artist-search-${artist.slug}`}>
                      <Link href={`/artist/${artist.slug}`} onClick={handleLinkClick} className="block px-4 py-2 hover:bg-gray-700">
                        {artist.name}
                      </Link>
                    </li>
                  ))}
                </>
              )}
              {(results.animethemes?.length ?? 0) > 0 && (
                <>
                  <li className="px-4 py-2 text-xs font-bold text-gray-500 uppercase border-t border-gray-700">Músicas</li>
                  {results.animethemes?.map(theme => (
                    // Adicionamos uma verificação aqui para garantir que theme.anime exista antes de tentar renderizar
                    theme.anime && (
                      <li key={`theme-search-${theme.anime.slug}-${theme.slug}`}>
                        <Link href={`/anime/${theme.anime.slug}`} onClick={handleLinkClick} className="block px-4 py-2 hover:bg-gray-700 transition-colors">
                          <span className="font-bold">{theme.song?.title || 'Título Desconhecido'}</span>
                          <span className="block text-sm text-gray-400">{theme.anime.name} - {theme.slug.toUpperCase()}</span>
                        </Link>
                      </li>
                    )
                  ))}
                </>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}