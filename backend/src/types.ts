export interface Entry {
  id: number;
  date: string;
  content: string;
  emotions: string[];
  is_favorite: number;
  created_at: string;
}

export interface Playlist {
  id: number;
  entry_id: number;
  created_at: string;
}

export interface Song {
  id: number;
  playlist_id: number;
  position: number;
  name: string;
  artist: string;
  album: string | null;
  cover_url: string | null;
  netease_id: number | null;
  music_source: string | null;
  source_id: string | null;
  media_id: string | null;
  reason: string | null;
  entry_id?: number;
  entry_date?: string;
  is_favorite?: number;
  created_at: string;
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
