import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEntry, setEntryFavorite } from '../api/client';
import CoverImage from './CoverImage';
import { getEmotionBg, getEmotionBorder, getEmotionText } from '../utils/emotion';
import { usePlayer } from '../hooks/usePlayer';
import type { Entry } from '../types';

interface Props {
  date: string;
}

export default function DayDetail({ date }: Props) {
  const navigate = useNavigate();
  const { setPlaylist, playAt } = usePlayer();
  const [state, setState] = useState<{ date: string; entry: Entry | null; error: boolean }>({
    date: '',
    entry: null,
    error: false,
  });
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    getEntry(date)
      .then(data => {
        if (!cancelled) setState({ date, entry: data, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ date, entry: null, error: true });
      });
    return () => { cancelled = true; };
  }, [date]);

  const toggleFavorite = async () => {
    if (!state.entry) return;
    setFavoriteBusy(true);
    try {
      const result = await setEntryFavorite(state.entry.id, !state.entry.is_favorite);
      setState(prev => prev.entry ? { ...prev, entry: { ...prev.entry, is_favorite: result.is_favorite } } : prev);
    } finally {
      setFavoriteBusy(false);
    }
  };

  const openSongInPlayer = (index: number) => {
    if (!state.entry?.playlist?.songs) return;
    setPlaylist(state.entry.playlist.songs);
    playAt(index);
    navigate('/player');
  };

  if (state.date !== date) {
    return (
      <aside className="glass-panel day-detail-panel day-detail-empty">
        <div className="day-detail-kicker">DAY DETAIL</div>
        <div className="day-detail-date">{date.replace(/-/g, ' / ')}</div>
        <p>加载中...</p>
      </aside>
    );
  }

  if (state.error || !state.entry || !state.entry.playlist) {
    return (
      <aside className="glass-panel day-detail-panel day-detail-empty">
        <div className="day-detail-kicker">DAY DETAIL</div>
        <div className="day-detail-date">{date.replace(/-/g, ' / ')}</div>
        <p>这一天还没有写日记。</p>
      </aside>
    );
  }

  return (
    <aside className="glass-panel day-detail-panel">
      <div className="day-detail-head">
        <div>
          <div className="day-detail-kicker">DAY DETAIL</div>
          <div className="day-detail-date">{date.replace(/-/g, ' / ')}</div>
        </div>
        <button disabled={favoriteBusy} onClick={toggleFavorite} className="ghost-button">
          {state.entry.is_favorite ? '已收藏' : '收藏'}
        </button>
      </div>

      <div className="day-detail-emotions">
        {state.entry.emotions.map(emotion => (
          <span
            key={emotion}
            style={{
              background: getEmotionBg(emotion),
              color: getEmotionText(emotion),
              borderColor: getEmotionBorder(emotion),
            }}
          >
            {emotion}
          </span>
        ))}
      </div>

      <div className="day-detail-diary">
        {state.entry.content}
      </div>

      <div className="day-detail-playlist-title">
        当日歌单 · {state.entry.playlist.songs.length} 首
      </div>
      <div className="day-detail-playlist">
        {state.entry.playlist.songs.map((song, index) => (
          <button key={song.id} className="day-detail-song" onClick={() => openSongInPlayer(index)}>
            <CoverImage song={song} size={58} />
            <div>
              <div className="day-detail-song-name">{song.name}</div>
              <div className="day-detail-song-artist">{song.artist || 'Unknown'}</div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
