import { useState, useEffect } from 'react';
import { getEntry, setEntryFavorite } from '../api/client';
import CoverImage from './CoverImage';
import { getEmotionBg, getEmotionText } from '../utils/emotion';
import type { Entry } from '../types';

interface Props {
  date: string;
}

export default function DayDetail({ date }: Props) {
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

  if (state.date !== date) {
    return (
      <div className="glass-panel" style={{ marginTop: 18, borderRadius: 18, padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 650 }}>
        加载中...
      </div>
    );
  }

  if (state.error || !state.entry || !state.entry.playlist) {
    return (
      <div className="glass-panel" style={{ marginTop: 18, borderRadius: 18, padding: 28, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 650 }}>
        这一天还没有写日记
      </div>
    );
  }

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

  return (
    <section className="glass-panel" style={{ marginTop: 18, borderRadius: 18, padding: 22, animation: 'fadeIn 0.22s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, marginBottom: 16 }}>
        <div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 760, marginBottom: 5 }}>DAY DETAIL</div>
          <div style={{ fontSize: 20, fontWeight: 760, color: 'var(--text-primary)' }}>
            {date.replace(/-/g, ' / ')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button disabled={favoriteBusy} onClick={toggleFavorite} className="ghost-button" style={{ minHeight: 30, padding: '0 10px' }}>
            {state.entry.is_favorite ? '已收藏' : '收藏'}
          </button>
            {state.entry.emotions.map(emotion => (
            <span
              key={emotion}
              style={{
                padding: '5px 11px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                background: getEmotionBg(emotion),
                color: getEmotionText(emotion),
              }}
            >
              {emotion}
            </span>
          ))}
        </div>
      </div>

      <div style={{
        background: 'var(--bg-input)',
        borderRadius: 16,
        padding: 18,
        marginBottom: 18,
        fontSize: 15,
        lineHeight: 1.8,
        color: 'var(--text-primary)',
      }}>
        {state.entry.content}
      </div>

      <div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, fontWeight: 760 }}>
          当日歌单
        </div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {state.entry.playlist.songs.map(song => (
            <div key={song.id} style={{ flexShrink: 0, width: 124 }}>
              <CoverImage song={song} size={124} />
              <div style={{ marginTop: 9, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {song.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {song.artist || 'Unknown'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
