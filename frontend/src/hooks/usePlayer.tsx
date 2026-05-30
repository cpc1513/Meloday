import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Song } from '../types';

interface PlayerContextType {
  playlist: Song[];
  currentIndex: number;
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  volume: number;
  setPlaylist: (songs: Song[]) => void;
  playAt: (index: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  setProgress: (progress: number) => void;
  setTimeInfo: (currentTime: number, duration: number) => void;
  setLoading: (loading: boolean) => void;
  setVolume: (volume: number) => void;
  updateFavoriteForEntry: (entryId: number, isFavorite: boolean) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [playlist, setPlaylistState] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolumeState] = useState(() => {
    const saved = Number(localStorage.getItem('meloday_volume'));
    return Number.isFinite(saved) ? Math.min(1, Math.max(0, saved)) : 0.8;
  });

  const currentSong = playlist[currentIndex] || null;

  const setPlaylist = useCallback((songs: Song[]) => {
    setPlaylistState(songs);
    setCurrentIndex(0);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const playAt = useCallback((index: number) => {
    if (index >= 0) {
      setCurrentIndex(index);
      setIsPlaying(true);
      setIsLoading(true);
      setProgress(0);
    }
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const next = useCallback(() => {
    if (playlist.length === 0) return;
    const newIndex = (currentIndex + 1) % playlist.length;
    setCurrentIndex(newIndex);
    setIsLoading(true);
    setProgress(0);
  }, [currentIndex, playlist.length]);

  const prev = useCallback(() => {
    if (playlist.length === 0) return;
    const newIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    setIsLoading(true);
    setProgress(0);
  }, [currentIndex, playlist.length]);

  const setTimeInfo = useCallback((ct: number, dur: number) => {
    setCurrentTime(ct);
    setDuration(dur);
    if (dur > 0) {
      setProgress((ct / dur) * 100);
    }
  }, []);

  const setVolume = useCallback((nextVolume: number) => {
    const normalized = Math.min(1, Math.max(0, nextVolume));
    setVolumeState(normalized);
    localStorage.setItem('meloday_volume', String(normalized));
  }, []);

  const updateFavoriteForEntry = useCallback((entryId: number, isFavorite: boolean) => {
    setPlaylistState(songs => songs.map(song => (
      song.entry_id === entryId ? { ...song, is_favorite: isFavorite } : song
    )));
  }, []);

  return (
    <PlayerContext.Provider value={{
      playlist, currentIndex, currentSong, isPlaying,
      progress, currentTime, duration, isLoading, volume,
      setPlaylist, playAt, togglePlay, next, prev,
      setProgress, setTimeInfo, setLoading: setIsLoading, setVolume, updateFavoriteForEntry
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
