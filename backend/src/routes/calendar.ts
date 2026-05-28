import { Router } from 'express';
import { all } from '../db.js';

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

router.get('/', async (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) {
    return res.status(400).json({ error: 'year and month required' });
  }

  const y = Number(year);
  const m = Number(month);
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const entries = await all(
    `SELECT e.*, s.cover_url as song_cover
     FROM entries e
     LEFT JOIN playlists p ON e.id = p.entry_id
     LEFT JOIN songs s ON p.id = s.playlist_id AND s.position = 1
     WHERE e.date BETWEEN ? AND ?
     ORDER BY e.date`,
    [startDate, endDate]
  );

  const days = (entries as any[]).map(entry => {
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