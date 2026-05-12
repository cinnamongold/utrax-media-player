import { useState, useEffect, useRef } from 'react';
import { Home, Library, History, Settings, Disc, Mic, ListMusic, Plus, Download, X, Pin } from 'lucide-react';
import { PageId, PageState } from '../types';
import Logo from './Logo';
import { usePlayer } from '../context/PlayerContext';

interface SidebarProps {
  route: PageState;
  onNavigate: (id: PageId, params?: any) => void;
}

export default function Sidebar({ route, onNavigate }: SidebarProps) {
  const { playlists, needsPermission, requestDirectoryPermission, settings } = usePlayer();
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'import', label: 'Import', icon: Download },
    { id: 'recents', label: 'Recents', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const [ephemeralPages, setEphemeralPages] = useState<{ state: PageState, pinned: boolean }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isStandard = navItems.some(item => item.id === route.id);

    setEphemeralPages(prev => {
      let next = [...prev];

      if (!isStandard) {
        // Find if it already exists to preserve its pinned status
        const existingIdx = next.findIndex(p => p.state.id === route.id && JSON.stringify(p.state.params) === JSON.stringify(route.params));
        const isPinned = existingIdx !== -1 ? next[existingIdx].pinned : false;

        // Remove it so we can move it to the end
        if (existingIdx !== -1) {
          next.splice(existingIdx, 1);
        }
        
        // Add it to the end
        next.push({ state: route, pinned: isPinned });
        
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 0);
      }

      // Handle auto-close
      if (settings.ephemeralAutoClose) {
        const unpinnedCount = next.filter(p => !p.pinned).length;
        if (unpinnedCount > settings.ephemeralLimit) {
          const numToRemove = unpinnedCount - settings.ephemeralLimit;
          let removed = 0;
          next = next.filter(p => {
             if (!p.pinned && removed < numToRemove) {
                removed++;
                return false;
             }
             return true;
          });
        }
      }

      return next;
    });
  }, [route, settings.ephemeralAutoClose, settings.ephemeralLimit]);

  const getEphemeralLabel = (state: PageState) => {
    switch (state.id) {
      case 'album': return state.params?.albumName || 'Album';
      case 'artist': return state.params?.artistName || 'Artist';
      case 'playlist': {
        const pl = playlists.find(p => p.id === state.params?.playlistId);
        return pl ? pl.name : 'Playlist';
      }
      case 'create-playlist': return 'Create Playlist';
      case 'download': return 'Download Music';
      case 'queue': return 'Queue';
      default: return 'Page';
    }
  };

  const getEphemeralIcon = (state: PageState) => {
    switch (state.id) {
      case 'album': return Disc;
      case 'artist': return Mic;
      case 'playlist': return ListMusic;
      case 'create-playlist': return Plus;
      case 'download': return Download;
      default: return Disc;
    }
  };

  return (
    <aside className="w-64 bento-container flex flex-col p-6 min-h-0">
      <div className="mb-8 px-2 group cursor-pointer transition-transform hover:scale-105 active:scale-95 shrink-0" onClick={() => onNavigate('home')}>
        <Logo />
      </div>

      {needsPermission && (
        <div className="mb-6 mx-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl shrink-0">
          <p className="text-xs text-blue-400 font-medium mb-3 leading-tight text-center">
            Click below to restore playback access to your library
          </p>
          <button 
            onClick={requestDirectoryPermission}
            className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors"
          >
            Restore Access
          </button>
        </div>
      )}

      <nav className="flex flex-col gap-2 shrink-0">
        {navItems.map((item) => {
          const isActive = route.id === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group
                ${isActive
                  ? 'bg-white/10 border border-white/10 shadow-inner text-white'
                  : 'hover:bg-white/5 text-white/40 hover:text-white'}
              `}
            >
              <Icon size={20} className={isActive ? "text-blue-400 shrink-0" : "shrink-0"} />
              <span className="font-medium truncate">{item.label}</span>
              {isActive && <div className="w-2 h-2 rounded-full bg-blue-400 ml-auto flex-shrink-0" />}
            </button>
          );
        })}
      </nav>

      {ephemeralPages.length > 0 && (
        <div
          ref={scrollRef}
          className="mt-4 pt-4 border-t border-white/10 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 -mr-2 pr-2"
        >
          {ephemeralPages.map((ephemeral, index) => {
            const isActive = route.id === ephemeral.state.id && JSON.stringify(route.params) === JSON.stringify(ephemeral.state.params);
            const Icon = getEphemeralIcon(ephemeral.state);
            return (
              <div
                key={`${ephemeral.state.id}-${JSON.stringify(ephemeral.state.params)}-${index}`}
                onClick={() => onNavigate(ephemeral.state.id, ephemeral.state.params)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 group shrink-0 cursor-pointer
                  ${isActive
                    ? 'bg-white/10 border border-white/10 shadow-inner text-white'
                    : 'hover:bg-white/5 text-white/40 hover:text-white'}
                `}
              >
                <Icon size={18} className={isActive ? "text-blue-400 shrink-0" : "shrink-0"} />
                <span className="font-medium text-sm truncate flex-1">{getEphemeralLabel(ephemeral.state)}</span>
                
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
                
                {settings.ephemeralAutoClose && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEphemeralPages(prev => {
                        const next = [...prev];
                        next[index] = { ...next[index], pinned: !next[index].pinned };
                        return next;
                      });
                    }}
                    className={`p-1 rounded-md transition-colors hover:bg-white/20 shrink-0 ml-1
                      ${ephemeral.pinned ? 'text-blue-400 opacity-100' : 'text-white/40 opacity-0 group-hover:opacity-100'}
                    `}
                    title={ephemeral.pinned ? "Unpin tab" : "Pin tab"}
                  >
                    <Pin size={14} className={ephemeral.pinned ? "fill-blue-400" : ""} />
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEphemeralPages(prev => prev.filter((_, i) => i !== index));
                    if (isActive) onNavigate('home');
                  }}
                  className={`p-1 rounded-md transition-colors hover:bg-red-500/20 hover:text-red-400 shrink-0 ${!settings.ephemeralAutoClose ? 'ml-1' : ''}
                    ${settings.ephemeralAutoClose ? 'opacity-0 group-hover:opacity-100 text-white/40' : 'opacity-100 text-white/40'}
                  `}
                  title="Close tab"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
