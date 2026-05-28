export interface Entry {
  id: number;
  date: string;
  content: string;
  emotions: string[];
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
  reason: string | null;
  created_at: string;
}

export interface CalendarDay {
  date: string;
  has_entry: boolean;
  emotions: string[] | null;
  song_cover: string | null;
  emotion_color: string | null;
}
