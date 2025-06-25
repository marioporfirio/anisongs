// src/components/ThemeFilters.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

interface ThemeFiltersProps {
  onFilterChange: (filters: { year: string; season: string; type: string }) => void;
}

export default function ThemeFilters({ onFilterChange }: ThemeFiltersProps) {
  const searchParams = useSearchParams();
  
  // O estado local é inicializado com os valores da URL
  const [year, setYear] = useState(searchParams.get('year') || '');
  const [season, setSeason] = useState(searchParams.get('season') || '');
  const [type, setType] = useState(searchParams.get('type') || '');

  // Gera a lista de anos dinamicamente
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1989 }, (_, i) => currentYear - i);

  // Efeito para chamar onFilterChange quando os estados locais mudam
  useEffect(() => {
    // Usamos um timeout para "agrupar" as mudanças e evitar múltiplas renderizações
    const handler = setTimeout(() => {
      onFilterChange({ year, season, type });
    }, 500); // Debounce de 500ms

    return () => {
      clearTimeout(handler);
    };
  }, [year, season, type, onFilterChange]);

  const clearFilters = () => {
    setYear('');
    setSeason('');
    setType('');
  };

  return (
    <div className="bg-gray-800 p-4 sticky top-0 z-20 shadow-md mb-8">
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-4">
        {/* Filtro de Ano */}
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Ano</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {/* Filtro de Temporada */}
        <select
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          className="bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Temporada</option>
          <option value="Winter">Inverno</option>
          <option value="Spring">Primavera</option>
          <option value="Summer">Verão</option>
          <option value="Fall">Outono</option>
        </select>

        {/* Filtro de Tipo */}
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tipo</option>
          <option value="OP">Opening</option>
          <option value="ED">Ending</option>
          <option value="IN">Insert</option>
        </select>

        {/* Botão de Limpar */}
        <button
          onClick={clearFilters}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
        >
          Limpar Filtros
        </button>
      </div>
    </div>
  );
}