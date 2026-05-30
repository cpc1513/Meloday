import { useState, useEffect, useCallback } from 'react';
import DiaryEditor from '../components/DiaryEditor';
import PlaylistCard from '../components/PlaylistCard';
import PageHeader from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { createEntry } from '../api/client';
import { usePlayer } from '../hooks/usePlayer';
import type { Entry } from '../types';

const DRAFT_KEY = 'meloday_draft';

export default function DiaryPage() {
  const [content, setContent] = useState(() => localStorage.getItem(DRAFT_KEY) || '');
  const [entry, setEntry] = useState<Entry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setPlaylist, playAt } = usePlayer();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (!content.trim()) {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, content);
    }, 1200);
    return () => clearTimeout(timer);
  }, [content]);

  const handleSubmit = useCallback(async () => {
    if (!content.trim()) return;
    setIsLoading(true);
    try {
      const date = new Date().toISOString().split('T')[0];
      const result = await createEntry(date, content);
      setEntry(result);
      localStorage.removeItem(DRAFT_KEY);
      showSuccess('已为你生成今日歌单');
      if (result.playlist?.songs) {
        setPlaylist(result.playlist.songs);
        playAt(0);
      }
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string; error?: string } }; message?: string };
      const msg = error.response?.data?.message || error.message || '生成失败，请稍后再试';
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [content, setPlaylist, playAt, showSuccess, showError]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && content.trim() && !isLoading) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, isLoading, handleSubmit]);

  return (
    <div className="page">
      <PageHeader showDate />

      <DiaryEditor
        value={content}
        onChange={setContent}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />

      {entry?.playlist?.songs && entry.playlist.songs.length > 0 && (
        <div style={{ marginTop: 22, animation: 'fadeIn 0.24s ease' }}>
          <PlaylistCard songs={entry.playlist.songs} />
        </div>
      )}
    </div>
  );
}
