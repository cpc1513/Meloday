export interface Song {
  id: number;
  playlist_id?: number;
  position: number;
  name: string;
  artist: string;
  album: string | null;
  cover_url: string | null;
  netease_id: number | null;
  reason: string | null;
  entry_id?: number;
  entry_date?: string;
  is_favorite?: boolean | number;
}

export interface Playlist {
  id: number;
  entry_id: number;
  songs: Song[];
}

export interface Entry {
  id: number;
  date: string;
  content: string;
  emotions: string[];
  is_favorite: boolean;
  playlist: Playlist | null;
}

export interface CalendarDay {
  date: string;
  has_entry: boolean;
  emotions: string[] | null;
  song_cover: string | null;
  emotion_color: string | null;
  emotion_keyword: string | null;
  holiday: string | null;
  is_favorite: boolean;
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface SettingsStatus {
  status: 'ok';
  deepseek_configured: boolean;
  database_path: string;
  version: string;
}
