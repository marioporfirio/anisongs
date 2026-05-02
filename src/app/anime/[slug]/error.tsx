'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AnimeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Anime page error:', error);
  }, [error]);

  return (
    <main className="container mx-auto p-4 md:p-8 text-white text-center">
      <div className="max-w-md mx-auto mt-20">
        <div className="text-6xl mb-6">😵</div>
        <h1 className="text-3xl font-bold text-red-400 mb-4">Erro ao Carregar Anime</h1>
        <p className="text-gray-300 mb-2">
          A API do AnimeThemes pode estar temporariamente indisponível.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Tente novamente em alguns segundos.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Tentar Novamente
          </button>
          <Link
            href="/"
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Voltar ao Início
          </Link>
        </div>
      </div>
    </main>
  );
}
