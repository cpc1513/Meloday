export interface Song {
  id: number;
  position: number;
  name: string;
  artist: string;
  album: string | null;
  cover_url: string | null;
  netease_id: number | null;
  reason: string | null;
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
  playlist: Playlist | null;
}

export interface CalendarDay {
  date: string;
  has_entry: boolean;
  emotions: string[] | null;
  song_cover: string | null;
  emotion_color: string | null;
}