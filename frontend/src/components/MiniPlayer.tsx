import { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../hooks/usePlayer';
import { useAudio } from '../hooks/useAudio';
import { getPlayUrl } from '../api/client';
import { useToast } from './Toast';
import CoverImage from './CoverImage';

type PlaybackStage = 'idle' | 'fetching-url' | 'loading-audio' | 'playing' | 'waiting' | 'failed';

const MAX_CONSECUTIVE_FAILURES = 3;
const AUDIO_LOAD_TIMEOUT_MS = 15000;

export default function MiniPlayer() {
  const {
    currentSong, isPlaying, togglePlay, duration, progress, setTimeInfo,
    next, prev, playlist, currentIndex, playAt, volume, setVolume, setLoading,
  } = usePlayer();
  const { play, pause, seek, setVolume: setAudioVolume } = useAudio();
  const { showError } = useToast();
  const navigate = useNavigate();
  const progressRef = useRef<HTMLDivElement>(null);
  const consecutiveFailuresRef = useRef(0);
  const [expanded, setExpanded] = useState(false);
  const [playbackStage, setPlaybackStage] = useState<PlaybackStage>('idle');

  const isBusy = playbackStage === 'fetching-url' || playbackStage === 'loading-audio';
  const canPlayCurrentSong = Boolean(currentSong?.id);
  const currentSongName = currentSong?.name || '当前歌曲';

  useEffect(() => {
    setAudioVolume(volume);
  }, [setAudioVolume, volume]);

  useEffect(() => {
    if (!isPlaying) {
      pause();
      setLoading(false);
    }
  }, [isPlaying, pause, setLoading]);

  useEffect(() => {
    if (!currentSong || canPlayCurrentSong || !isPlaying) return;
    showError('这首歌暂时没有可用的 QQ 音乐播放资源，正在尝试下一首');
    if (playlist.length > 1) {
      window.setTimeout(() => next(), 800);
    } else {
      togglePlay();
    }
  }, [canPlayCurrentSong, currentSong, isPlaying, next, playlist.length, showError, togglePlay]);

  useEffect(() => {
    if (!currentSong?.id || !isPlaying) return;

    let cancelled = false;
    const songId = currentSong.id;

    const handleFailure = (err: unknown) => {
      if (cancelled) return;

      setPlaybackStage('failed');
      setLoading(false);
      console.error('[MiniPlayer] QQ playback error:', err);

      const error = err as { response?: { status?: number }; message?: string };
      const status = error.response?.status;
      const detail = status ? `HTTP ${status}` : error.message || String(err);
      const maxFailures = Math.min(MAX_CONSECUTIVE_FAILURES, Math.max(1, playlist.length));
      consecutiveFailuresRef.current += 1;

      if (playlist.length > 1 && consecutiveFailuresRef.current < maxFailures) {
        showError(`《${currentSongName}》无法播放 QQ 音频，正在尝试下一首`);
        window.setTimeout(() => {
          if (!cancelled) next();
        }, 900);
        return;
      }

      showError(`当前网络无法访问 QQ 音乐音频源，请检查网络、代理或防火墙。${detail}`);
      if (isPlaying) togglePlay();
    };

    const loadAndPlay = async () => {
      setPlaybackStage('fetching-url');
      setLoading(true);

      try {
        const { url } = await getPlayUrl(songId);
        if (cancelled) return;

        setPlaybackStage('loading-audio');
        const audio = await play(url, AUDIO_LOAD_TIMEOUT_MS);
        if (cancelled) return;

        consecutiveFailuresRef.current = 0;
        setPlaybackStage('playing');
        setLoading(false);
        setTimeInfo(audio.currentTime || 0, Number.isFinite(audio.duration) ? audio.duration : 0);

        const handleLoadedMetadata = () => {
          setTimeInfo(audio.currentTime || 0, Number.isFinite(audio.duration) ? audio.duration : 0);
        };
        const handleTimeUpdate = () => {
          setPlaybackStage('playing');
          setTimeInfo(audio.currentTime, Number.isFinite(audio.duration) ? audio.duration : 0);
        };
        const handlePlaying = () => {
          setPlaybackStage('playing');
          consecutiveFailuresRef.current = 0;
        };
        const handleWaiting = () => {
          setPlaybackStage('waiting');
        };
        const handleStalled = () => {
          setPlaybackStage('waiting');
        };
        const handleEnded = () => {
          next();
        };
        const handleError = () => {
          handleFailure(new Error('QQ 音乐音频播放中断'));
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('playing', handlePlaying);
        audio.addEventListener('waiting', handleWaiting);
        audio.addEventListener('stalled', handleStalled);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);

        cleanupAudioListeners = () => {
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audio.removeEventListener('timeupdate', handleTimeUpdate);
          audio.removeEventListener('playing', handlePlaying);
          audio.removeEventListener('waiting', handleWaiting);
          audio.removeEventListener('stalled', handleStalled);
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('error', handleError);
        };
      } catch (err: unknown) {
        handleFailure(err);
      }
    };

    let cleanupAudioListeners = () => {};

    loadAndPlay();

    return () => {
      cancelled = true;
      cleanupAudioListeners();
    };
  }, [
    currentSong?.id,
    currentSong?.music_source,
    currentSong?.source_id,
    currentSongName,
    isPlaying,
    next,
    play,
    playlist.length,
    setLoading,
    setTimeInfo,
    showError,
    togglePlay,
  ]);

  useEffect(() => {
    return () => {
      pause();
    };
  }, [pause]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = ratio * duration;
    seek(targetTime);
    setTimeInfo(targetTime, duration);
  }, [duration, seek, setTimeInfo]);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      setPlaybackStage('idle');
    }
    togglePlay();
  }, [isPlaying, togglePlay]);

  if (!currentSong) return null;

  return (
    <>
      <div className="glass-panel" style={{
        position: 'fixed',
        bottom: 18,
        left: 98,
        right: 24,
        zIndex: 100,
        borderRadius: 18,
        padding: '10px 14px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto 160px auto',
        alignItems: 'center',
        gap: 14,
      }}>
        <button
          onClick={() => navigate('/player')}
          title="打开播放器"
          style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, textAlign: 'left' }}
        >
          <CoverImage song={currentSong} size={42} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 760, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentSong.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {getPlaybackLabel(playbackStage, currentSong.artist || 'Unknown')}
            </div>
          </div>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prev} aria-label="上一首" className="icon-button" style={{ width: 32, height: 32 }}>
            <PrevIcon />
          </button>
          <button onClick={handleTogglePlay} disabled={isBusy} aria-label={isPlaying ? '暂停' : '播放'} style={{
            width: 38,
            height: 38,
            borderRadius: 13,
            background: isBusy ? 'var(--text-tertiary)' : 'var(--accent-dark)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            cursor: isBusy ? 'wait' : 'pointer',
          }}>
            {isBusy ? (
              <span style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            ) : isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button onClick={next} aria-label="下一首" className="icon-button" style={{ width: 32, height: 32 }}>
            <NextIcon />
          </button>
        </div>

        <div
          ref={progressRef}
          onClick={handleProgressClick}
          title={playbackStage === 'waiting' ? 'QQ 音乐音频缓冲中' : undefined}
          style={{ height: 5, background: 'var(--bg-hover)', borderRadius: 999, position: 'relative', cursor: 'pointer', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', left: 0, top: 0, width: `${progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 999 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setVolume(volume === 0 ? 0.8 : 0)} aria-label={volume === 0 ? '取消静音' : '静音'} className="icon-button" style={{ width: 32, height: 32 }}>
            <VolumeIcon muted={volume === 0} />
          </button>
          <input
            aria-label="音量"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            style={{ width: 82, accentColor: 'var(--accent)' }}
          />
          <button onClick={() => setExpanded(true)} aria-label="展开歌单" className="icon-button" style={{ width: 32, height: 32 }}>
            <ListIcon />
          </button>
        </div>
      </div>

      {expanded && (
        <div onClick={() => setExpanded(false)} style={{
          position: 'fixed',
          inset: 0,
          zIndex: 101,
          background: 'rgba(37,35,31,0.28)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} className="glass-panel" style={{
            borderRadius: '22px 22px 0 0',
            width: 'min(620px, 100%)',
            padding: '24px 22px 104px',
            maxHeight: '74vh',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 760, color: 'var(--text-primary)' }}>播放列表</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{playlist.length} 首今日音乐</div>
              </div>
              <button className="icon-button" onClick={() => setExpanded(false)} aria-label="关闭">×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {playlist.map((song, idx) => (
                <button key={song.id} onClick={() => playAt(idx)} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 10,
                  borderRadius: 14,
                  background: idx === currentIndex ? 'var(--bg-hover)' : 'transparent',
                  textAlign: 'left',
                }}>
                  <div style={{ fontSize: 12, color: idx === currentIndex ? 'var(--accent)' : 'var(--text-tertiary)', width: 22, textAlign: 'center', fontWeight: 760 }}>
                    {idx === currentIndex && isPlaying ? '♪' : idx + 1}
                  </div>
                  <CoverImage song={song} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: idx === currentIndex ? 760 : 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {song.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{song.artist || 'Unknown'}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function getPlaybackLabel(stage: PlaybackStage, fallbackArtist: string): string {
  switch (stage) {
    case 'fetching-url':
      return '正在获取 QQ 音乐播放链接...';
    case 'loading-audio':
      return '正在加载 QQ 音频...';
    case 'waiting':
      return 'QQ 音频缓冲中...';
    case 'failed':
      return 'QQ 音频加载失败';
    default:
      return fallbackArtist;
  }
}

function PrevIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M19 5v14l-9-7 9-7ZM5 5h2v14H5V5Z" /></svg>;
}

function NextIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M5 5v14l9-7-9-7Zm12 0h2v14h-2V5Z" /></svg>;
}

function PlayIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8L7 4Z" /></svg>;
}

function PauseIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7V5Zm6 0h4v14h-4V5Z" /></svg>;
}

function VolumeIcon({ muted }: { muted: boolean }) {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z" />{muted ? <path d="m19 9-4 6M15 9l4 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8 8 0 0 1 0 12" />}</svg>;
}

function ListIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></svg>;
}
