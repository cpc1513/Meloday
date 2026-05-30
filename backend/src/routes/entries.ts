import { Router } from 'express';
import { run, get, all } from '../db.js';
import { incrementGenerationCountIfProxy } from '../services/apikey.js';
import { analyzeEmotions, hasAiGenerationAccess, recommendPlaylist } from '../services/deepseek.js';
import { findPlayableSong } from '../services/qqmusic.js';

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

async function deletePlaylistForEntry(entryId: number) {
  const playlist = await get('SELECT id FROM playlists WHERE entry_id = ?', [entryId]);
  if (!playlist) return;

  const playlistId = (playlist as any).id;
  await run(
    `DELETE FROM plays
     WHERE song_id IN (SELECT id FROM songs WHERE playlist_id = ?)`,
    [playlistId]
  );
  await run('DELETE FROM songs WHERE playlist_id = ?', [playlistId]);
  await run('DELETE FROM playlists WHERE id = ?', [playlistId]);
}

router.post('/', async (req, res) => {
  try {
    const { date, content, overwrite } = req.body;
    if (!date || !content) {
      return res.status(400).json({ error: 'date and content required' });
    }

    const existingEntry = await get('SELECT id, is_favorite FROM entries WHERE date = ?', [date]);
    if (existingEntry && !overwrite) {
      return res.status(409).json({
        error: 'ENTRY_EXISTS',
        message: '今天已经有一篇日记和歌单了，请确认是否更新这一天。',
      });
    }

    if (!await hasAiGenerationAccess()) {
      return res.status(402).json({
        error: 'QUOTA_EXHAUSTED',
        message: '免费生成次数已用完，请在设置页配置你的 DeepSeek API Key',
      });
    }

    const emotions = await analyzeEmotions(content);
    const recommendations = await recommendPlaylist(content, emotions);
    const songPromises = recommendations.map(async (rec, i) => {
      const keyword = `${rec.song} ${rec.artist}`;
      const qqSong = await findPlayableSong(keyword);
      if (!qqSong) return null;
      return {
        position: i + 1,
        name: qqSong.name,
        artist: qqSong.artist,
        album: qqSong.album,
        cover_url: qqSong.coverUrl,
        music_source: 'qq',
        source_id: qqSong.id,
        media_id: qqSong.mediaId,
        reason: rec.reason,
      };
    });

    const songResults = await Promise.all(songPromises);
    const songs = songResults.filter((s): s is NonNullable<typeof s> => s !== null);

    if (songs.length < 3) {
      return res.status(502).json({
        error: 'SONGS_NOT_ENOUGH',
        message: 'AI 已返回推荐，但 QQ 音乐没有找到足够可播放歌曲，请换一段日记内容或稍后再试',
      });
    }

    let entryId: number;
    let isFavorite = 0;

    if (existingEntry) {
      entryId = (existingEntry as any).id;
      isFavorite = (existingEntry as any).is_favorite || 0;
      await run(
        'UPDATE entries SET content = ?, emotions = ? WHERE id = ?',
        [content, JSON.stringify(emotions), entryId]
      );
      await deletePlaylistForEntry(entryId);
    } else {
      const entryResult = await run(
        'INSERT INTO entries (date, content, emotions) VALUES (?, ?, ?)',
        [date, content, JSON.stringify(emotions)]
      );
      entryId = entryResult.lastID;
    }

    const playlistResult = await run(
      'INSERT INTO playlists (entry_id) VALUES (?)',
      [entryId]
    );
    const playlistId = playlistResult.lastID;

    for (const song of songs) {
      await run(
        'INSERT INTO songs (playlist_id, position, name, artist, album, cover_url, music_source, source_id, media_id, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [playlistId, song.position, song.name, song.artist, song.album, song.cover_url, song.music_source, song.source_id, song.media_id, song.reason]
      );
    }

    await incrementGenerationCountIfProxy();

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
      is_favorite: Boolean(isFavorite),
      playlist: {
        id: playlistId,
        entry_id: entryId,
        songs: playlistRows,
      },
    });
  } catch (e) {
    console.error(e);
    const err = e as Error;
    if (err.message === 'QUOTA_EXHAUSTED' || err.message === 'PROXY_TOKEN_MISSING') {
      return res.status(402).json({
        error: 'QUOTA_EXHAUSTED',
        message: '免费生成次数已用完，请在设置页配置你的 DeepSeek API Key',
      });
    }
    res.status(500).json({
      error: 'GENERATION_FAILED',
      message: '生成歌单失败，请稍后再试',
    });
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
      const playlist = await getPlaylistForEntry((entry as any).id);
      result.push({
        ...(entry as any),
        is_favorite: Boolean((entry as any).is_favorite),
        emotions: parseEmotions((entry as any).emotions),
        playlist,
      });
    }
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch recent entries' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const entryId = Number(req.params.id);
    if (!Number.isFinite(entryId)) {
      return res.status(400).json({ error: 'Invalid entry id' });
    }

    await deletePlaylistForEntry(entryId);
    const result = await run('DELETE FROM entries WHERE id = ?', [entryId]);
    if (!result.changes) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, id: entryId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

router.get('/:date', async (req, res) => {
  const { date } = req.params;
  const entry = await get('SELECT * FROM entries WHERE date = ?', [date]);
  if (!entry) return res.status(404).json({ error: 'Not found' });

  const playlist = await getPlaylistForEntry((entry as any).id);

  res.json({
    ...(entry as any),
    is_favorite: Boolean((entry as any).is_favorite),
    emotions: parseEmotions((entry as any).emotions),
    playlist,
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
