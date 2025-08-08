// src/app/anime/[slug]/loading.tsx
export default function Loading() {
  return (
    <div className="container mx-auto p-4 md:p-6 animate-pulse">
      {/* Banner */}
      <div className="h-48 md:h-64 rounded-lg bg-gray-700 mb-6 shadow-lg"></div>

      {/* Conteúdo Principal */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Coluna Esquerda (Poster e Info) */}
        <div className="md:w-1/4 flex-shrink-0">
          <div className="relative w-full h-auto aspect-[2/3] rounded-lg bg-gray-700 shadow-md -mt-24 md:-mt-32"></div>
          <div className="mt-4">
            <div className="h-8 bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-6 bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>

        {/* Coluna Direita (Sinopse e Músicas) */}
        <div className="md:w-3/4">
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6"></div>
              <div className="h-4 bg-gray-700 rounded w-4/6"></div>
            </div>
          </div>

          <div className="mt-6">
            <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              {/* Skeleton for a few theme items */}
              <div className="h-20 bg-gray-800 rounded-lg"></div>
              <div className="h-20 bg-gray-800 rounded-lg"></div>
              <div className="h-20 bg-gray-800 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
