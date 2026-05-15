import React, { useEffect, useState, useRef } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { Mic2, Music } from 'lucide-react';

interface LyricLine {
  time: number;
  text: string;
}

function parseLrc(lrc: string): LyricLine[] {
  const lines = lrc.split('\n');
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = parseInt(match[3], 10);
      const time = min * 60 + sec + ms / (match[3].length === 2 ? 100 : 1000);
      const text = line.replace(timeRegex, '').trim();
      if (text) {
        result.push({ time, text });
      }
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

export default function LyricsView() {
  const { currentTrack, audioRef } = usePlayer();
  const [currentTime, setCurrentTime] = useState(0);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentTrack?.lyrics) {
      const parsed = parseLrc(currentTrack.lyrics);
      if (parsed.length > 0) {
        setLyrics(parsed);
        setPlainLyrics(null);
      } else {
        setLyrics([]);
        setPlainLyrics(currentTrack.lyrics);
      }
    } else {
      setLyrics([]);
      setPlainLyrics(null);
    }
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [audioRef]);

  // Auto-scroll to active lyric
  useEffect(() => {
    if (isScrolling || !activeLineRef.current || !containerRef.current) return;
    
    activeLineRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }, [currentTime, isScrolling]);

  const handleScroll = () => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 3000); // Resume auto-scroll and blur after 3 seconds of no scrolling
  };

  const getActiveIndex = () => {
    if (!lyrics.length) return -1;
    // Find the last lyric line that is past its time
    let activeIdx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return activeIdx;
  };

  const activeIndex = getActiveIndex();

  return (
    <div className="p-8 h-full flex flex-col min-w-0 relative overflow-hidden">
      {/* Dynamic Background */}
      {currentTrack?.coverUrl ? (
        <div className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-1000">
          <img src={currentTrack.coverUrl} className="w-full h-full object-cover blur-[100px] scale-150 opacity-60 mix-blend-screen" alt="" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/90"></div>
        </div>
      ) : (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-black/80 pointer-events-none"></div>
      )}

      <div className="relative z-10 flex flex-col md:flex-row h-full gap-12">
        {/* Left Side: Artwork & Track Info */}
        <div className="flex-shrink-0 flex flex-col items-center md:items-start justify-center md:w-1/3">
          {currentTrack?.coverUrl ? (
            <img src={currentTrack.coverUrl} className="w-64 h-64 md:w-80 md:h-80 rounded-2xl shadow-2xl mb-8 border border-white/10 transition-transform hover:scale-105 duration-500" alt="Cover" />
          ) : (
            <div className="w-64 h-64 md:w-80 md:h-80 rounded-2xl bg-white/5 border border-white/10 shadow-2xl mb-8 flex items-center justify-center backdrop-blur-md">
              <Music size={64} className="text-white/20" />
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight drop-shadow-md text-center md:text-left">{currentTrack ? currentTrack.title : 'No Track Playing'}</h1>
          <p className="text-xl md:text-2xl text-white/60 drop-shadow-md text-center md:text-left">{currentTrack ? currentTrack.artist : '---'}</p>
        </div>

        {/* Right Side: Lyrics Scroll View */}
        <div 
          className="flex-1 overflow-y-auto no-scrollbar pb-[50vh] pt-[20vh] mask-image-fade"
          ref={containerRef}
          onScroll={handleScroll}
          style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)' }}
        >
          {lyrics.length > 0 ? (
            <div className="flex flex-col gap-6 md:gap-8 max-w-3xl">
              {lyrics.map((line, idx) => {
                const isActive = idx === activeIndex;
                const isPassed = idx < activeIndex;
                
                let styling = "text-3xl md:text-5xl font-bold transition-all duration-500 ";
                
                if (isScrolling) {
                  styling += isActive ? "text-white scale-105" : "text-white/50 scale-100";
                } else {
                  if (isActive) {
                    styling += "text-white scale-105 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]";
                  } else if (isPassed) {
                    styling += "text-white/30 scale-95 blur-[2px]";
                  } else {
                    styling += "text-white/30 scale-95 blur-[2px]";
                  }
                }

                return (
                  <div 
                    key={idx} 
                    ref={isActive ? activeLineRef : null}
                    className={styling + " cursor-pointer hover:text-white/80"}
                    onClick={() => {
                      if (audioRef?.current) {
                        audioRef.current.currentTime = line.time;
                        setCurrentTime(line.time);
                      }
                    }}
                  >
                    {line.text}
                  </div>
                );
              })}
            </div>
          ) : plainLyrics ? (
            <div className="flex flex-col gap-6 md:gap-8 max-w-3xl text-center">
              {plainLyrics.split('\n').map((line, idx) => (
                <div key={idx} className="text-3xl md:text-5xl font-bold text-white/80">
                  {line || " "}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
              <Mic2 size={64} className="text-white mb-6 animate-pulse" />
              <p className="text-2xl text-white font-medium">No lyrics available</p>
              <p className="text-white/60 mt-2">To see lyrics, ensure the track has LRC data.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Global styles for hiding scrollbar if not already in index.css */}
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
