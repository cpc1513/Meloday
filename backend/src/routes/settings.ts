import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { run } from '../db.js';
import { getGenerationInfo, setUserApiKey } from '../services/apikey.js';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databasePath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', '..', 'data', 'meloday.db');

router.get('/status', (_req, res) => {
  res.json({
    status: 'ok',
    deepseek_configured: Boolean(process.env.DEEPSEEK_API_KEY),
    database_path: databasePath,
    music_source: 'qq',
    music_source_label: 'QQ 音乐',
    music_source_mode: '免 cookie，受版权限制歌曲会自动跳过',
    version: '1.0.1'
  });
});

router.delete('/cache', async (_req, res) => {
  try {
    await run('DELETE FROM lyrics_cache');
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

router.post('/apikey', async (req, res) => {
  try {
    const { apikey } = req.body;
    if (!apikey || typeof apikey !== 'string' || apikey.trim().length === 0) {
      return res.status(400).json({ error: 'API Key is required' });
    }
    await setUserApiKey(apikey.trim());
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save API Key' });
  }
});

export default router;
