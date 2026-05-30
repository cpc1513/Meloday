# Meloday / 日聆

Meloday is a quiet AI music diary for Windows. Write down what happened today, and it turns your words into a small daily playlist with mood tags, lyrics, calendar memories, and a lightweight player.

日聆不是一个普通播放器，而是一座把日记、情绪和音乐放在一起的小房间：你写下今天，它替你挑几首歌陪你走完这一刻。

## Download

Windows users can download the latest portable build from GitHub Releases:

[Download Meloday Portable](https://github.com/cpc1513/Meloday/releases/latest)

No installation is required. Download `Meloday-Portable-*.exe` and run it directly.

> Windows may show an "Unknown publisher" or SmartScreen warning because the app is not code-signed yet.

## Highlights

- AI diary-to-playlist flow powered by DeepSeek.
- QQ Music source for search, covers, playback URLs, and online lyrics.
- Daily mood tags and a calendar view with holiday hints.
- Dedicated player page with cover art, lyrics, playlist, volume control, and favorites.
- Favorite an entire day: diary, emotions, and playlist stay together.
- History search across date, diary content, emotions, songs, and artists.
- Local-first storage with SQLite. Your diary database lives on your machine.
- Windows portable packaging through Electron.

## How It Works

```text
Diary text
  -> DeepSeek emotion analysis
  -> DeepSeek playlist recommendation
  -> QQ Music search / cover / play URL / lyrics
  -> SQLite daily entry + playlist
  -> React + Electron desktop experience
```

Meloday currently uses QQ Music in a no-cookie mode. Some songs may be unavailable because of copyright or login limits; the backend skips unplayable candidates where possible.

## Screens

- Diary: write today's thoughts and generate music without blocking the page.
- Player: view cover art, lyrics, the current playlist, volume, and favorite state.
- Calendar: revisit daily moods, covers, and holiday hints.
- History: search old diary entries and playlists.
- Settings: check backend status, DeepSeek configuration, music source, export data, open data directory, and clear runtime cache.

## Tech Stack

| Area | Stack |
|---|---|
| Desktop | Electron |
| Frontend | React + Vite + TypeScript |
| Backend | Express + TypeScript |
| Database | SQLite |
| AI | DeepSeek API |
| Music source | QQ Music unofficial API logic |
| Packaging | electron-builder portable Windows target |

## Local Development

Requirements:

- Node.js 20+
- npm
- DeepSeek API key

Install dependencies:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Create backend environment file:

```bash
cd backend
copy .env.example .env
```

Configure `backend/.env`:

```env
DEEPSEEK_API_KEY=your_api_key
PORT=3000
DATABASE_PATH=
```

If `DATABASE_PATH` is empty, the backend creates `data/meloday.db` relative to the project.

Run backend:

```bash
cd backend
npm run dev
```

Run frontend:

```bash
cd frontend
npm run dev
```

Run Electron development mode:

```bash
cd backend
npm run build

cd ../frontend
npm run electron:dev
```

## Build

Build backend:

```bash
cd backend
npm run build
```

Build frontend:

```bash
cd frontend
npm run build
npm run lint
```

Create a Windows portable executable:

```bash
cd backend
npm run build

cd ../frontend
npm run dist
```

Output is written to `release/`.

If `electron-builder` has trouble downloading NSIS resources from GitHub, use a mirror:

```powershell
$env:ELECTRON_BUILDER_BINARIES_MIRROR='https://npmmirror.com/mirrors/electron-builder-binaries/'
cd frontend
npx electron-builder
```

## API Overview

- `GET /api/health`
- `POST /api/entries`
- `GET /api/entries/recent`
- `GET /api/entries/:date`
- `PUT /api/entries/:id/favorite`
- `GET /api/calendar?year=2026&month=5`
- `GET /api/songs/:songId/play-url`
- `GET /api/songs/:songId/lyrics`
- `GET /api/settings/status`
- `DELETE /api/settings/cache`

## Repository Structure

```text
.
├── backend/          # Express + SQLite API
├── frontend/         # React + Vite + Electron app
├── data/             # Local runtime database, ignored by git
├── docs/             # Product design and implementation notes
├── release/          # Local package output, ignored by git
└── release-final/    # Local package output, ignored by git
```

## Notes

- This project uses unofficial music APIs. Availability can change at any time.
- Meloday does not ship a code-signing certificate yet.
- `.env`, local databases, build output, and packaged apps are intentionally ignored by git.

## License

Personal project. Please respect the terms and copyright rules of the services you connect to.
