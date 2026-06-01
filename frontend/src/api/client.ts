import axios from 'axios';
import type { Entry, CalendarDay, LyricLine, SettingsStatus } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

client.interceptors.response.use(
  res => res,
  err => {
    if (err.code === 'ECONNABORTED') {
      return Promise.reject(new Error('请求超时，请稍后重试'));
    }
    if (!err.response) {
      return Promise.reject(new Error('网络错误，请检查连接'));
    }
    return Promise.reject(err);
  }
);

export async function createEntry(date: string, content: string, overwrite = false): Promise<Entry> {
  const res = await client.post('/entries', { date, content, overwrite });
  return res.data;
}

export async function deleteEntry(entryId: number): Promise<{ ok: boolean; id: number }> {
  const res = await client.delete(`/entries/${entryId}`);
  return res.data;
}

export async function getEntry(date: string): Promise<Entry> {
  const res = await client.get(`/entries/${date}`);
  return res.data;
}

export async function getCalendar(year: number, month: number): Promise<{ days: CalendarDay[] }> {
  const res = await client.get('/calendar', { params: { year, month } });
  return res.data;
}

export async function getRecentEntries(): Promise<Entry[]> {
  const res = await client.get('/entries/recent');
  return res.data;
}

export async function getPlayUrl(songId: number): Promise<{ url: string; expires_in: number; source?: string }> {
  const res = await client.get(`/songs/${songId}/play-url`);
  return res.data;
}

export async function getLyrics(songId: number): Promise<{ lines: LyricLine[]; raw: string; message?: string | null }> {
  const res = await client.get(`/songs/${songId}/lyrics`);
  return res.data;
}

export async function setEntryFavorite(entryId: number, isFavorite: boolean): Promise<{ id: number; is_favorite: boolean }> {
  const res = await client.put(`/entries/${entryId}/favorite`, { is_favorite: isFavorite });
  return res.data;
}

export async function getSettingsStatus(): Promise<SettingsStatus> {
  const res = await client.get('/settings/status');
  return res.data;
}

export async function setApiKey(apikey: string): Promise<{ ok: boolean }> {
  const res = await client.post('/settings/apikey', { apikey });
  return res.data;
}

export async function deleteApiKey(): Promise<{ ok: boolean }> {
  const res = await client.delete('/settings/apikey');
  return res.data;
}

export async function clearRuntimeCache(): Promise<{ ok: boolean }> {
  const res = await client.delete('/settings/cache');
  return res.data;
}

export default client;
