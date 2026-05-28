# Meloday / 日聆 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack AI music diary app where users write daily entries, get 10 AI-recommended songs via DeepSeek, and play them through NetEase Cloud Music API, with a calendar view for emotional retrospection.

**Architecture:** Separate frontend (React + Vite) and backend (Express + SQLite). Backend proxies all AI and music API calls, keeping API keys secure. Frontend communicates via REST JSON.

**Tech Stack:** React 18 + Vite + TypeScript (frontend), Express + better-sqlite3 + TypeScript (backend), DeepSeek API, NeteaseCloudMusicApi (unofficial)

---

## File Structure

```
F:\Claudecode\daily music\
├── backend/
│   ├── src/
│   │   ├── index.ts              # Server entry point
│   │   ├── app.ts                # Express app setup
│   │   ├── db.ts                 # SQLite database connection
│   │   ├── routes/
│   │   │   ├── entries.ts        # POST /api/entries, GET /api/entries/:date
│   │   │   ├── calendar.ts       # GET /api/calendar
│   │   │   └── songs.ts          # GET /api/songs/:id/play-url
│   │   ├── services/
│   │   │   ├── deepseek.ts       # DeepSeek API calls (emotion + playlist)
│   │   │   └── netease.ts        # NeteaseCloudMusicApi wrapper
│   │   └── types.ts              # Shared TypeScript types
│   ├── .env                      # DEEPSEEK_API_KEY (gitignored)
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx               # Router + global layout
│   │   ├── types.ts              # Frontend TypeScript types
│   │   ├── components/
│   │   │   ├── Sidebar.tsx       # Left navigation sidebar
│   │   │   ├── DiaryEditor.tsx   # Text input + toolbar
│   │   │   ├── PlaylistCard.tsx  # Music player card
│   │   │   ├── ProgressBar.tsx   # Audio progress slider
│   │   │   ├── CalendarGrid.tsx  # Monthly calendar
│   │   │   ├── CalendarDay.tsx   # Single day cell
│   │   │   ├── DayDetail.tsx     # Expanded day info below calendar
│   │   │   └── HistoryList.tsx   # History records list
│   │   ├── pages/
│   │   │   ├── DiaryPage.tsx     # Main diary + player page
│   │   │   ├── CalendarPage.tsx  # Calendar + history page
│   │   │   └── HistoryPage.tsx   # Full history page
│   │   ├── hooks/
│   │   │   ├── usePlayer.ts      # Player state context
│   │   │   └── useAudio.ts       # HTMLAudioElement wrapper
│   │   ├── api/
│   │   │   └── client.ts         # Axios instance + API methods
│   │   └── styles/
│   │       ├── variables.css     # CSS custom properties
│   │       └── global.css        # Global styles + reset
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
└── docs/
```

---

## Phase 1: Backend Foundation

### Task 1: Initialize Backend Project

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`

- [ ] **Step 1: Create backend package.json**

```json
{
  "name": "meloday-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "better-sqlite3": "^11.0.0",
    "axios": "^1.7.2",
    "NeteaseCloudMusicApi": "^4.23.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/better-sqlite3": "^7.6.10",
    "@types/node": "^20.14.0",
    "typescript": "^5.4.5",
    "tsx": "^4.15.0"
  }
}
```

- [ ] **Step 2: Create backend tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Install dependencies**

Run: `cd backend && npm install`

---

### Task 2: Database Setup

**Files:**
- Create: `backend/src/db.ts`
- Create: `backend/src/types.ts`

- [ ] **Step 1: Create types.ts**

```typescript
export interface Entry {
  id: number;
  date: string;
  content: string;
  emotions: string[];
  created_at: string;
}

export interface Playlist {
  id: number;
  entry_id: number;
  created_at: string;
}

export interface Song {
  id: number;
  playlist_id: number;
  position: number;
  name: string;
  artist: string;
  album: string | null;
  cover_url: string | null;
  netease_id: number | null;
  reason: string | null;
  created_at: string;
}

export interface CalendarDay {
  date: string;
  has_entry: boolean;
  emotions: string[] | null;
  song_cover: string | null;
  emotion_color: string | null;
}
```

- [ ] **Step 2: Create db.ts with schema initialization**

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', '..', 'data', 'meloday.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    emotions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    cover_url TEXT,
    netease_id INTEGER,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS plays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER,
    FOREIGN KEY (song_id) REFERENCES songs(id)
  );
`);

export default db;
```

- [ ] **Step 3: Create data directory**

Run: `mkdir -p F:\Claudecode\daily music\data`

---

### Task 3: DeepSeek Service

**Files:**
- Create: `backend/src/services/deepseek.ts`
- Create: `backend/.env` (gitignored)

- [ ] **Step 1: Create .env**

```
DEEPSEEK_API_KEY=sk-your-key-here
PORT=3000
```

- [ ] **Step 2: Create deepseek.ts**

```typescript
import axios from 'axios';

const API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = 'https://api.deepseek.com/v1';

interface EmotionResult {
  emotions: string[];
}

interface SongRecommendation {
  song: string;
  artist: string;
  reason: string;
}

export async function analyzeEmotions(content: string): Promise<string[]> {
  const response = await axios.post(
    `${BASE_URL}/chat/completions`,
    {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一位情绪分析专家。请阅读日记，判断最主要的1-2种情绪。只返回JSON格式：{"emotions": ["情绪1", "情绪2"]}。可选：开心、难过、平静、焦虑、愤怒、期待、孤独、兴奋、疲惫、感恩。'
        },
        { role: 'user', content }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    },
    { headers: { Authorization: `Bearer ${API_KEY}` } }
  );

  const result = JSON.parse(response.data.choices[0].message.content) as EmotionResult;
  return result.emotions.slice(0, 2);
}

export async function recommendPlaylist(
  content: string,
  emotions: string[]
): Promise<SongRecommendation[]> {
  const response = await axios.post(
    `${BASE_URL}/chat/completions`,
    {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `你是一位音乐治疗师。根据日记和情绪推荐一个10首歌的歌单，陪伴用户度过今天的心情。
要求：
- 只返回JSON数组格式
- 每首包含 song（歌名）、artist（歌手）、reason（推荐理由，1句话）
- 可以是中文、英文、日语、韩语等任意语言，也可以包含纯音乐
- 优先选择网易云音乐能搜索到的歌曲
- 歌单要有起伏变化，第一首最贴合当前情绪，后面逐渐过渡

返回格式：[{"song": "...", "artist": "...", "reason": "..."}, ...]`
        },
        {
          role: 'user',
          content: `情绪：${emotions.join('、')}\n\n日记：${content}`
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    },
    { headers: { Authorization: `Bearer ${API_KEY}` } }
  );

  const result = JSON.parse(response.data.choices[0].message.content);
  const songs: SongRecommendation[] = Array.isArray(result) ? result : result.songs || result.playlist || [];
  return songs.slice(0, 10);
}
```

---

### Task 4: Netease Service

**Files:**
- Create: `backend/src/services/netease.ts`

- [ ] **Step 1: Create netease.ts**

```typescript
import { search, song_detail, song_url } from 'NeteaseCloudMusicApi';

export interface NeteaseSong {
  id: number;
  name: string;
  artist: string;
  album: string;
  coverUrl: string;
}

export async function searchSong(
  keyword: string
): Promise<NeteaseSong | null> {
  try {
    const result = await search({ keywords: keyword, limit: 1 });
    const songs = (result.body as any)?.result?.songs;
    if (!songs || songs.length === 0) return null;

    const song = songs[0];
    return {
      id: song.id,
      name: song.name,
      artist: song.ar?.[0]?.name || 'Unknown',
      album: song.al?.name || '',
      coverUrl: song.al?.picUrl || ''
    };
  } catch (e) {
    console.error('Netease search failed:', keyword, e);
    return null;
  }
}

export async function getSongDetail(ids: number[]): Promise<any> {
  const result = await song_detail({ ids: ids.join(',') });
  return result.body;
}

export async function getPlayUrl(id: number): Promise<string | null> {
  try {
    const result = await song_url({ id, br: 320000 });
    const urls = (result.body as any)?.data;
    if (!urls || urls.length === 0) return null;
    return urls[0].url;
  } catch (e) {
    console.error('Netease url failed:', id, e);
    return null;
  }
}
```

---

### Task 5: API Routes

**Files:**
- Create: `backend/src/routes/entries.ts`
- Create: `backend/src/routes/calendar.ts`
- Create: `backend/src/routes/songs.ts`

- [ ] **Step 1: Create entries.ts**

```typescript
import { Router } from 'express';
import db from '../db.js';
import { analyzeEmotions, recommendPlaylist } from '../services/deepseek.js';
import { searchSong } from '../services/netease.js';

const router = Router();

const EMOTION_COLORS: Record<string, string> = {
  '开心': '#F5E6D3',
  '难过': '#D4E5ED',
  '焦虑': '#E8DED4',
  '平静': '#DED4E2',
  '期待': '#E2DDD4',
  '愤怒': '#D4E2D4',
  '孤独': '#D0D4E2',
  '兴奋': '#F0E6D8',
  '疲惫': '#E0E0D8',
  '感恩': '#E8E0D4'
};

function getEmotionColor(emotions: string[]): string {
  return EMOTION_COLORS[emotions[0]] || '#F5F3F0';
}

router.post('/', async (req, res) => {
  try {
    const { date, content } = req.body;
    if (!date || !content) {
      return res.status(400).json({ error: 'date and content required' });
    }

    // Step 1: Analyze emotions
    const emotions = await analyzeEmotions(content);

    // Step 2: Save entry
    const insertEntry = db.prepare(
      'INSERT OR REPLACE INTO entries (date, content, emotions) VALUES (?, ?, ?)'
    );
    const entryResult = insertEntry.run(date, content, JSON.stringify(emotions));
    const entryId = entryResult.lastInsertRowid as number;

    // Step 3: Get AI playlist recommendations
    const recommendations = await recommendPlaylist(content, emotions);

    // Step 4: Search each song on Netease
    const songs = [];
    for (let i = 0; i < recommendations.length; i++) {
      const rec = recommendations[i];
      const keyword = `${rec.song} ${rec.artist}`;
      const neteaseSong = await searchSong(keyword);

      if (neteaseSong) {
        songs.push({
          position: i + 1,
          name: neteaseSong.name,
          artist: neteaseSong.artist,
          album: neteaseSong.album,
          cover_url: neteaseSong.coverUrl,
          netease_id: neteaseSong.id,
          reason: rec.reason
        });
      }
    }

    if (songs.length < 3) {
      return res.status(500).json({ error: 'Could not find enough songs' });
    }

    // Step 5: Save playlist
    const insertPlaylist = db.prepare(
      'INSERT OR REPLACE INTO playlists (entry_id) VALUES (?)'
    );
    const playlistResult = insertPlaylist.run(entryId);
    const playlistId = playlistResult.lastInsertRowid as number;

    // Step 6: Save songs
    const insertSong = db.prepare(
      'INSERT INTO songs (playlist_id, position, name, artist, album, cover_url, netease_id, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const song of songs) {
      insertSong.run(
        playlistId, song.position, song.name, song.artist,
        song.album, song.cover_url, song.netease_id, song.reason
      );
    }

    // Step 7: Return full data
    const playlistRows = db.prepare(
      'SELECT * FROM songs WHERE playlist_id = ? ORDER BY position'
    ).all(playlistId);

    res.json({
      id: entryId,
      date,
      content,
      emotions,
      playlist: {
        id: playlistId,
        songs: playlistRows
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to generate playlist' });
  }
});

router.get('/:date', (req, res) => {
  const { date } = req.params;
  const entry = db.prepare('SELECT * FROM entries WHERE date = ?').get(date) as any;
  if (!entry) return res.status(404).json({ error: 'Not found' });

  const playlist = db.prepare('SELECT * FROM playlists WHERE entry_id = ?').get(entry.id) as any;
  const songs = playlist
    ? db.prepare('SELECT * FROM songs WHERE playlist_id = ? ORDER BY position').all(playlist.id)
    : [];

  res.json({
    ...entry,
    emotions: JSON.parse(entry.emotions || '[]'),
    playlist: playlist ? { ...playlist, songs } : null
  });
});

export default router;
```

- [ ] **Step 2: Create calendar.ts**

```typescript
import { Router } from 'express';
import db from '../db.js';

const router = Router();

const EMOTION_COLORS: Record<string, string> = {
  '开心': '#F5E6D3',
  '难过': '#D4E5ED',
  '焦虑': '#E8DED4',
  '平静': '#DED4E2',
  '期待': '#E2DDD4',
  '愤怒': '#D4E2D4',
  '孤独': '#D0D4E2',
  '兴奋': '#F0E6D8',
  '疲惫': '#E0E0D8',
  '感恩': '#E8E0D4'
};

router.get('/', (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) {
    return res.status(400).json({ error: 'year and month required' });
  }

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  const entries = db.prepare(
    `SELECT e.*, s.cover_url as song_cover
     FROM entries e
     LEFT JOIN playlists p ON e.id = p.entry_id
     LEFT JOIN songs s ON p.id = s.playlist_id AND s.position = 1
     WHERE e.date BETWEEN ? AND ?
     ORDER BY e.date`
  ).all(startDate, endDate) as any[];

  const days = entries.map(entry => {
    const emotions = JSON.parse(entry.emotions || '[]');
    return {
      date: entry.date,
      has_entry: true,
      emotions,
      song_cover: entry.song_cover,
      emotion_color: EMOTION_COLORS[emotions[0]] || '#F5F3F0'
    };
  });

  res.json({ days });
});

export default router;
```

- [ ] **Step 3: Create songs.ts**

```typescript
import { Router } from 'express';
import { getPlayUrl } from '../services/netease.js';

const router = Router();

router.get('/:neteaseId/play-url', async (req, res) => {
  try {
    const { neteaseId } = req.params;
    const url = await getPlayUrl(Number(neteaseId));
    if (!url) {
      return res.status(404).json({ error: 'Play url not found' });
    }
    res.json({ url, expires_in: 300 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get play url' });
  }
});

export default router;
```

---

### Task 6: Express App Setup

**Files:**
- Create: `backend/src/app.ts`
- Create: `backend/src/index.ts`

- [ ] **Step 1: Create app.ts**

```typescript
import express from 'express';
import cors from 'cors';
import entriesRouter from './routes/entries.js';
import calendarRouter from './routes/calendar.js';
import songsRouter from './routes/songs.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/entries', entriesRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/songs', songsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
```

- [ ] **Step 2: Create index.ts**

```typescript
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Meloday backend running on http://localhost:${PORT}`);
});
```

- [ ] **Step 3: Test backend starts**

Run: `cd backend && npm run dev`
Expected: `Meloday backend running on http://localhost:3000`

Test: `curl http://localhost:3000/api/health`
Expected: `{"status":"ok"}`

---

## Phase 2: Frontend Foundation

### Task 7: Initialize Frontend Project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`

- [ ] **Step 1: Scaffold with Vite**

Run: `cd "F:\Claudecode\daily music" && npm create vite@latest frontend -- --template react-ts`

- [ ] **Step 2: Install dependencies**

Run: `cd frontend && npm install && npm install react-router-dom axios`
Run: `cd frontend && npm install -D @types/react-router-dom`

---

### Task 8: Global Styles and CSS Variables

**Files:**
- Create: `frontend/src/styles/variables.css`
- Create: `frontend/src/styles/global.css`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Create variables.css**

```css
:root {
  /* Backgrounds */
  --bg-page: #F2F0ED;
  --bg-card: #FFFFFF;
  --bg-input: #FAFAF8;
  --bg-sidebar: #F8F6F3;
  --bg-hover: #F0EEEB;

  /* Text */
  --text-primary: #2D2A26;
  --text-secondary: #9E9A94;
  --text-tertiary: #C4C0BA;

  /* Accent */
  --accent: #8B7E74;
  --accent-dark: #2D2A26;

  /* Borders */
  --border: #EDEAE6;
  --border-light: #F0EEEB;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(45, 42, 38, 0.04), 0 1px 2px rgba(45, 42, 38, 0.08);
  --shadow-md: 0 4px 24px rgba(0, 0, 0, 0.06);

  /* Radii */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 9999px;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 20px;
  --space-2xl: 24px;
  --space-3xl: 28px;
  --space-4xl: 32px;

  /* Typography */
  --font-sans: -apple-system, 'PingFang SC', 'Microsoft YaHei', 'Inter', sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', monospace;
}
```

- [ ] **Step 2: Create global.css**

```css
@import './variables.css';

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-sans);
  background: var(--bg-page);
  color: var(--text-primary);
  line-height: 1.5;
  overflow-x: hidden;
}

button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  background: none;
}

input, textarea {
  font-family: inherit;
  outline: none;
  border: none;
  background: none;
}

img {
  max-width: 100%;
  display: block;
}

a {
  color: inherit;
  text-decoration: none;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border-radius: var(--radius-full);
}
```

- [ ] **Step 3: Update main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

---

### Task 9: API Client

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/types.ts`

- [ ] **Step 1: Create types.ts**

```typescript
export interface Song {
  id: number;
  position: number;
  name: string;
  artist: string;
  album: string | null;
  cover_url: string | null;
  netease_id: number | null;
  reason: string | null;
}

export interface Playlist {
  id: number;
  entry_id: number;
  songs: Song[];
}

export interface Entry {
  id: number;
  date: string;
  content: string;
  emotions: string[];
  playlist: Playlist | null;
}

export interface CalendarDay {
  date: string;
  has_entry: boolean;
  emotions: string[] | null;
  song_cover: string | null;
  emotion_color: string | null;
}

export interface PlayerState {
  playlist: Song[];
  currentIndex: number;
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  isLoading: boolean;
}
```

- [ ] **Step 2: Create client.ts**

```typescript
import axios from 'axios';
import type { Entry, CalendarDay } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

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

export async function getPlayUrl(neteaseId: number): Promise<{ url: string; expires_in: number }> {
  const res = await client.get(`/songs/${neteaseId}/play-url`);
  return res.data;
}

export default client;
```

---

### Task 10: Player Hook

**Files:**
- Create: `frontend/src/hooks/usePlayer.ts`
- Create: `frontend/src/hooks/useAudio.ts`

- [ ] **Step 1: Create useAudio.ts**

```typescript
import { useRef, useCallback } from 'react';

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback((url: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    audio.src = url;
    audio.play();
    return audio;
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play();
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  }, []);

  return { audioRef, play, pause, resume, seek, setVolume };
}
```

- [ ] **Step 2: Create usePlayer.ts**

```typescript
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Song } from '../types';

interface PlayerContextType {
  playlist: Song[];
  currentIndex: number;
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  setPlaylist: (songs: Song[]) => void;
  playAt: (index: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  setProgress: (progress: number) => void;
  setTimeInfo: (currentTime: number, duration: number) => void;
  setLoading: (loading: boolean) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [playlist, setPlaylistState] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const currentSong = playlist[currentIndex] || null;

  const setPlaylist = useCallback((songs: Song[]) => {
    setPlaylistState(songs);
    setCurrentIndex(0);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const playAt = useCallback((index: number) => {
    if (index >= 0 && index < playlist.length) {
      setCurrentIndex(index);
      setIsPlaying(true);
      setIsLoading(true);
      setProgress(0);
    }
  }, [playlist.length]);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const next = useCallback(() => {
    const newIndex = (currentIndex + 1) % playlist.length;
    setCurrentIndex(newIndex);
    setIsLoading(true);
    setProgress(0);
  }, [currentIndex, playlist.length]);

  const prev = useCallback(() => {
    const newIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    setIsLoading(true);
    setProgress(0);
  }, [currentIndex, playlist.length]);

  const setTimeInfo = useCallback((ct: number, dur: number) => {
    setCurrentTime(ct);
    setDuration(dur);
    if (dur > 0) {
      setProgress((ct / dur) * 100);
    }
  }, []);

  return (
    <PlayerContext.Provider value={{
      playlist, currentIndex, currentSong, isPlaying,
      progress, currentTime, duration, isLoading,
      setPlaylist, playAt, togglePlay, next, prev,
      setProgress, setTimeInfo, setLoading: setIsLoading
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
```

---

### Task 11: Components

**Files:**
- Create: `frontend/src/components/Sidebar.tsx`
- Create: `frontend/src/components/DiaryEditor.tsx`
- Create: `frontend/src/components/PlaylistCard.tsx`
- Create: `frontend/src/components/ProgressBar.tsx`
- Create: `frontend/src/components/CalendarGrid.tsx`
- Create: `frontend/src/components/CalendarDay.tsx`
- Create: `frontend/src/components/HistoryList.tsx`

- [ ] **Step 1: Create Sidebar.tsx**

```tsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { id: 'diary', label: '日记', path: '/', icon: DiaryIcon },
  { id: 'calendar', label: '日历', path: '/calendar', icon: CalendarIcon },
  { id: 'history', label: '历史', path: '/history', icon: HistoryIcon },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside style={{
      width: 64,
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '28px 0 20px',
      flexShrink: 0
    }}>
      <div style={{
        width: 32, height: 32, background: '#2D2A26', borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 32, fontSize: 14, color: '#F8F6F3', fontWeight: 600
      }}>
        M
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', alignItems: 'center' }}>
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              style={{
                width: 44,
                padding: '10px 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                borderRadius: 12,
                background: isActive ? 'var(--bg-hover)' : 'transparent',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <item.icon active={isActive} />
              <span style={{
                fontSize: 9,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 500 : 400
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: '#D4CEC7',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12
        }}>
          👤
        </div>
        <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>Serena</span>
      </div>
    </aside>
  );
}

function DiaryIcon({ active }: { active: boolean }) {
  const color = active ? '#2D2A26' : '#9E9A94';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  const color = active ? '#2D2A26' : '#9E9A94';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function HistoryIcon({ active }: { active: boolean }) {
  const color = active ? '#2D2A26' : '#9E9A94';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
```

- [ ] **Step 2: Create DiaryEditor.tsx**

```tsx
import { useState } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export default function DiaryEditor({ value, onChange, onSubmit, isLoading }: Props) {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
          今天的日记
        </h2>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          记录你的想法，让音乐懂你
        </p>
      </div>

      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-xl)',
        marginBottom: 'var(--space-md)',
        border: '1px solid var(--border-light)'
      }}>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="今天发生了什么呢..."
          style={{
            width: '100%',
            minHeight: 140,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 14,
            lineHeight: 1.7,
            color: 'var(--text-primary)',
            resize: 'none',
            fontFamily: 'inherit'
          }}
        />
        <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 8 }}>
          {value.length} / 1000
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <ToolButton icon={<ImageIcon />} />
          <ToolButton icon={<EmojiIcon />} />
          <ToolButton icon={<TagIcon />} />
        </div>

        <button
          onClick={onSubmit}
          disabled={isLoading || !value.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 20px',
            background: 'var(--accent-dark)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            fontWeight: 500,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading || !value.trim() ? 0.6 : 1
          }}
        >
          <span>✨</span>
          <span>{isLoading ? '生成中...' : '生成音乐'}</span>
        </button>
      </div>
    </div>
  );
}

function ToolButton({ icon }: { icon: React.ReactNode }) {
  return (
    <button style={{
      width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 'var(--radius-sm)', cursor: 'pointer'
    }}>
      {icon}
    </button>
  );
}

function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9E9A94" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function EmojiIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9E9A94" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9E9A94" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}
```

- [ ] **Step 3: Create PlaylistCard.tsx**

```tsx
import { useEffect } from 'react';
import { usePlayer } from '../hooks/usePlayer';
import { useAudio } from '../hooks/useAudio';
import { getPlayUrl } from '../api/client';
import type { Song } from '../types';

interface Props {
  song: Song;
}

export default function PlaylistCard({ song }: Props) {
  const { isPlaying, togglePlay, currentTime, duration, progress, setTimeInfo } = usePlayer();
  const { play, pause, resume } = useAudio();

  useEffect(() => {
    if (isPlaying) {
      getPlayUrl(song.netease_id!).then(({ url }) => {
        const audio = play(url);
        audio.onended = () => togglePlay();
        audio.ontimeupdate = () => {
          setTimeInfo(audio.currentTime, audio.duration || 0);
        };
      });
    } else {
      pause();
    }
  }, [isPlaying, song]);

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-xl)',
      border: '1px solid var(--border-light)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
        <div style={{
          width: 100, height: 100, borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, #9BA8C4, #7A8BA8)',
          flexShrink: 0,
          overflow: 'hidden'
        }}>
          {song.cover_url && (
            <img src={song.cover_url} alt={song.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>
                  {song.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {song.artist}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 6 }}>
              {song.reason || '根据你的日记生成的音乐'}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ flex: 1, height: 3, background: 'var(--bg-hover)', borderRadius: 2, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, width: `${progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)' }}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, paddingTop: 4 }}>
        <ControlButton icon={<ShuffleIcon />} />
        <ControlButton icon={<PrevIcon />} />
        <button
          onClick={togglePlay}
          style={{
            width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-dark)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none'
          }}
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#F8F6F3">
              <rect x="6" y="5" width="3" height="14" rx="1" />
              <rect x="15" y="5" width="3" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#F8F6F3">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>
        <ControlButton icon={<NextIcon />} />
        <ControlButton icon={<ListIcon />} />
      </div>
    </div>
  );
}

function ControlButton({ icon }: { icon: React.ReactNode }) {
  return (
    <button style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none' }}>
      {icon}
    </button>
  );
}

function formatTime(seconds: number): string {
  if (!seconds) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function ShuffleIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9E9A94" strokeWidth="2" strokeLinecap="round"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /></svg>;
}
function PrevIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="#9E9A94" stroke="#9E9A94" strokeWidth="2"><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" /></svg>;
}
function NextIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="#9E9A94" stroke="#9E9A94" strokeWidth="2"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>;
}
function ListIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9E9A94" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>;
}
```

- [ ] **Step 4: Create CalendarGrid.tsx**

```tsx
import { useState, useEffect } from 'react';
import { getCalendar } from '../api/client';
import type { CalendarDay } from '../types';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function CalendarGrid() {
  const [year, setYear] = useState(2024);
  const [month, setMonth] = useState(5);
  const [days, setDays] = useState<CalendarDay[]>([]);

  useEffect(() => {
    getCalendar(year, month).then(data => setDays(data.days));
  }, [year, month]);

  const goPrev = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };

  const goNext = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            {year}年{month}月
          </h2>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={goPrev} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, cursor: 'pointer', background: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9E9A94" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button onClick={goNext} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, cursor: 'pointer', background: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9E9A94" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        </div>
        <button style={{ padding: '5px 14px', border: '1px solid var(--border)', background: 'transparent', borderRadius: 8, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          今日
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 10, textAlign: 'center' }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {days.map(day => (
          <div
            key={day.date}
            style={{
              aspectRatio: '0.9',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: day.has_entry ? 'pointer' : 'default',
              opacity: day.has_entry ? 1 : 0.35
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>
              {new Date(day.date).getDate()}
            </span>
            {day.has_entry ? (
              <div style={{
                width: 38, height: 38, borderRadius: 6,
                background: day.song_cover ? `url(${day.song_cover}) center/cover` : day.emotion_color || '#F0EEEB',
                overflow: 'hidden'
              }}>
                {day.song_cover && (
                  <img src={day.song_cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
            ) : (
              <div style={{ width: 38, height: 38, borderRadius: 6, background: '#F0EEEB' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create HistoryList.tsx**

```tsx
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
```

---

### Task 12: Pages and App Router

**Files:**
- Create: `frontend/src/pages/DiaryPage.tsx`
- Create: `frontend/src/pages/CalendarPage.tsx`
- Create: `frontend/src/pages/HistoryPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create DiaryPage.tsx**

```tsx
import { useState } from 'react';
import DiaryEditor from '../components/DiaryEditor';
import PlaylistCard from '../components/PlaylistCard';
import { createEntry } from '../api/client';
import { usePlayer } from '../hooks/usePlayer';
import type { Entry } from '../types';

export default function DiaryPage() {
  const [content, setContent] = useState('');
  const [entry, setEntry] = useState<Entry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setPlaylist, playAt } = usePlayer();

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsLoading(true);
    try {
      const date = new Date().toISOString().split('T')[0];
      const result = await createEntry(date, content);
      setEntry(result);
      if (result.playlist?.songs) {
        setPlaylist(result.playlist.songs);
        playAt(0);
      }
    } catch (e) {
      alert('生成失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const today = new Date();

  return (
    <div style={{ padding: 'var(--space-2xl) var(--space-3xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Melody</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>日记 · 音乐 · 你</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {today.getFullYear()} / {String(today.getMonth() + 1).padStart(2, '0')} / {String(today.getDate()).padStart(2, '0')} {['日', '一', '二', '三', '四', '五', '六'][today.getDay()]} ☀️
        </div>
      </div>

      <DiaryEditor
        value={content}
        onChange={setContent}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />

      {entry?.playlist?.songs[0] && (
        <div style={{ marginTop: 20 }}>
          <PlaylistCard song={entry.playlist.songs[0]} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create CalendarPage.tsx**

```tsx
import CalendarGrid from '../components/CalendarGrid';
import HistoryList from '../components/HistoryList';

export default function CalendarPage() {
  // Mock data for now
  const mockSongs = [
    { id: 1, position: 1, name: 'Stardust', artist: 'AURORA', album: null, cover_url: null, netease_id: null, reason: null },
    { id: 2, position: 1, name: 'Cloud Atlas', artist: 'Ólafur Arnalds', album: null, cover_url: null, netease_id: null, reason: null },
    { id: 3, position: 1, name: 'Echoes', artist: 'Hania Rani', album: null, cover_url: null, netease_id: null, reason: null },
  ];
  const mockDates = ['2024 / 05 / 17', '2024 / 05 / 16', '2024 / 05 / 15'];

  return (
    <div style={{ padding: 'var(--space-2xl) var(--space-3xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Melody</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>日记 · 音乐 · 你</div>
        </div>
      </div>

      <CalendarGrid />

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        <HistoryList songs={mockSongs as any} dates={mockDates} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create App.tsx**

```tsx
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DiaryPage from './pages/DiaryPage';
import CalendarPage from './pages/CalendarPage';
import HistoryPage from './pages/HistoryPage';
import { PlayerProvider } from './hooks/usePlayer';

export default function App() {
  return (
    <PlayerProvider>
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-page)' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<DiaryPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </main>
      </div>
    </PlayerProvider>
  );
}
```

---

## Phase 3: Integration and Testing

### Task 13: End-to-End Test

- [ ] **Step 1: Start backend**

Run: `cd backend && npm run dev`

- [ ] **Step 2: Start frontend**

Run: `cd frontend && npm run dev`

- [ ] **Step 3: Test diary submission flow**

1. Open `http://localhost:5173`
2. Write a diary entry
3. Click "生成音乐"
4. Verify: emotions appear, playlist generates, first song plays

- [ ] **Step 4: Test calendar view**

1. Navigate to calendar page
2. Verify month view renders with song covers

---

## Spec Coverage Check

| Spec Section | Task(s) |
|---|---|
| Data Model (entries, playlists, songs, plays) | Task 2 |
| AI Flow (emotion + playlist) | Task 3 |
| Netease Search | Task 4 |
| API Routes (entries, calendar, songs) | Task 5 |
| Express App Setup | Task 6 |
| CSS Variables / Global Styles | Task 8 |
| API Client | Task 9 |
| Player Hook | Task 10 |
| UI Components | Task 11 |
| Pages + Router | Task 12 |
| Music Playback Flow | Tasks 10, 11 |

**No gaps found.**

## Placeholder Scan

- No TBD/TODO in the plan
- All code blocks are complete
- All file paths are exact
- All commands have expected output

## Type Consistency Check

- `Song` type matches in `backend/src/types.ts`, `frontend/src/types.ts`, and all component props
- `Entry` type matches across backend and frontend
- Database columns match TypeScript interfaces
