"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deletePlaylist } from '@/app/actions';
import { useState } from 'react';

interface PlaylistItemClientProps {
  id: number;
  name: string;
  description: string | null;
}

export default function PlaylistItemClient({ id, name, description }: PlaylistItemClientProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Tem certeza que deseja deletar a playlist "${name}"?`)) {
      return;
    }

    setIsDeleting(true);
    const formData = new FormData();
    formData.append('playlistId', id.toString());

    try {
      const result = await deletePlaylist(formData);
      alert(result.message);
      if (result.success) {
        router.refresh(); // Revalidate data on successful deletion
      }
    } catch (error) {
      console.error("Erro ao deletar playlist:", error);
      alert(error instanceof Error ? error.message : "Ocorreu um erro desconhecido.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center bg-slate-800/50 backdrop-blur-sm border border-slate-300/10 rounded-lg shadow-lg p-4 transition-all duration-300 hover:border-indigo-500/50 hover:shadow-indigo-500/20 hover:shadow-2xl">
      <Link href={`/playlists/${id}`} className="flex-grow block">
        <h3 className="text-xl font-bold">{name}</h3>
        <p className="text-gray-400 mt-1">{description || "Sem descrição"}</p>
      </Link>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="ml-4 p-2 bg-red-700 rounded-full hover:bg-red-600 transition disabled:opacity-50 shadow-md shadow-red-500/20 hover:shadow-red-500/40"
        title="Deletar Playlist"
      >
        {isDeleting ? (
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    </div>
  );
}
