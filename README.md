# Meloday

Meloday（日聆）是一个根据日记推荐歌单的音乐日记应用。用户写下当天的心情，后端通过 DeepSeek 分析情绪并生成歌单候选，再接入网易云音乐搜索、取封面和播放链接；前端提供日记、日历、历史记录和迷你播放器体验。

## Project Structure

```text
.
├── backend/          # Express + SQLite API
├── frontend/         # React + Vite + Electron app
├── data/             # Local runtime database, ignored by git
├── docs/             # Product design and implementation notes
├── release/          # Local package output, ignored by git
└── release-final/    # Local package output, ignored by git
```

## Requirements

- Node.js 20+
- npm
- A DeepSeek API key

## Backend

```bash
cd backend
npm install
copy .env.example .env
npm run build
npm run dev
```

Configure `backend/.env`:

```env
DEEPSEEK_API_KEY=your_api_key
PORT=3000
DATABASE_PATH=
```

If `DATABASE_PATH` is empty, the backend creates `data/meloday.db` relative to the project.

## Frontend

```bash
cd frontend
npm install
npm run dev
npm run lint
npm run build
```

For Electron development:

```bash
cd backend
npm run build

cd ../frontend
npm run electron:dev
```

For a Windows portable build:

```bash
cd backend
npm run build

cd ../frontend
npm run dist
```

Build output is written to `release/` and is intentionally ignored by git. Use GitHub Releases for distributing packaged apps.

## API Overview

- `GET /api/health`
- `POST /api/entries`
- `GET /api/entries/recent`
- `GET /api/entries/:date`
- `GET /api/calendar?year=2026&month=5`
- `GET /api/songs/:neteaseId/play-url`

## Repository Policy

This repository stores source code, lockfiles, documentation, and static assets. It does not store:

- `node_modules/`
- frontend or backend `dist/`
- Electron package output
- `.env` files
- local SQLite databases

The initial GitHub remote is expected to be:

```bash
git remote add origin https://github.com/cpc1513/Meloday.git
```
