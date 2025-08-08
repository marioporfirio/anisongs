// src/components/ThemeCard.tsx
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AddToPlaylistButton from './AddToPlaylistButton';
import { useState } from 'react';
import VideoPlayerModal from './VideoPlayerModal';

interface Artist {
  id: number;
  name: string;
  slug?: string;
}

interface ThemeCardProps {
  animeName: string;
  animeSlug: string;
  themeId: number;
  themeSlug: string;
  songTitle: string;
  artists?: Artist[];
  posterUrl?: string;
  isLoggedIn: boolean;
  videoUrl?: string;
}

export default function ThemeCard({
  animeName,
  animeSlug,
  themeId,
  themeSlug,
  songTitle,
  artists,
  posterUrl,
  isLoggedIn,
  videoUrl,
}: ThemeCardProps) {
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);

  const handlePlayVideo = (url: string) => {
    setSelectedVideoUrl(url);
  };

  const handleCloseModal = () => {
    setSelectedVideoUrl(null);
  };
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      variants={cardVariants}
      className="bg-slate-800/50 backdrop-blur-sm border border-slate-300/10 rounded-lg overflow-hidden shadow-lg h-full flex flex-col group transition-all duration-300 hover:border-indigo-500/50 hover:shadow-indigo-500/20 hover:shadow-2xl"
    >
      {videoUrl ? (
        <div 
          className="relative w-full h-40 overflow-hidden bg-black flex-shrink-0 block cursor-pointer"
          onClick={() => handlePlayVideo(videoUrl)}
        >
          <Image
            src={posterUrl || '/placeholder.png'}
            alt={`Poster for ${animeName}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        </div>
      ) : (
        <Link href={`/anime/${animeSlug}`} className="relative w-full h-40 overflow-hidden bg-black flex-shrink-0 block">
          <Image
            src={posterUrl || '/placeholder.png'}
            alt={`Poster for ${animeName}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        </Link>
      )}
      <div className="p-4 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="text-md font-bold text-white truncate" title={songTitle || 'Untitled'}>
            <Link href={`/anime/${animeSlug}`} className="hover:text-indigo-400 transition-colors">
              {songTitle || 'Untitled'}
            </Link>
          </h3>
          {artists && artists.length > 0 && (
            <div className="text-xs text-slate-400 truncate" title={artists.map(artist => artist.name).join(', ')}>
              {artists.map((artist, index) => (
                <span key={artist.id || index}>
                  {artist.slug ? (
                    <Link href={`/artist/${artist.slug}`} className="hover:text-indigo-400 hover:underline transition-colors">
                      {artist.name}
                    </Link>
                  ) : (
                    <span>{artist.name}</span>
                  )}
                  {index < artists.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          )}
          <p className="text-sm text-slate-300 truncate mt-1" title={animeName}>
            <Link href={`/anime/${animeSlug}`} className="hover:text-indigo-400 transition-colors">
              {animeName}
            </Link>
          </p>
          <p className="text-xs text-indigo-400 font-semibold mt-1">
            {themeSlug.toUpperCase()}
          </p>
        </div>
        <div className="flex justify-end mt-3">
          {isLoggedIn && <AddToPlaylistButton themeId={themeId} />}
        </div>
      </div>
      <VideoPlayerModal videoUrl={selectedVideoUrl} onClose={handleCloseModal} />
    </motion.div>
  );
}
