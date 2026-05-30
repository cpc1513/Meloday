import { useEffect, useState } from 'react';
import { deleteEntry, getRecentEntries, setEntryFavorite } from '../api/client';
import { usePlayer } from '../hooks/usePlayer';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import CoverImage from '../components/CoverImage';
import { getEmotionBg, getEmotionBorder, getEmotionText } from '../utils/emotion';
import type { Entry, Song } from '../types';

export default function HistoryPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const { setPlaylist, playAt } = usePlayer();
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    getRecentEntries()
      .then(data => setEntries(data))
      .catch(() => setEntries([]));
  }, []);

  const handlePlay = (songs: Song[], index = 0) => {
    setPlaylist(songs);
    playAt(index);
  };

  const handleFavorite = async (entry: Entry) => {
    const result = await setEntryFavorite(entry.id, !entry.is_favorite);
    setEntries(current => current.map(item => (
      item.id === entry.id ? { ...item, is_favorite: result.is_favorite } : item
    )));
  };

  const handleDelete = async (entry: Entry) => {
    const ok = window.confirm('删除后将移除这一天的日记和歌单，确定删除吗？');
    if (!ok) return;
    try {
      await deleteEntry(entry.id);
      setEntries(current => current.filter(item => item.id !== entry.id));
      setExpandedId(current => current === entry.id ? null : current);
      showSuccess('已删除这一天的日记和歌单');
    } catch {
      showError('删除失败，请稍后再试');
    }
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredEntries = normalizedQuery
    ? entries.filter(entry => {
        const haystack = [
          entry.date,
          entry.content,
          entry.emotions.join(' '),
          ...(entry.playlist?.songs.flatMap(song => [song.name, song.artist]) || [])
        ].join(' ').toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : entries;

  return (
    <div className="page page-narrow">
      <PageHeader title="历史" subtitle="回看你的音乐日记" />

      <div className="glass-panel" style={{ borderRadius: 16, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <SearchIcon />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜索日期、日记内容、情绪、歌曲或歌手"
          style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)' }}
        />
        {query && (
          <button className="ghost-button" onClick={() => setQuery('')} style={{ minHeight: 28, padding: '0 10px' }}>清除</button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="glass-panel" style={{ borderRadius: 18, textAlign: 'center', padding: '64px 24px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>♪</div>
          <div style={{ fontSize: 17, fontWeight: 760, marginBottom: 6, color: 'var(--text-primary)' }}>还没有日记</div>
          <div style={{ fontSize: 13 }}>写下第一篇日记，让 Meloday 为它配一张歌单。</div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="glass-panel" style={{ borderRadius: 18, textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)' }}>
          没有找到匹配的日记或歌曲
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredEntries.map(entry => {
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
                        {entry.date.replace(/-/g, ' / ')} {entry.is_favorite ? ' · 已收藏' : ''}
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
                            border: `1px solid ${getEmotionBorder(emotion)}`,
                          }}
                        >
                          {emotion}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {isExpanded && entry.playlist?.songs && entry.playlist.songs.length > 0 && (
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

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 760 }}>
                          当日歌单 · {entry.playlist.songs.length} 首
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePlay(entry.playlist!.songs); }}
                            className="primary-button"
                            style={{ minHeight: 34, borderRadius: 10, padding: '0 13px' }}
                          >
                            播放全部
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleFavorite(entry); }}
                            className="ghost-button"
                            style={{ minHeight: 34, borderRadius: 10, padding: '0 13px' }}
                          >
                            {entry.is_favorite ? '取消收藏' : '收藏这一天'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(entry); }}
                            className="ghost-button"
                            style={{ minHeight: 34, borderRadius: 10, padding: '0 13px', color: '#8A4038' }}
                          >
                            删除
                          </button>
                        </div>
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
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {song.artist || 'Unknown'}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
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

function SearchIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
}
