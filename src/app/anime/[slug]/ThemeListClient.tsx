// src/app/anime/[slug]/ThemeListClient.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion'; // Importa motion
import VideoPlayerModal from '@/components/VideoPlayerModal';
import RatingStars from '@/components/RatingStars';
import AddToPlaylistButton from '@/components/AddToPlaylistButton';
import type { ThemeWithRating } from './page';
import Link from 'next/link';

function ThemeItem({
  theme,
  animeSlug,
  isLoggedIn,
  onPlay,
}: { theme: ThemeWithRating; animeSlug: string; isLoggedIn: boolean; onPlay: (url: string) => void; }) {
  const video = theme.animethemeentries[0]?.videos[0];

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={itemVariants}
      className="bg-slate-800/50 backdrop-blur-sm p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-300/10 transition-all duration-300 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10"
    >
      <div className="flex-grow w-full">
        <div className='flex justify-between items-start'>
            <div>
                <span className="font-bold text-indigo-400 text-sm">{theme.slug.toUpperCase()}</span>
                <p className="text-lg text-white">{theme.song?.title || "Título Desconhecido"}</p>
                {theme.song?.artists && theme.song.artists.length > 0 && (
                  <p className="text-sm text-slate-400">
                    {theme.song.artists.map((artist, index) => (
                      artist.slug ? (
                        <span key={artist.id}>
                          <Link href={`/artist/${artist.slug}`} className="hover:text-indigo-300 hover:underline transition-colors">
                            {artist.name}
                          </Link>
                          {index < theme.song!.artists!.length - 1 ? ', ' : ''}
                        </span>
                      ) : (
                        <span key={artist.id}>
                          {artist.name}
                          {index < theme.song!.artists!.length - 1 ? ', ' : ''}
                        </span>
                      )
                    ))}
                  </p>
                )}
            </div>
            {video && (
            <button onClick={() => onPlay(video.link)} className="bg-indigo-600/80 text-white px-3 py-1.5 rounded-full hover:bg-indigo-600/100 transition-all duration-300 shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/40 flex-shrink-0 ml-4 sm:hidden">▶</button>
          )}
        </div>
        <div className="mt-2">
          <RatingStars animeSlug={animeSlug} themeSlug={theme.slug} isLoggedIn={isLoggedIn} />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {isLoggedIn && <AddToPlaylistButton themeId={theme.id} />}
        {video && <button onClick={() => onPlay(video.link)} className="bg-indigo-600/80 text-white px-4 py-2 rounded-full hover:bg-indigo-600/100 transition-all duration-300 shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/40 hidden sm:block">▶ Assistir</button>}
      </div>
    </motion.div>
  );
}

export default function ThemeListClient({
  openings,
  endings,
  others,
  animeSlug,
  isLoggedIn,
}: {
  openings: ThemeWithRating[];
  endings: ThemeWithRating[];
  others: ThemeWithRating[];
  animeSlug: string;
  isLoggedIn: boolean;
}) {
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);

  const handlePlay = (url: string) => setSelectedVideoUrl(url);
  const handleCloseModal = () => setSelectedVideoUrl(null);

  const hasAnyTheme = openings.length > 0 || endings.length > 0 || others.length > 0;
  if (!hasAnyTheme) {
    return <p className="text-slate-400">Nenhum tema musical encontrado para este anime.</p>;
  }

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } },
  };

  return (
    <>
      <div className="space-y-8">
        {openings.length > 0 && (
          <motion.section variants={sectionVariants} initial="hidden" animate="visible">
            <h2 className="text-3xl font-bold border-b-2 border-indigo-500 pb-2 mb-6">Aberturas</h2>
            <div className="space-y-4">
              {openings.map(theme => (
                <ThemeItem key={theme.id} theme={theme} animeSlug={animeSlug} isLoggedIn={isLoggedIn} onPlay={handlePlay} />
              ))}
            </div>
          </motion.section>
        )}
        {endings.length > 0 && (
          <motion.section variants={sectionVariants} initial="hidden" animate="visible">
            <h2 className="text-3xl font-bold border-b-2 border-pink-500 pb-2 mb-6">Encerramentos</h2>
            <div className="space-y-4">
              {endings.map(theme => (
                 <ThemeItem key={theme.id} theme={theme} animeSlug={animeSlug} isLoggedIn={isLoggedIn} onPlay={handlePlay} />
              ))}
            </div>
          </motion.section>
        )}
        {others.length > 0 && (
          <motion.section variants={sectionVariants} initial="hidden" animate="visible">
            <h2 className="text-3xl font-bold border-b-2 border-teal-500 pb-2 mb-6">Outros Temas</h2>
            <div className="space-y-4">
              {others.map(theme => (
                 <ThemeItem key={theme.id} theme={theme} animeSlug={animeSlug} isLoggedIn={isLoggedIn} onPlay={handlePlay} />
              ))}
            </div>
          </motion.section>
        )}
      </div>
      <VideoPlayerModal videoUrl={selectedVideoUrl} onClose={handleCloseModal} />
    </>
  );
}
