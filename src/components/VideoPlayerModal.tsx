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
        className="bg-gray-900 p-4 rounded-lg shadow-xl relative w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()} // Impede que o clique no vídeo feche o modal
      >
        <button onClick={onClose} className="absolute top-2 right-2 text-white text-2xl">×</button>
        <video
          controls
          autoPlay
          src={videoUrl}
          className="w-full h-full rounded"
        >
          Seu navegador não suporta o formato de vídeo WebM.
        </video>
      </div>
    </div>
  );
}