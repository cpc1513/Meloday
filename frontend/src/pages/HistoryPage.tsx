import { useState, useEffect } from 'react';
import { getRecentEntries } from '../api/client';
import { usePlayer } from '../hooks/usePlayer';
import PageHeader from '../components/PageHeader';
import CoverImage from '../components/CoverImage';
import { getEmotionBg, getEmotionText } from '../utils/emotion';
import type { Entry, Song } from '../types';

export default function HistoryPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { setPlaylist, playAt } = usePlayer();

  useEffect(() => {
    getRecentEntries()
      .then(data => setEntries(data))
      .catch(() => setEntries([]));
  }, []);

  const handlePlay = (songs: Song[], index = 0) => {
    setPlaylist(songs);
    playAt(index);
  };

  return (
    <div className="page page-narrow">
      <PageHeader title="历史" subtitle="回看你的音乐日记" />

      {entries.length === 0 ? (
        <div className="glass-panel" style={{ borderRadius: 18, textAlign: 'center', padding: '64px 24px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>♪</div>
          <div style={{ fontSize: 17, fontWeight: 760, marginBottom: 6, color: 'var(--text-primary)' }}>还没有日记</div>
          <div style={{ fontSize: 13 }}>写下第一篇日记，让 Meloday 为它配一首歌。</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entries.map(entry => {
            const firstSong = entry.playlist?.songs[0];
            const diaryPreview = entry.content.length > 92
              ? `${entry.content.slice(0, 92)}...`
              : entry.content;
            const isExpanded = expandedId === entry.id;

            return (
              <article
                key={entry.id}
                className="glass-panel"
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: isExpanded ? 16 : 0,
                  padding: 18,
                  borderRadius: 18,
                  cursor: 'pointer',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <CoverImage song={firstSong} size={68} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 760 }}>
                        {entry.date.replace(/-/g, ' / ')}
                      </div>
                      <div style={{ color: 'var(--text-tertiary)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease' }}>
                        <ChevronDown />
                      </div>
                    </div>

                    <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)', marginBottom: 12 }}>
                      {diaryPreview}
                    </div>

                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                      {entry.emotions.map(emotion => (
                        <span
                          key={emotion}
                          style={{
                            padding: '4px 10px',
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
                </div>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16, animation: 'fadeIn 0.2s ease' }}>
                    <div style={{
                      background: 'var(--bg-input)',
                      borderRadius: 16,
                      padding: 18,
                      marginBottom: 14,
                      fontSize: 15,
                      lineHeight: 1.8,
                      color: 'var(--text-primary)',
                    }}>
                      {entry.content}
                    </div>

                    {entry.playlist?.songs && entry.playlist.songs.length > 0 && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 760 }}>
                            当日歌单 · {entry.playlist.songs.length} 首
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePlay(entry.playlist!.songs); }}
                            className="primary-button"
                            style={{ minHeight: 34, borderRadius: 10, padding: '0 13px' }}
                          >
                            播放全部
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {entry.playlist.songs.map((song, idx) => (
                            <button
                              key={song.id}
                              onClick={(e) => { e.stopPropagation(); handlePlay(entry.playlist!.songs, idx); }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: 9,
                                borderRadius: 12,
                                background: 'rgba(255,255,255,0.5)',
                                textAlign: 'left',
                              }}
                            >
                              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', width: 22, textAlign: 'center', fontWeight: 760 }}>
                                {idx + 1}
                              </div>
                              <CoverImage song={song} size={40} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {song.name}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                  {song.artist || 'Unknown'}
                                </div>
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {song.reason}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChevronDown() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>;
}
