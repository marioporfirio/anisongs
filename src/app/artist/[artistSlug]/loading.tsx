// src/app/artist/[artistSlug]/loading.tsx
export default function Loading() {
  return (
    <div className="container mx-auto p-4 md:p-6 text-white animate-pulse">
      {/* Artist Header Skeleton */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
        <div className="flex-shrink-0 w-48 h-48 md:w-64 md:h-64 bg-gray-700 rounded-lg"></div>
        <div className="flex-grow pt-2 text-center md:text-left w-full">
          <div className="h-12 bg-gray-700 rounded w-3/4 md:w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-5/6 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-4/6"></div>
        </div>
      </div>

      {/* Controls Skeleton */}
      <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
        <div className="h-9 bg-gray-700 rounded w-1/4"></div>
        <div className="flex gap-2">
          <div className="h-9 bg-gray-700 rounded w-24"></div>
          <div className="h-9 bg-gray-700 rounded w-24"></div>
        </div>
      </div>

      {/* Song List Skeleton */}
      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 bg-gray-800 bg-opacity-50 rounded-lg">
            <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
            <ul className="space-y-4">
              {Array.from({ length: 2 }).map((_, j) => (
                <li key={j} className="p-4 bg-gray-700 rounded-md">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                    <div className="mb-2 sm:mb-0 w-full">
                      <div className="h-6 bg-gray-600 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-600 rounded w-1/4"></div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-24 bg-gray-600 rounded-full"></div>
                      <div className="h-8 w-8 bg-gray-600 rounded-full"></div>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-gray-600 pt-3">
                    <div className="h-5 bg-gray-600 rounded w-1/2"></div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}