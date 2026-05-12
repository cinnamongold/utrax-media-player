import React from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { Mic2, Music } from 'lucide-react';

export default function LyricsView() {
  const { currentTrack } = usePlayer();

  return (
    <div className="p-8 h-full flex flex-col min-w-0 items-center justify-center relative overflow-hidden">
      {/* Background blur of current cover if available */}
      {currentTrack?.coverUrl && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
          <img src={currentTrack.coverUrl} className="w-full h-full object-cover blur-3xl scale-110" alt="" />
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center max-w-2xl text-center">
        {currentTrack?.coverUrl ? (
          <img src={currentTrack.coverUrl} className="w-48 h-48 rounded-2xl shadow-2xl mb-8 border border-white/10" alt="Cover" />
        ) : (
          <div className="w-48 h-48 rounded-2xl bg-white/5 border border-white/10 shadow-2xl mb-8 flex items-center justify-center">
            <Music size={48} className="text-white/20" />
          </div>
        )}

        <h1 className="text-4xl font-bold text-white mb-2">{currentTrack ? currentTrack.title : 'No Track Playing'}</h1>
        <p className="text-xl text-white/50 mb-12">{currentTrack ? currentTrack.artist : '---'}</p>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md w-full">
          <Mic2 size={48} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 font-medium">Lyrics functionality coming soon...</p>
        </div>
      </div>
    </div>
  );
}
