// src/app/playlists/[id]/loading.tsx
export default function Loading() {
  return (
    <div className="container mx-auto p-4 md:p-6 animate-pulse">
      {/* Playlist Header */}
      <div className="mb-8">
        <div className="h-10 bg-gray-700 rounded w-1/2 mb-3"></div>
        <div className="h-5 bg-gray-700 rounded w-3/4"></div>
      </div>

      {/* Theme List Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg">
            <div className="w-16 h-16 bg-gray-700 rounded-md flex-shrink-0"></div>
            <div className="flex-grow space-y-2">
              <div className="h-5 bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            </div>
            <div className="h-8 w-20 bg-gray-700 rounded-full"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
