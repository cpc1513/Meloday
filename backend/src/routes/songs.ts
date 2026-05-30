import { Router } from 'express';
import { all, get, run } from '../db.js';
import { getLyrics as getQQLyrics, getPlayUrl as getQQPlayUrl } from '../services/qqmusic.js';

const router = Router();

router.delete('/cache', async (_req, res) => {
  try {
    await run('DELETE FROM lyrics_cache');
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

router.get('/:songId/play-url', async (req, res) => {
  try {
    const song = await get<any>('SELECT * FROM songs WHERE id = ?', [Number(req.params.songId)]);
    if (!song) return res.status(404).json({ error: 'Song not found' });
    if (song.music_source !== 'qq' || !song.source_id) {
      return res.status(404).json({ error: 'QQ play url not found' });
    }

    const url = await getQQPlayUrl(song.source_id, song.media_id);
    if (!url) {
      return res.status(404).json({ error: 'Play url not found' });
    }
    res.json({ url, expires_in: 300, source: 'qq' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get play url' });
  }
});

router.get('/:songId/lyrics', async (req, res) => {
  try {
    const songId = Number(req.params.songId);
    if (!Number.isFinite(songId)) {
      return res.status(400).json({ error: 'Invalid song id' });
    }
    const song = await get<any>('SELECT * FROM songs WHERE id = ?', [songId]);
    if (!song) return res.status(404).json({ error: 'Song not found' });

    const lyricSourceId = song.music_source === 'qq' ? song.source_id : '';
    const cacheKey = `qq:${songId}`;
    if (!lyricSourceId) {
      return res.json({ song_id: songId, lines: [], raw: '', message: '暂无可用歌词' });
    }

    const cached = await get<{ raw_lyrics: string; parsed_lyrics: string }>(
      'SELECT raw_lyrics, parsed_lyrics FROM lyrics_cache WHERE source_id = ?',
      [cacheKey]
    );
    if (cached) {
      return res.json({
        song_id: songId,
        lines: JSON.parse(cached.parsed_lyrics || '[]'),
        raw: cached.raw_lyrics || '',
        source: 'cache'
      });
    }

    const lyrics = await getQQLyrics(song.source_id);
    await run(
      'INSERT OR REPLACE INTO lyrics_cache (source_id, raw_lyrics, parsed_lyrics, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [cacheKey, lyrics.raw, JSON.stringify(lyrics.lines)]
    );

    res.json({
      song_id: songId,
      lines: lyrics.lines,
      raw: lyrics.raw,
      source: 'qq',
      message: lyrics.lines.length ? null : '暂无可用歌词'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get lyrics' });
  }
});

router.get('/:songId/context', async (req, res) => {
  try {
    const rows = await all(
      `SELECT s.*, e.id as entry_id, e.date as entry_date, e.content as entry_content,
              e.emotions as entry_emotions, e.is_favorite
       FROM songs s
       JOIN playlists p ON s.playlist_id = p.id
       JOIN entries e ON p.entry_id = e.id
       WHERE s.id = ?
       ORDER BY e.date DESC
       LIMIT 1`,
      [Number(req.params.songId)]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const row = rows[0] as any;
    res.json({
      entry_id: row.entry_id,
      entry_date: row.entry_date,
      entry_content: row.entry_content,
      entry_emotions: JSON.parse(row.entry_emotions || '[]'),
      is_favorite: Boolean(row.is_favorite),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get song context' });
  }
});

export default router;
