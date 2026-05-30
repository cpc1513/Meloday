import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import CoverImage from '../components/CoverImage';
import { getLyrics, setEntryFavorite } from '../api/client';
import { usePlayer } from '../hooks/usePlayer';
import { useToast } from '../components/Toast';
import type { LyricLine } from '../types';

export default function PlayerPage() {
  const {
    currentSong, playlist, currentIndex, currentTime, duration, progress, isPlaying,
    togglePlay, prev, next, playAt, volume, setVolume, updateFavoriteForEntry,
  } = usePlayer();
  const { showError, showSuccess } = useToast();
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [lyricsSongId, setLyricsSongId] = useState<number | null>(null);
  const [lyricsMessage, setLyricsMessage] = useState('');
  const [isFavoriteBusy, setIsFavoriteBusy] = useState(false);

  useEffect(() => {
    if (!currentSong?.id) return;
    let cancelled = false;
    getLyrics(currentSong.id)
      .then(data => {
        if (cancelled) return;
        setLyricsSongId(currentSong.id || null);
        setLyrics(data.lines || []);
        setLyricsMessage(data.lines?.length ? '' : data.message || '暂无可用歌词');
      })
      .catch(() => {
        if (!cancelled) {
          setLyrics([]);
          setLyricsMessage('歌词加载失败，先看看这首歌为什么被推荐给你。');
        }
      });
    return () => { cancelled = true; };
  }, [currentSong?.id]);

  const lyricsForCurrentSong = useMemo(
    () => (lyricsSongId === currentSong?.id ? lyrics : []),
    [currentSong?.id, lyrics, lyricsSongId]
  );
  const currentLyricsMessage = currentSong?.id
    ? (lyricsSongId === currentSong.id ? lyricsMessage : '正在加载歌词...')
    : '当前歌曲暂无在线歌词';

  const activeLyricIndex = useMemo(() => {
    if (!lyricsForCurrentSong.length) return -1;
    let active = 0;
    for (let i = 0; i < lyricsForCurrentSong.length; i++) {
      if (lyricsForCurrentSong[i].time <= currentTime) active = i;
      else break;
    }
    return active;
  }, [currentTime, lyricsForCurrentSong]);

  const entryId = currentSong?.entry_id;
  const isFavorite = Boolean(currentSong?.is_favorite);

  const handleFavorite = async () => {
    if (!entryId) {
      showError('当前歌曲还没有关联到日记');
      return;
    }
    setIsFavoriteBusy(true);
    try {
      const result = await setEntryFavorite(entryId, !isFavorite);
      updateFavoriteForEntry(entryId, result.is_favorite);
      showSuccess(result.is_favorite ? '已收藏这一天' : '已取消收藏');
    } catch {
      showError('收藏状态更新失败');
    } finally {
      setIsFavoriteBusy(false);
    }
  };

  if (!currentSong) {
    return (
      <div className="page page-narrow">
        <PageHeader title="播放器" subtitle="选择一首今日音乐后，这里会显示歌词和完整歌单。" />
        <div className="glass-panel" style={{ borderRadius: 18, padding: 54, textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>♪</div>
          <div style={{ fontSize: 16, fontWeight: 760, color: 'var(--text-primary)' }}>还没有正在播放的歌曲</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader title="播放器" subtitle={currentSong.entry_date ? `${currentSong.entry_date.replace(/-/g, ' / ')} 的今日歌单` : '今日音乐正在播放'} />

      <section className="player-page-grid">
        <div className="glass-panel" style={{ borderRadius: 18, padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <CoverImage song={currentSong} size={260} />
          <div>
            <div style={{ fontSize: 26, lineHeight: 1.18, fontWeight: 780, color: 'var(--text-primary)' }}>{currentSong.name}</div>
            <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: 15 }}>{currentSong.artist || 'Unknown Artist'}</div>
          </div>

          <div>
            <div style={{ height: 7, background: 'var(--bg-hover)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, var(--accent), var(--accent-blue))' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 650 }}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <ControlButton label="上一首" onClick={prev}><PrevIcon /></ControlButton>
            <button onClick={togglePlay} aria-label={isPlaying ? '暂停' : '播放'} style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--accent-dark)', color: '#fff', display: 'grid', placeItems: 'center' }}>
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <ControlButton label="下一首" onClick={next}><NextIcon /></ControlButton>
            <button disabled={isFavoriteBusy} onClick={handleFavorite} className="ghost-button" style={{ minHeight: 38 }}>
              <HeartIcon filled={isFavorite} />
              {isFavorite ? '已收藏' : '收藏这一天'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>音量</span>
            <input aria-label="音量" type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent)' }} />
            <span style={{ width: 36, textAlign: 'right', fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 700 }}>{Math.round(volume * 100)}%</span>
          </div>

          <div style={{ background: 'var(--bg-input)', borderRadius: 16, padding: 16, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7 }}>
            {currentSong.reason || '根据你的日记生成的今日音乐。'}
          </div>
        </div>

        <div className="glass-panel" style={{ borderRadius: 18, padding: 22, minHeight: 520 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <div style={{ color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 760 }}>LYRICS</div>
              <div style={{ fontSize: 20, fontWeight: 780, color: 'var(--text-primary)' }}>在线歌词</div>
            </div>
          </div>

          {lyricsForCurrentSong.length ? (
            <div style={{ maxHeight: 466, overflow: 'auto', paddingRight: 8 }}>
              {lyricsForCurrentSong.map((line, index) => {
                const active = index === activeLyricIndex;
                return (
                  <div
                    key={`${line.time}-${line.text}`}
                    style={{
                      padding: '9px 0',
                      fontSize: active ? 20 : 15,
                      lineHeight: 1.55,
                      fontWeight: active ? 780 : 600,
                      color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      transition: 'font-size 0.18s ease, color 0.18s ease',
                    }}
                  >
                    {line.text}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background: 'var(--bg-input)', borderRadius: 16, padding: 22, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <div style={{ fontWeight: 760, color: 'var(--text-primary)', marginBottom: 8 }}>{currentLyricsMessage}</div>
              <div>{currentSong.reason || '这首歌来自今天的情绪推荐。'}</div>
            </div>
          )}
        </div>

        <aside className="glass-panel" style={{ borderRadius: 18, padding: 18 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 760, marginBottom: 12 }}>
            当前歌单 · {playlist.length} 首
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {playlist.map((song, index) => (
              <button key={song.id} onClick={() => playAt(index)} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 9,
                borderRadius: 12,
                background: index === currentIndex ? 'var(--bg-hover)' : 'transparent',
                textAlign: 'left',
              }}>
                <div style={{ width: 22, textAlign: 'center', color: index === currentIndex ? 'var(--accent)' : 'var(--text-tertiary)', fontSize: 12, fontWeight: 760 }}>
                  {index === currentIndex && isPlaying ? '♪' : index + 1}
                </div>
                <CoverImage song={song} size={42} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 720, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.artist || 'Unknown'}</div>
                </div>
              </button>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}

function ControlButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return <button onClick={onClick} aria-label={label} title={label} className="icon-button" style={{ width: 42, height: 42 }}>{children}</button>;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" /></svg>;
}

function PrevIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 5v14l-9-7 9-7ZM5 5h2v14H5V5Z" /></svg>;
}

function NextIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 5v14l9-7-9-7Zm12 0h2v14h-2V5Z" /></svg>;
}

function PlayIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8L7 4Z" /></svg>;
}

function PauseIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7V5Zm6 0h4v14h-4V5Z" /></svg>;
}

function formatTime(seconds: number): string {
  if (!seconds) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
