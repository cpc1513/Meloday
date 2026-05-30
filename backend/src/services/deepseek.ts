import axios from 'axios';
import {
  canUseProxyQuota,
  getOrCreateDeviceId,
  getProxyToken,
  getUserApiKey,
} from './apikey.js';

const DIRECT_BASE_URL = 'https://api.deepseek.com/v1';
const PROXY_BASE_URL = process.env.MELODAY_PROXY_URL || 'https://kmyppoy4p6bki.kimi.site/api/v1/deepseek';

interface EmotionResult {
  emotions: string[];
}

interface SongRecommendation {
  song: string;
  artist: string;
  reason: string;
}

type DeepSeekPayload = {
  model: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  temperature: number;
  response_format: { type: 'json_object' };
};

export async function hasAiGenerationAccess(): Promise<boolean> {
  return Boolean(await getUserApiKey()) || await canUseProxyQuota();
}

export async function analyzeEmotions(content: string): Promise<string[]> {
  const response = await postChatCompletion({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: '你是一位情绪分析专家。请阅读日记，判断最主要的 1-2 种情绪。只返回 JSON 格式：{"emotions":["情绪1","情绪2"]}。可选：开心、难过、平静、焦虑、愤怒、期待、孤独、兴奋、疲惫、感恩。',
      },
      { role: 'user', content },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  try {
    const result = JSON.parse(response.data.choices[0].message.content) as EmotionResult;
    return result.emotions?.slice(0, 2) || ['平静'];
  } catch {
    return ['平静'];
  }
}

export async function recommendPlaylist(
  content: string,
  emotions: string[]
): Promise<SongRecommendation[]> {
  const response = await postChatCompletion({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `你是一位音乐疗愈师。根据日记和情绪推荐一个 10 首歌的歌单，陪伴用户度过今天的心情。
要求：
- 只返回 JSON 对象，格式为 {"songs":[{"song":"歌名","artist":"歌手","reason":"推荐理由"}]}
- 每首包含 song、artist、reason，推荐理由用 1 句中文
- 可以是中文、英文、日语、韩语等任意语言，也可以包含纯音乐
- 优先选择 QQ 音乐能搜索到、非 VIP 更可能可播放的歌曲
- 歌单要有起伏变化，第一首最贴合当前情绪，后面逐渐过渡`,
      },
      {
        role: 'user',
        content: `情绪：${emotions.join('、')}\n\n日记：${content}`,
      },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  try {
    const result = JSON.parse(response.data.choices[0].message.content);
    const songs: SongRecommendation[] = Array.isArray(result)
      ? result
      : result.songs || result.playlist || [];
    return songs
      .filter(item => item?.song && item?.artist)
      .slice(0, 10);
  } catch {
    return [];
  }
}

async function postChatCompletion(payload: DeepSeekPayload) {
  const userKey = await getUserApiKey();
  if (userKey) {
    return axios.post(`${DIRECT_BASE_URL}/chat/completions`, payload, {
      headers: { Authorization: `Bearer ${userKey}` },
      timeout: 60000,
    });
  }

  if (!await canUseProxyQuota()) {
    throw new Error('QUOTA_EXHAUSTED');
  }

  const proxyToken = getProxyToken();
  if (!proxyToken) {
    throw new Error('PROXY_TOKEN_MISSING');
  }

  const deviceId = await getOrCreateDeviceId();
  return axios.post(`${PROXY_BASE_URL}/chat/completions`, payload, {
    headers: {
      'x-api-token': proxyToken,
      'x-meloday-device-id': deviceId,
    },
    timeout: 60000,
  });
}
