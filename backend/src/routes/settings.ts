import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { run } from '../db.js';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databasePath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', '..', 'data', 'meloday.db');

router.get('/status', (_req, res) => {
  res.json({
    status: 'ok',
    deepseek_configured: Boolean(process.env.DEEPSEEK_API_KEY),
    database_path: databasePath,
    version: '1.0.0'
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

export default router;
