import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { run } from '../db.js';
import { deleteUserApiKey, getGenerationInfo, setUserApiKey } from '../services/apikey.js';
import { CLOUD_AI_BASE_URL, getCloudAiStatus } from '../services/cloudai.js';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databasePath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', '..', 'data', 'meloday.db');

router.get('/status', async (_req, res) => {
  const generationInfo = await getGenerationInfo();
  const cloudStatus = await getCloudAiStatus(generationInfo.deviceId);
  const cloudAvailable = Boolean(cloudStatus?.ok && cloudStatus.hasDeepSeekKey);
  const aiProvider = generationInfo.hasUserKey
    ? 'user_key'
    : cloudAvailable && (cloudStatus?.generationLeft ?? 0) > 0
      ? 'cloud'
      : 'unavailable';

  const generationLimit = cloudStatus?.generationLimit ?? generationInfo.generationLimit;
  const generationCount = cloudStatus?.generationCount ?? generationInfo.generationCount;
  const generationLeft = cloudStatus?.generationLeft ?? Math.max(0, generationLimit - generationCount);

  res.json({
    status: 'ok',
    deepseek_configured: generationInfo.hasUserKey || cloudAvailable,
    ai_provider: aiProvider,
    device_id: generationInfo.deviceId,
    cloud_ai_available: cloudAvailable,
    cloud_ai_url: CLOUD_AI_BASE_URL,
    generation_count: generationCount,
    generation_limit: generationLimit,
    generation_left: generationLeft,
    has_user_key: generationInfo.hasUserKey,
    has_proxy_token: false,
    database_path: databasePath,
    music_source: 'qq',
    music_source_label: 'QQ 音乐',
    music_source_mode: '免 cookie，受版权限制歌曲会自动跳过',
    version: '1.0.6',
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

router.delete('/apikey', async (_req, res) => {
  try {
    await deleteUserApiKey();
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to remove API Key' });
  }
});

export default router;
