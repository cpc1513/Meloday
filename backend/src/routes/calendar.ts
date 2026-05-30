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

const HOLIDAYS: Record<string, string> = {
  '01-01': '元旦',
  '02-14': '情人节',
  '03-08': '妇女节',
  '03-12': '植树节',
  '04-01': '愚人节',
  '05-01': '劳动节',
  '05-04': '青年节',
  '06-01': '儿童节',
  '07-01': '建党节',
  '08-01': '建军节',
  '09-10': '教师节',
  '10-01': '国庆节',
  '10-31': '万圣夜',
  '12-24': '平安夜',
  '12-25': '圣诞节'
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

  const entryMap = new Map<string, any>();
  (entries as any[]).forEach(entry => entryMap.set(entry.date, entry));

  const days = Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    const date = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const entry = entryMap.get(date);
    const holiday = HOLIDAYS[`${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`] || null;
    if (!entry) {
      return {
        date,
        has_entry: false,
        emotions: null,
        song_cover: null,
        emotion_color: null,
        emotion_keyword: null,
        holiday,
        is_favorite: false
      };
    }
    const emotions = JSON.parse(entry.emotions || '[]');
    return {
      date: entry.date,
      has_entry: true,
      emotions,
      song_cover: entry.song_cover,
      emotion_color: EMOTION_COLORS[emotions[0]] || '#F5F3F0',
      emotion_keyword: emotions[0] || null,
      holiday,
      is_favorite: Boolean(entry.is_favorite)
    };
  });

  res.json({ days });
});

export default router;
