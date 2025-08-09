// src/components/GlobalSearch.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Import useRouter
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
  const [results, setResults] = useState<SearchResult>({}); // Inicia como objeto vazio
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter(); // Initialize useRouter
  
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 500);
  useOnClickOutside(searchContainerRef, () => setIsDropdownOpen(false));

  useEffect(() => {
    // Early return if query is empty or too short
    if (!debouncedQuery || debouncedQuery.trim() === '' || debouncedQuery.length < 3) {
      setResults({});
      setIsDropdownOpen(false);
      return;
    }

    setIsDropdownOpen(true);

    async function fetchSearchResults() {
      setIsLoading(true);
      
      const encodedQuery = encodeURIComponent(debouncedQuery);
      
      // URL ROBUSTA: Usando 'fields' para garantir que a resposta seja sempre um objeto
      const API_URL = `https://api.animethemes.moe/search?q=${encodedQuery}&fields[search]=anime,artists,animethemes&include[animetheme]=song,anime`;

      try {
        const response = await fetch(API_URL);
        if (!response.ok) {
          const errorBody = await response.text();
          console.error("Corpo do erro da API:", errorBody);
          throw new Error(`A API respondeu com o status: ${response.status}`);
        }
        const data = await response.json();
        
        // Verificação final: Garante que `results` seja sempre um objeto.
        // Se data.search for um array (como no log), o resultado será um objeto vazio.
        setResults(typeof data.search === 'object' && !Array.isArray(data.search) ? data.search : {});

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

  const handleArtistResultClick = (artistSlug: string, event: React.MouseEvent) => {
    event.preventDefault(); // Prevent default Link navigation
    router.push(`/artist/${artistSlug}`); // Navigate to artist page
    
    setIsDropdownOpen(false); // Close dropdown
    setQuery(''); // Clear query
  };

  const hasResults = (results.anime?.length ?? 0) > 0 || (results.artists?.length ?? 0) > 0 || (results.animethemes?.length ?? 0) > 0;

  return (
    <div className="relative w-full max-w-xs md:max-w-sm" ref={searchContainerRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (query.length > 2) setIsDropdownOpen(true); }}
        placeholder="Buscar animes, músicas, artistas..."
        className="w-full bg-slate-700/50 backdrop-blur-sm border border-slate-600/80 text-white px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
      />

      {isDropdownOpen && (
        <div className="absolute top-full mt-2 w-full bg-slate-800/90 backdrop-blur-sm border border-slate-300/10 rounded-lg shadow-lg z-30 max-h-96 overflow-y-auto">
          {isLoading && <div className="p-4 text-gray-400 text-center">Buscando...</div>}
          
          {!isLoading && !hasResults && debouncedQuery.length > 2 && (
            <div className="p-4 text-gray-400 text-center">Nenhum resultado encontrado.</div>
          )}

          {!isLoading && hasResults && (
            <ul>
              {(results.anime?.length ?? 0) > 0 && (
                <>
                  <li className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Animes</li>
                  {results.anime?.map(anime => (
                    <li key={`anime-search-${anime.slug}`}>
                      <Link href={`/anime/${anime.slug}`} onClick={handleLinkClick} className="block px-4 py-2 hover:bg-slate-700/50 transition-colors">
                        {anime.name}
                      </Link>
                    </li>
                  ))}
                </>
              )}
              {(results.artists?.length ?? 0) > 0 && (
                <>
                  <li className="px-4 py-2 text-xs font-bold text-slate-400 uppercase border-t border-slate-300/10">Artistas</li>
                  {results.artists?.map(artist => (
                    <li key={`artist-search-${artist.slug}`}>
                      {/* Use the new handler for artist clicks */}
                      <a 
                        href={`/artist/${artist.slug}`} // Fallback href, actual navigation is prevented
                        onClick={(e) => handleArtistResultClick(artist.slug, e)} 
                        className="block px-4 py-2 hover:bg-slate-700/50 cursor-pointer"
                      >
                        {artist.name}
                      </a>
                    </li>
                  ))}
                </>
              )}
              {(results.animethemes?.length ?? 0) > 0 && (
                <>
                  <li className="px-4 py-2 text-xs font-bold text-slate-400 uppercase border-t border-slate-300/10">Músicas</li>
                  {results.animethemes?.map(theme => (
                    theme.anime && (
                      <li key={`theme-search-${theme.anime.slug}-${theme.slug}`}>
                        <Link href={`/anime/${theme.anime.slug}`} onClick={handleLinkClick} className="block px-4 py-2 hover:bg-slate-700/50 transition-colors">
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