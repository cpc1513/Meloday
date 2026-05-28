import { Router } from 'express';
import { run, get, all } from '../db.js';
import { analyzeEmotions, recommendPlaylist } from '../services/deepseek.js';
import { findPlayableSong } from '../services/netease.js';

const router = Router();

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
      'SELECT * FROM songs WHERE playlist_id = ? ORDER BY position',
      [playlistId]
    );

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

router.get('/recent', async (_req, res) => {
  try {
    const entries = await all(
      'SELECT * FROM entries ORDER BY date DESC LIMIT 20',
      []
    );
    const result = [];
    for (const entry of entries) {
      const playlist = await get('SELECT * FROM playlists WHERE entry_id = ?', [entry.id]);
      const songs = playlist
        ? await all('SELECT * FROM songs WHERE playlist_id = ? ORDER BY position', [playlist.id])
        : [];
      result.push({
        ...entry,
        emotions: JSON.parse(entry.emotions || '[]'),
        playlist: playlist ? { ...playlist, songs } : null
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

  const playlist = await get('SELECT * FROM playlists WHERE entry_id = ?', [entry.id]);
  const songs = playlist
    ? await all('SELECT * FROM songs WHERE playlist_id = ? ORDER BY position', [playlist.id])
    : [];

  res.json({
    ...entry,
    emotions: JSON.parse(entry.emotions || '[]'),
    playlist: playlist ? { ...playlist, songs } : null
  });
});

export default router;