import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
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
        <div className="glass-panel player-empty">
          <div className="player-empty-icon">♪</div>
          <div className="player-empty-title">还没有正在播放的歌曲</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="播放器"
        subtitle={currentSong.entry_date ? `${currentSong.entry_date.replace(/-/g, ' / ')} 的今日歌单` : '今日音乐正在播放'}
      />

      <section className="player-page-grid">
        <div className="glass-panel player-panel player-panel-main">
          <CoverImage song={currentSong} size={260} />
          <div>
            <div className="player-song-title">{currentSong.name}</div>
            <div className="player-song-artist">{currentSong.artist || 'Unknown Artist'}</div>
          </div>

          <div>
            <div className="player-progress-track">
              <div className="player-progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <div className="player-time-row">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="player-controls">
            <ControlButton label="上一首" onClick={prev}><PrevIcon /></ControlButton>
            <button onClick={togglePlay} aria-label={isPlaying ? '暂停' : '播放'} className="player-play-button">
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <ControlButton label="下一首" onClick={next}><NextIcon /></ControlButton>
            <button disabled={isFavoriteBusy} onClick={handleFavorite} className="ghost-button player-favorite-button">
              <HeartIcon filled={isFavorite} />
              {isFavorite ? '已收藏' : '收藏这一天'}
            </button>
          </div>

          <div className="player-volume-row">
            <span>音量</span>
            <input aria-label="音量" type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(Number(e.target.value))} />
            <span>{Math.round(volume * 100)}%</span>
          </div>

          <div className="player-reason">
            {currentSong.reason || '根据你的日记生成的今日音乐。'}
          </div>
        </div>

        <div className="glass-panel player-panel">
          <div className="player-panel-heading">
            <div>LYRICS</div>
            <h2>在线歌词</h2>
          </div>

          {lyricsForCurrentSong.length ? (
            <div className="player-scroll">
              {lyricsForCurrentSong.map((line, index) => {
                const active = index === activeLyricIndex;
                return (
                  <div
                    key={`${line.time}-${line.text}`}
                    className={active ? 'player-lyric-line active' : 'player-lyric-line'}
                  >
                    {line.text}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="player-scroll">
              <div className="player-lyric-fallback">
                <div>{currentLyricsMessage}</div>
                <p>{currentSong.reason || '这首歌来自今天的情绪推荐。'}</p>
              </div>
            </div>
          )}
        </div>

        <aside className="glass-panel player-panel">
          <div className="player-playlist-title">
            当前歌单 · {playlist.length} 首
          </div>
          <div className="player-scroll player-playlist-list">
            {playlist.map((song, index) => (
              <button key={song.id} onClick={() => playAt(index)} className={index === currentIndex ? 'player-playlist-song active' : 'player-playlist-song'}>
                <div className="player-playlist-index">
                  {index === currentIndex && isPlaying ? '♪' : index + 1}
                </div>
                <CoverImage song={song} size={42} />
                <div className="player-playlist-meta">
                  <div>{song.name}</div>
                  <span>{song.artist || 'Unknown'}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}

function ControlButton({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return <button onClick={onClick} aria-label={label} title={label} className="icon-button player-icon-button">{children}</button>;
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
