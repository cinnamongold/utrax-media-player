export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  year?: number;
  coverUrl: string | null;
  coverBlob?: Blob | null; // For IndexedDB persistence
  file?: File; // Optional because it might not be loaded into memory yet
  fileHandle?: any; // FileSystemFileHandle reference for persistent storage
  duration?: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string | null;
  tracks: Track[]; // We keep tracks here, but in the DB we will store trackIds
}

export interface AppSettings {
  highRes: boolean;
  historyLimit: number;
  groupByAlbum: boolean;
  ephemeralAutoClose: boolean;
  ephemeralLimit: number;
  skipDeleteWarning: boolean;
}

export type PageId = 'home' | 'library' | 'recents' | 'settings' | 'album' | 'artist' | 'playlist' | 'create-playlist' | 'import' | 'download' | 'queue' | 'lyrics';

export interface PageState {
  id: PageId;
  params?: any;
}

