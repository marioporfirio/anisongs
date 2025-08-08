// src/components/VideoPlayerModal.tsx

"use client";

interface VideoPlayerModalProps {
  videoUrl: string | null;
  onClose: () => void;
}

export default function VideoPlayerModal({ videoUrl, onClose }: VideoPlayerModalProps) {
  if (!videoUrl) return null;

  return (
    // Backdrop
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50"
      onClick={onClose}
    >
      {/* Modal Content */}
      <div 
        className="bg-slate-900/80 backdrop-blur-lg p-4 rounded-2xl shadow-2xl shadow-indigo-500/20 relative w-full max-w-4xl border border-slate-300/10"
        onClick={(e) => e.stopPropagation()} // Impede que o clique no vídeo feche o modal
      >
        <button onClick={onClose} className="absolute -top-4 -right-4 text-white text-3xl p-2 rounded-full bg-slate-800/80 hover:bg-slate-700/50 transition-colors z-50">×</button>
        <video
          controls
          autoPlay
          src={videoUrl}
          className="w-full h-full rounded-xl"
        >
          Seu navegador não suporta o formato de vídeo WebM.
        </video>
      </div>
    </div>
  );
}