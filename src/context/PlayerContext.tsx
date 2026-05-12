import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Track, Playlist, AppSettings } from '../types';
import { get, set } from 'idb-keyval';

interface PlayerContextType {
  tracks: Track[];
  addTracks: (newTracks: Track[]) => void;
  removeTrack: (id: string) => void;
  deleteTrackPermanently: (track: Track) => Promise<void>;
  history: Track[];
  addToHistory: (track: Track) => void;
  removeFromHistory: (trackId: string) => void;
  playlists: Playlist[];
  createPlaylist: (name: string, description?: string, coverUrl?: string | null, initialTracks?: Track[]) => void;
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  currentTrack: Track | null;
  playTrack: (track: Track) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  isShuffle: boolean;
  toggleShuffle: () => void;
  queue: Track[];
  addToQueue: (track: Track, playNext?: boolean) => void;
  removeFromQueue: (index: number) => void;
  removeMultipleFromQueue: (indices: number[]) => void;
  clearQueue: () => void;
  shuffleQueue: () => void;
  playNext: () => void;
  playPrevious: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  needsPermission: boolean;
  requestDirectoryPermission: () => Promise<boolean>;
  isRestoring: boolean;
}

export const PlayerContext = createContext<PlayerContextType | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    highRes: true,
    historyLimit: 20,
    groupByAlbum: true,
    ephemeralAutoClose: false,
    ephemeralLimit: 3,
    skipDeleteWarning: false,
  });
  
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioSrc, setAudioSrc] = useState<string | undefined>();

  useEffect(() => {
    if (currentTrack?.file) {
      const url = URL.createObjectURL(currentTrack.file);
      setAudioSrc(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioSrc(undefined);
    }
  }, [currentTrack?.file]);

  const [needsPermission, setNeedsPermission] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const directoryHandleRef = useRef<any>(null);

  // Initialize from storage
  useEffect(() => {
    const loadData = async () => {
      // Load Settings
      const savedSettings = localStorage.getItem('utrax_settings');
      if (savedSettings) {
        try {
          setSettings({ ...settings, ...JSON.parse(savedSettings) });
        } catch(e) {}
      }

      // Load Directory Handle
      try {
        const handle = await get('directoryHandle');
        if (handle) {
          directoryHandleRef.current = handle;
          const perm = await handle.queryPermission({ mode: 'read' });
          if (perm === 'prompt') {
            setNeedsPermission(true);
          }
        }
      } catch(e) {
        console.error("Error loading directory handle:", e);
      }

      // Load DB tracks
      try {
        const storedTracks: any[] = await get('tracks') || [];
        // Restore tracks mapping file handles if possible
        const restoredTracks = storedTracks.map(t => {
          if (t.coverBlob) {
            t.coverUrl = URL.createObjectURL(t.coverBlob);
          }
          return t;
        });
        setTracks(restoredTracks);
      } catch(e) {
        console.error("Error loading tracks:", e);
      }

      // Load DB playlists
      try {
        const storedPlaylists: any[] = await get('playlists') || [];
        setPlaylists(storedPlaylists);
      } catch(e) {
        console.error("Error loading playlists:", e);
      }

      setIsRestoring(false);
    };
    loadData();
  }, []);

  // Save changes to DB
  useEffect(() => {
    if (isRestoring) return;
    set('tracks', tracks.map(t => ({...t, file: undefined, coverUrl: undefined})));
  }, [tracks, isRestoring]);

  useEffect(() => {
    if (isRestoring) return;
    set('playlists', playlists);
  }, [playlists, isRestoring]);

  const requestDirectoryPermission = async () => {
    if (!directoryHandleRef.current) return false;
    try {
      const perm = await directoryHandleRef.current.requestPermission({ mode: 'read' });
      if (perm === 'granted') {
        setNeedsPermission(false);
        return true;
      }
      return false;
    } catch(e) {
      console.error(e);
      return false;
    }
  };

  const addTracks = (newTracks: Track[]) => {
    setTracks(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const filtered = newTracks.filter(t => !existingIds.has(t.id));
      return [...prev, ...filtered];
    });
  };

  const removeTrack = (id: string) => {
    setTracks(prev => prev.filter(t => t.id !== id));
    setHistory(prev => prev.filter(t => t.id !== id));
    setPlaylists(prev => prev.map(p => ({
      ...p,
      tracks: p.tracks.filter(t => t.id !== id)
    })));
  };

  const deleteTrackPermanently = async (track: Track) => {
    if (track.fileHandle && track.fileHandle.remove) {
      try {
        await track.fileHandle.remove();
      } catch(e) {
        console.error("Failed to delete file from disk:", e);
      }
    }
    removeTrack(track.id);
  };

  const addToHistory = (track: Track) => {
    setHistory(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      const newHistory = [track, ...filtered];
      return newHistory.slice(0, settings.historyLimit);
    });
  };

  const removeFromHistory = (trackId: string) => {
    setHistory(prev => prev.filter(t => t.id !== trackId));
  };

  const createPlaylist = (name: string, description?: string, coverUrl?: string | null, initialTracks: Track[] = []) => {
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name,
      description,
      coverUrl,
      tracks: initialTracks,
    };
    setPlaylists(prev => [...prev, newPlaylist]);
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('utrax_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const updateTrack = (id: string, updates: Partial<Track>) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    setHistory(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    if (currentTrack?.id === id) {
      setCurrentTrack(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const playTrack = async (track: Track) => {
    let playableTrack = { ...track };
    
    // Lazy load the File object if we only have the fileHandle
    if (!playableTrack.file && playableTrack.fileHandle) {
      try {
        const file = await playableTrack.fileHandle.getFile();
        playableTrack.file = file;
        // Also update it in the tracks array so we don't load it again this session
        setTracks(prev => prev.map(t => t.id === playableTrack.id ? { ...t, file } : t));
      } catch (e) {
        console.error("Failed to read file. Permission required?", e);
        // We could alert here, but the sidebar permission banner handles the UX
      }
    }

    setCurrentTrack(playableTrack);
    setIsPlaying(true);
    addToHistory(playableTrack);
  };

  const toggleShuffle = () => setIsShuffle(!isShuffle);

  const addToQueue = (track: Track, playNext?: boolean) => {
    setQueue(prev => {
      if (playNext) {
        return [track, ...prev];
      }
      return [...prev, track];
    });
  };

  const removeFromQueue = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  const removeMultipleFromQueue = (indices: number[]) => {
    setQueue(prev => prev.filter((_, i) => !indices.includes(i)));
  };

  const clearQueue = () => setQueue([]);

  const shuffleQueue = () => {
    setQueue(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  };

  const playNext = () => {
    if (queue.length > 0) {
      const nextTrack = queue[0];
      setQueue(prev => prev.slice(1));
      playTrack(nextTrack);
      return;
    }

    if (!currentTrack || tracks.length === 0) return;
    
    if (isShuffle) {
      const remainingTracks = tracks.filter(t => t.id !== currentTrack.id);
      if (remainingTracks.length > 0) {
        const randomTrack = remainingTracks[Math.floor(Math.random() * remainingTracks.length)];
        playTrack(randomTrack);
      }
      return;
    }

    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    if (currentIndex >= 0 && currentIndex < tracks.length - 1) {
      playTrack(tracks[currentIndex + 1]);
    }
  };

  const playPrevious = () => {
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    if (currentIndex > 0) {
      playTrack(tracks[currentIndex - 1]);
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    }
  };

  return (
    <PlayerContext.Provider 
      value={{ 
        tracks, addTracks, removeTrack,
        history, addToHistory, removeFromHistory,
        playlists, createPlaylist,
        settings, updateSettings,
        updateTrack,
        currentTrack, playTrack,
        isPlaying, setIsPlaying,
        isShuffle, toggleShuffle,
        queue, addToQueue, removeFromQueue, removeMultipleFromQueue, clearQueue, shuffleQueue,
        playNext, playPrevious,
        audioRef,
        needsPermission, requestDirectoryPermission, isRestoring, deleteTrackPermanently
      }}
    >
      {children}
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          autoPlay={isPlaying}
          onEnded={playNext}
          onPlay={() => setIsPlaying(true)}
          onPause={(e) => {
            if (e.currentTarget.readyState !== 0) {
              setIsPlaying(false);
            }
          }}
        />
      )}
    </PlayerContext.Provider>
  );
}