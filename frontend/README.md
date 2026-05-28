# Meloday Frontend

Meloday 的桌面端界面，使用 React、Vite 和 Electron 构建。它负责日记输入、日历回顾、历史歌单展示和全局音乐播放器。

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
npm run electron:dev
npm run dist
```

## Development

- Web dev server: `npm run dev`
- Electron dev mode: `npm run electron:dev`
- Production build: `npm run build`
- Windows portable package: `npm run dist`

The frontend expects the backend API at `http://localhost:3000/api` by default. Override it with `VITE_API_BASE` if needed.
