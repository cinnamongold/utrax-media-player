import React, { useState, useMemo } from 'react';
import { Music, Shuffle, Play, Edit2, ListMusic, Trash2, AudioLines } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { PageId, Track } from '../../types';
import EditTrackModal from './EditTrackModal';

export default function Library({ onNavigate, highlightTrackId }: { onNavigate: (id: PageId, params?: any) => void, highlightTrackId?: string }) {
  const { tracks, settings, playTrack, playContext, updateTrack, playlists, isShuffle, toggleShuffle, deleteTrackPermanently, updateSettings, currentTrack, isPlaying } = usePlayer();
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'album' | 'artist' | 'year'>('name-asc');
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);

  React.useEffect(() => {
    if (highlightTrackId) {
      const el = document.getElementById(`track-${highlightTrackId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Double flash effect
        el.classList.add('!bg-white/30');
        setTimeout(() => {
          el.classList.remove('!bg-white/30');
          setTimeout(() => {
            el.classList.add('!bg-white/30');
            setTimeout(() => el.classList.remove('!bg-white/30'), 500);
          }, 200);
        }, 500);
      }
    }
  }, [highlightTrackId, tracks, settings.groupByAlbum, sortBy]);

  const displayItems = useMemo(() => {
    if (settings.groupByAlbum) {
      const albumsObj = tracks.reduce((acc, track) => {
        const key = `${track.album}-${track.artist}`;
        if (!acc[key]) {
          acc[key] = {
            title: track.album,
            artist: track.artist,
            coverUrl: track.coverUrl,
            tracks: []
          };
        }
        acc[key].tracks.push(track);
        if (!acc[key].coverUrl && track.coverUrl) {
          acc[key].coverUrl = track.coverUrl;
        }
        return acc;
      }, {} as Record<string, any>);
      const albumList = Object.values(albumsObj) as any[];

      switch (sortBy) {
        case 'name-asc': albumList.sort((a, b) => a.title.localeCompare(b.title)); break;
        case 'name-desc': albumList.sort((a, b) => b.title.localeCompare(a.title)); break;
        case 'artist': albumList.sort((a, b) => a.artist.localeCompare(b.artist)); break;
        default: albumList.sort((a, b) => a.title.localeCompare(b.title)); break;
      }
      return { type: 'albums' as const, items: albumList };
    } else {
      const sorted = [...tracks];
      switch (sortBy) {
        case 'name-asc': sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
        case 'name-desc': sorted.sort((a, b) => b.title.localeCompare(a.title)); break;
        case 'album': sorted.sort((a, b) => a.album.localeCompare(b.album)); break;
        case 'artist': sorted.sort((a, b) => a.artist.localeCompare(b.artist)); break;
        case 'year': sorted.sort((a, b) => (b.year || 0) - (a.year || 0)); break;
      }
      return { type: 'tracks' as const, items: sorted };
    }
  }, [tracks, settings.groupByAlbum, sortBy]);

  return (
    <div className="p-8 h-full flex flex-col min-w-0">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-1 text-white">Your Library</h1>
          <p className="text-white/50 text-sm">
            {tracks.length} Tracks • {displayItems.type === 'albums' ? `${displayItems.items.length} Albums` : `All Tracks`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white/10 text-white rounded-lg px-3 py-2 border border-white/20 outline-none text-sm"
          >
            <option value="name-asc" className="text-black">Name (A-Z)</option>
            <option value="name-desc" className="text-black">Name (Z-A)</option>
            <option value="artist" className="text-black">Artist</option>
            {settings.groupByAlbum ? null : <option value="album" className="text-black">Album</option>}
            {settings.groupByAlbum ? null : <option value="year" className="text-black">Year</option>}
          </select>
          <button 
            id="import-tracks-btn"
            onClick={() => onNavigate('import')}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-sm font-semibold shadow-lg transition-all text-white active:scale-95"
          >
            Import Tracks
          </button>
        </div>
      </header>


      <div className="flex-1 overflow-hidden">
        {displayItems.items.length === 0 && playlists.length === 0 ? (
          <div className="h-40 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center text-white/40 border-dashed">
            No tracks or playlists imported yet.
          </div>
        ) : (
          <div className="h-full overflow-y-auto custom-scrollbar pr-4 pb-4">
            {playlists.length > 0 && (
              <div className="mb-10">
                <h2 className="text-xl font-bold text-white mb-4">Playlists</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-max">
                  {playlists.map(pl => (
                    <div 
                      key={pl.id} 
                      onClick={() => onNavigate('playlist', { playlistId: pl.id })}
                      className="group rounded-[24px] border border-white/10 shadow-lg transition-all duration-300 cursor-pointer overflow-hidden bg-white/5 p-4 flex flex-col gap-3 hover:bg-white/10"
                    >
                      <div className="aspect-square w-full rounded-xl border border-white/10 shadow-inner overflow-hidden flex items-center justify-center bg-white/5 text-white/20 relative">
                        {pl.coverUrl ? (
                          <img src={pl.coverUrl} className="w-full h-full object-cover" />
                        ) : (
                          <ListMusic size={32} />
                        )}
                        
                      </div>
                      <div className="overflow-hidden">
                        <h2 className="font-bold truncate text-white text-sm">{pl.name}</h2>
                        <p className="text-white/60 font-medium truncate text-xs">{pl.tracks.length} tracks</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-xl font-bold text-white mb-4">
                {settings.groupByAlbum ? 'Albums' : 'All Tracks'}
              </h2>
              {displayItems.type === 'albums' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-max">
                  {displayItems.items.map((album: any, i: number) => {
                    const isAlbumPlaying = currentTrack?.album === album.title && currentTrack?.artist === album.artist;
                    return (
                      <div 
                        key={i} 
                        id={`album-card-${i}`}
                        onClick={() => onNavigate('album', { albumName: album.title, artistName: album.artist })}
                        className="group rounded-[24px] border border-white/10 shadow-lg transition-all duration-300 cursor-pointer overflow-hidden bg-white/5 p-4 flex flex-col gap-3 hover:bg-white/10"
                      >
                        <div className="aspect-square w-full rounded-xl border border-white/10 shadow-inner overflow-hidden flex items-center justify-center bg-white/5 text-white/20 relative">
                          {album.coverUrl ? (
                            <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
                          ) : (
                            <Music size={32} />
                          )}
                          {isAlbumPlaying && isPlaying && (
                            <div className="absolute top-2 right-2 bg-[#92F7FF]/20 text-[#92F7FF] p-1.5 rounded-full shadow-[0_0_10px_rgba(146,247,255,0.4)] z-10">
                              <AudioLines size={16} className="animate-pulse" />
                            </div>
                          )}
                          
                        </div>
                        <div className="overflow-hidden">
                          <h2 className="font-bold truncate text-white text-sm">{album.title}</h2>
                          <p 
                            className="text-white/60 font-medium truncate text-xs hover:underline hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('artist', { artistName: album.artist });
                            }}
                          >
                            {album.artist}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {displayItems.items.map((track: Track, i: number) => (
                    <div 
                      key={track.id}
                      id={`track-${track.id}`}
                      className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/10 cursor-pointer group transition-colors duration-500"
                      onClick={() => onNavigate('album', { albumName: track.album, artistName: track.artist, highlightTrackId: track.id })}
                    >
                      <div className="w-12 h-12 rounded-lg bg-white/5 overflow-hidden flex-shrink-0 relative">
                        {track.coverUrl ? (
                          <img src={track.coverUrl} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20">
                            <Music size={20} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); playTrack(track); }} className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
                            <Play fill="white" size={12} className="text-white ml-0.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">{track.title}</div>
                        <div className="text-white/50 text-xs truncate">{track.artist} • {track.album}</div>
                      </div>
                      {track.year && <div className="text-white/30 text-xs tabular-nums">{track.year}</div>}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2 shrink-0 flex items-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTrack(track);
                          }}
                          className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (settings.skipDeleteWarning) {
                              deleteTrackPermanently(track);
                            } else {
                              setTrackToDelete(track);
                            }
                          }}
                          className="p-2 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {editingTrack && (
        <EditTrackModal 
          track={editingTrack}
          onClose={() => setEditingTrack(null)}
          onSave={updateTrack}
        />
      )}

      {trackToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setTrackToDelete(null)}>
          <div className="bg-[#111] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-2">Delete Track?</h2>
            <p className="text-white/60 text-sm mb-6">
              {trackToDelete.fileHandle?.remove 
                ? "Are you sure? This will permanently delete the file from your computer's hard drive."
                : "This will remove the track from your library."}
            </p>
            
            <label className="flex items-center gap-2 mb-6 cursor-pointer group w-fit">
              <input 
                type="checkbox" 
                checked={settings.skipDeleteWarning}
                onChange={(e) => updateSettings({ skipDeleteWarning: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-blue-500 checked:border-blue-500"
              />
              <span className="text-sm text-white/50 group-hover:text-white/80 transition-colors">Don't ask again</span>
            </label>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setTrackToDelete(null)}
                className="px-4 py-2 rounded-xl text-white hover:bg-white/10 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  deleteTrackPermanently(trackToDelete);
                  setTrackToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}