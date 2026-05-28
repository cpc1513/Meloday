import type { Song } from '../types';

interface Props {
  songs: Song[];
  dates: string[];
}

export default function HistoryList({ songs, dates }: Props) {
  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>历史记录</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {songs.map((song, i) => (
          <div key={song.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', background: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)'
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 6,
              background: song.cover_url ? `url(${song.cover_url}) center/cover` : '#E8E4DF',
              flexShrink: 0
            }}>
              {song.cover_url && <img src={song.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{song.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{song.artist}</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{dates[i]}</div>
            <button style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#9E9A94"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            </button>
            <button style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4C0BA" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
