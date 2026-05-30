import { Router } from 'express';
import { run, get, all } from '../db.js';
import { analyzeEmotions, recommendPlaylist } from '../services/deepseek.js';
import { findPlayableSong } from '../services/netease.js';

const router = Router();

function parseEmotions(value: string | null | undefined): string[] {
  try {
    return JSON.parse(value || '[]');
  } catch {
    return [];
  }
}

async function getPlaylistForEntry(entryId: number) {
  const playlist = await get('SELECT * FROM playlists WHERE entry_id = ?', [entryId]);
  const songs = playlist
    ? await all(
        `SELECT s.*, p.entry_id, e.date as entry_date, e.is_favorite
         FROM songs s
         JOIN playlists p ON s.playlist_id = p.id
         JOIN entries e ON p.entry_id = e.id
         WHERE s.playlist_id = ?
         ORDER BY s.position`,
        [(playlist as any).id]
      )
    : [];
  return playlist ? { ...(playlist as any), songs } : null;
}

router.post('/', async (req, res) => {
  try {
    const { date, content } = req.body;
    if (!date || !content) {
      return res.status(400).json({ error: 'date and content required' });
    }

    const emotions = await analyzeEmotions(content);

    const existingEntry = await get('SELECT id FROM entries WHERE date = ?', [date]);
    let entryId: number;

    if (existingEntry) {
      await run(
        'UPDATE entries SET content = ?, emotions = ? WHERE id = ?',
        [content, JSON.stringify(emotions), existingEntry.id]
      );
      entryId = existingEntry.id;
      // Remove old playlist so it can be regenerated
      const oldPlaylist = await get('SELECT id FROM playlists WHERE entry_id = ?', [entryId]);
      if (oldPlaylist) {
        await run('DELETE FROM songs WHERE playlist_id = ?', [oldPlaylist.id]);
        await run('DELETE FROM playlists WHERE id = ?', [oldPlaylist.id]);
      }
    } else {
      const entryResult = await run(
        'INSERT INTO entries (date, content, emotions) VALUES (?, ?, ?)',
        [date, content, JSON.stringify(emotions)]
      );
      entryId = entryResult.lastID;
    }

    const recommendations = await recommendPlaylist(content, emotions);

    // 并发搜索所有推荐歌曲，避免串行超时
    const songPromises = recommendations.map(async (rec, i) => {
      const keyword = `${rec.song} ${rec.artist}`;
      const neteaseSong = await findPlayableSong(keyword);
      if (!neteaseSong) return null;
      return {
        position: i + 1,
        name: neteaseSong.name,
        artist: neteaseSong.artist,
        album: neteaseSong.album,
        cover_url: neteaseSong.coverUrl,
        netease_id: neteaseSong.id,
        reason: rec.reason,
      };
    });

    const songResults = await Promise.all(songPromises);
    const songs = songResults.filter((s): s is NonNullable<typeof s> => s !== null);

    if (songs.length < 3) {
      return res.status(500).json({ error: 'Could not find enough songs' });
    }

    const playlistResult = await run(
      'INSERT INTO playlists (entry_id) VALUES (?)',
      [entryId]
    );
    const playlistId = playlistResult.lastID;

    for (const song of songs) {
      await run(
        'INSERT INTO songs (playlist_id, position, name, artist, album, cover_url, netease_id, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [playlistId, song.position, song.name, song.artist, song.album, song.cover_url, song.netease_id, song.reason]
      );
    }

    const playlistRows = await all(
      `SELECT s.*, p.entry_id, e.date as entry_date, e.is_favorite
       FROM songs s
       JOIN playlists p ON s.playlist_id = p.id
       JOIN entries e ON p.entry_id = e.id
       WHERE s.playlist_id = ?
       ORDER BY s.position`,
      [playlistId]
    );

    res.json({
      id: entryId,
      date,
      content,
      emotions,
      is_favorite: 0,
      playlist: {
        id: playlistId,
        entry_id: entryId,
        songs: playlistRows
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to generate playlist' });
  }
});

router.get('/recent', async (_req, res) => {
  try {
    const entries = await all(
      'SELECT * FROM entries ORDER BY date DESC LIMIT 20',
      []
    );
    const result = [];
    for (const entry of entries) {
      const playlist = await getPlaylistForEntry(entry.id);
      result.push({
        ...entry,
        is_favorite: Boolean(entry.is_favorite),
        emotions: parseEmotions(entry.emotions),
        playlist
      });
    }
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch recent entries' });
  }
});

router.get('/:date', async (req, res) => {
  const { date } = req.params;
  const entry = await get('SELECT * FROM entries WHERE date = ?', [date]);
  if (!entry) return res.status(404).json({ error: 'Not found' });

  const playlist = await getPlaylistForEntry((entry as any).id);

  res.json({
    ...entry,
    is_favorite: Boolean((entry as any).is_favorite),
    emotions: parseEmotions((entry as any).emotions),
    playlist
  });
});

router.put('/:id/favorite', async (req, res) => {
  try {
    const entryId = Number(req.params.id);
    const nextValue = req.body?.is_favorite ? 1 : 0;
    const result = await run('UPDATE entries SET is_favorite = ? WHERE id = ?', [nextValue, entryId]);
    if (!result.changes) return res.status(404).json({ error: 'Not found' });
    res.json({ id: entryId, is_favorite: Boolean(nextValue) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update favorite' });
  }
});

export default router;
