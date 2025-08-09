// src/components/ThemeCardSkeleton.tsx
export default function ThemeCardSkeleton() {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-300/10 rounded-lg overflow-hidden shadow-lg h-full flex flex-col animate-pulse">
      <div className="w-full h-40 bg-slate-700/50"></div>
      <div className="p-4 flex-grow flex flex-col justify-between">
        <div>
          <div className="h-5 bg-slate-700/50 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-slate-700/50 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-slate-700/50 rounded w-2/3 mb-2"></div>
        </div>
        <div className="flex justify-end mt-3">
          <div className="h-8 w-8 bg-slate-700/50 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}