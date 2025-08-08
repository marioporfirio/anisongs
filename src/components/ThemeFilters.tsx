// src/components/ThemeFilters.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import CustomSelect from './CustomSelect';

interface ThemeFiltersProps {
  onFilterChange: (filters: { year: string; season: string; type: string }) => void;
}

export default function ThemeFilters({ onFilterChange }: ThemeFiltersProps) {
  const searchParams = useSearchParams();
  
  const [year, setYear] = useState(searchParams.get('year') || '');
  const [season, setSeason] = useState(searchParams.get('season') || '');
  const [type, setType] = useState(searchParams.get('type') || '');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1989 }, (_, i) => ({ value: (currentYear - i).toString(), label: (currentYear - i).toString() }));

  const seasons = [
    { value: 'Winter', label: 'Inverno' },
    { value: 'Spring', label: 'Primavera' },
    { value: 'Summer', label: 'Verão' },
    { value: 'Fall', label: 'Outono' },
  ];

  const types = [
    { value: 'OP', label: 'Opening' },
    { value: 'ED', label: 'Ending' },
    { value: 'IN', label: 'Insert Song' },
  ];

  useEffect(() => {
    const handler = setTimeout(() => {
      onFilterChange({ year, season, type });
    }, 300);

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
    <div className="bg-gray-900/70 backdrop-blur-sm p-4 sticky top-[65px] z-20 shadow-lg border-b border-gray-700/80 mb-8">
      <div className="container mx-auto flex flex-col md:flex-row flex-wrap items-center justify-center gap-4">
        
        <CustomSelect options={[{ value: '', label: 'Ano' }, ...years]} value={year} onChange={setYear} placeholder="Ano" />
        <CustomSelect options={[{ value: '', label: 'Temporada' }, ...seasons]} value={season} onChange={setSeason} placeholder="Temporada" />
        <CustomSelect options={[{ value: '', label: 'Tipo' }, ...types]} value={type} onChange={setType} placeholder="Tipo" />

        <button
          onClick={clearFilters}
          className="bg-red-600/80 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-red-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed h-10 mt-4 md:mt-0"
          disabled={!year && !season && !type}
          title="Limpar todos os filtros"
        >
          Limpar Filtros
        </button>
      </div>
    </div>
  );
}
