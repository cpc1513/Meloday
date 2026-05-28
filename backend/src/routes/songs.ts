import { Router } from 'express';
import { getPlayUrl } from '../services/netease.js';

const router = Router();

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

export default router;