import { useRef, useCallback } from 'react';
import { usePlayer } from '../hooks/usePlayer';
import { useAudio } from '../hooks/useAudio';
import CoverImage from './CoverImage';
import type { Song } from '../types';

interface Props {
  songs: Song[];
}

export default function PlaylistCard({ songs }: Props) {
  const {
    isPlaying, togglePlay, currentTime, duration, progress, setTimeInfo,
    currentSong, currentIndex, next, prev, playAt,
  } = usePlayer();
  const { seek } = useAudio();
  const progressRef = useRef<HTMLDivElement>(null);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = ratio * duration;
    seek(targetTime);
    setTimeInfo(targetTime, duration);
  }, [duration, seek, setTimeInfo]);

  if (!currentSong) return null;

  return (
    <section className="glass-panel playlist-card" style={{
      borderRadius: 18,
      padding: 22,
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) 340px',
      gap: 22,
      alignItems: 'stretch',
    }}>
      <div style={{ display: 'flex', gap: 18, minWidth: 0 }}>
        <CoverImage song={currentSong} size={132} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 760, marginBottom: 7 }}>
              NOW PLAYING
            </div>
            <div style={{
              fontSize: 24,
              lineHeight: 1.2,
              fontWeight: 760,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {currentSong.name}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 5 }}>
              {currentSong.artist || 'Unknown Artist'}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 14, lineHeight: 1.7 }}>
              {currentSong.reason || '根据你的日记生成的今日音乐。'}
            </p>
          </div>

          <div>
            <div
              ref={progressRef}
              onClick={handleProgressClick}
              style={{
                height: 6,
                background: 'var(--bg-hover)',
                borderRadius: 999,
                position: 'relative',
                cursor: 'pointer',
                overflow: 'hidden',
                marginBottom: 8,
              }}
            >
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent), var(--accent-blue))',
                borderRadius: 999,
                transition: 'width 0.1s linear',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 650 }}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
              <ControlButton onClick={prev} icon={<PrevIcon />} label="上一首" />
              <button
                onClick={togglePlay}
                aria-label={isPlaying ? '暂停' : '播放'}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: 'var(--accent-dark)',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 16px 30px rgba(37,35,31,0.18)',
                }}
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
              <ControlButton onClick={next} icon={<NextIcon />} label="下一首" />
            </div>
          </div>
        </div>
      </div>

      <div style={{
        borderLeft: '1px solid var(--border-light)',
        paddingLeft: 22,
        minWidth: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 760 }}>
            今日歌单
          </div>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 650 }}>{songs.length} 首</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {songs.map((song, idx) => {
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={song.id}
                onClick={() => playAt(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 8,
                  borderRadius: 12,
                  background: isCurrent ? 'var(--bg-hover)' : 'transparent',
                  textAlign: 'left',
                  transition: 'background 0.16s ease',
                }}
              >
                <div style={{ width: 22, color: isCurrent ? 'var(--accent)' : 'var(--text-tertiary)', fontSize: 12, fontWeight: 760, textAlign: 'center' }}>
                  {isCurrent && isPlaying ? '♪' : idx + 1}
                </div>
                <CoverImage song={song} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: isCurrent ? 760 : 650,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {song.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {song.artist || 'Unknown'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ControlButton({ icon, onClick, label }: { icon: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="icon-button">
      {icon}
    </button>
  );
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
