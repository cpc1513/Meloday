import axios from 'axios';
import type { Entry, CalendarDay } from '../types';

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

export async function createEntry(date: string, content: string): Promise<Entry> {
  const res = await client.post('/entries', { date, content });
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

export async function getPlayUrl(neteaseId: number): Promise<{ url: string; expires_in: number }> {
  const res = await client.get(`/songs/${neteaseId}/play-url`);
  return res.data;
}

export default client;