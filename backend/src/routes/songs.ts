import { Router } from 'express';
import { all, get, run } from '../db.js';
import { getLyrics, getPlayUrl } from '../services/netease.js';

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

router.get('/:neteaseId/lyrics', async (req, res) => {
  try {
    const neteaseId = Number(req.params.neteaseId);
    if (!Number.isFinite(neteaseId)) {
      return res.status(400).json({ error: 'Invalid song id' });
    }

    const cached = await get<{ raw_lyrics: string; parsed_lyrics: string }>(
      'SELECT raw_lyrics, parsed_lyrics FROM lyrics_cache WHERE netease_id = ?',
      [neteaseId]
    );
    if (cached) {
      return res.json({
        netease_id: neteaseId,
        lines: JSON.parse(cached.parsed_lyrics || '[]'),
        raw: cached.raw_lyrics || '',
        source: 'cache'
      });
    }

    const lyrics = await getLyrics(neteaseId);
    await run(
      'INSERT OR REPLACE INTO lyrics_cache (netease_id, raw_lyrics, parsed_lyrics, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [neteaseId, lyrics.raw, JSON.stringify(lyrics.lines)]
    );

    res.json({
      netease_id: neteaseId,
      lines: lyrics.lines,
      raw: lyrics.raw,
      source: 'netease',
      message: lyrics.lines.length ? null : '暂无可用歌词'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get lyrics' });
  }
});

router.get('/:neteaseId/context', async (req, res) => {
  try {
    const rows = await all(
      `SELECT s.*, e.id as entry_id, e.date as entry_date, e.content as entry_content,
              e.emotions as entry_emotions, e.is_favorite
       FROM songs s
       JOIN playlists p ON s.playlist_id = p.id
       JOIN entries e ON p.entry_id = e.id
       WHERE s.netease_id = ?
       ORDER BY e.date DESC
       LIMIT 1`,
      [Number(req.params.neteaseId)]
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
