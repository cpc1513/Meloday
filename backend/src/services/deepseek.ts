import axios from 'axios';
import { getOrCreateDeviceId, getUserApiKey } from './apikey.js';
import { getCloudAiStatus, postCloudChatCompletion } from './cloudai.js';

const DIRECT_BASE_URL = 'https://api.deepseek.com/v1';

interface SongRecommendation {
  song: string;
  artist: string;
  reason: string;
}

export interface DiaryMusicPlan {
  emotions: string[];
  songs: SongRecommendation[];
}

const GENERIC_REASONS = [
  '适合你的心情',
  '陪伴你的心情',
  '治愈你的心情',
  '符合你的情绪',
  '缓解你的情绪',
  '带来力量',
  '给你安慰',
];

type DeepSeekPayload = {
  model: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  temperature: number;
  response_format: { type: 'json_object' };
};

export async function hasAiGenerationAccess(): Promise<boolean> {
  if (await getUserApiKey()) return true;
  const deviceId = await getOrCreateDeviceId();
  const status = await getCloudAiStatus(deviceId);
  return Boolean(status?.hasDeepSeekKey && (status.generationLeft ?? 0) > 0);
}

export async function generateDiaryMusicPlan(content: string): Promise<DiaryMusicPlan> {
  try {
    const response = await postChatCompletion({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `你是 Meloday 的情绪分析师和音乐策展人。请根据用户日记一次性输出情绪标签和 14 首候选歌，用于后续 QQ 音乐检索。

核心原则：
- 先理解日记里的具体线索：场景、人物关系、时间感、能量水平、天气/地点/事件、用户真正需要的陪伴方式。
- 情绪标签只返回最主要的 1-2 个，可选：开心、难过、平静、焦虑、愤怒、期待、孤独、兴奋、疲惫、感恩。
- 不要因为出现某个情绪词就固定推荐模板歌曲；避免短视频神曲、过度热门疗伤歌、网络热梗歌、明显不贴合日记的歌曲。
- 歌单要像一天的情绪曲线：前段贴近当下，中段回应日记场景或事件，后段完成情绪转场并收束陪伴。
- 保持多样性：同一歌手最多 1 首；相邻歌曲不要同语种、同风格、同年代连续堆叠。
- 优先选择 QQ 音乐更可能搜到且非 VIP 更可能可播放的歌曲；歌名和歌手必须准确、常见、可检索。
- reason 必须是 1 句中文，明确引用日记中的具体线索或情绪转场，不要写“适合你的心情”这类空话。

只返回 JSON 对象，格式为：
{"emotions":["情绪1","情绪2"],"songs":[{"song":"歌名","artist":"歌手","reason":"推荐理由"}]}`,
        },
        {
          role: 'user',
          content: `日记原文：\n${content}\n\n请只输出 JSON。`,
        },
      ],
      temperature: 0.82,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.data.choices[0].message.content || '{}');
    const emotions = normalizeEmotions(result.emotions);
    const songs: SongRecommendation[] = Array.isArray(result.songs)
      ? result.songs
      : result.playlist || [];
    return {
      emotions,
      songs: diversifyRecommendations(songs).slice(0, 10),
    };
  } catch (err: any) {
    if (isStructuredError(err)) throw err;
    console.error('Diary music plan failed:', err.message);
    return { emotions: ['平静'], songs: [] };
  }
}

// --- Internal helpers ---

function normalizeEmotions(value: unknown): string[] {
  const candidates = Array.isArray(value) ? value : [];
  const emotions = candidates
    .map(item => cleanText(item))
    .filter(Boolean)
    .slice(0, 2);
  return emotions.length ? emotions : ['平静'];
}

function diversifyRecommendations(songs: SongRecommendation[]): SongRecommendation[] {
  const normalized = songs
    .map(item => ({
      song: cleanText(item?.song),
      artist: cleanText(item?.artist),
      reason: cleanReason(item?.reason),
    }))
    .filter(item => item.song && item.artist);

  const seenSongs = new Set<string>();
  const seenArtists = new Set<string>();
  const primary: SongRecommendation[] = [];
  const fallback: SongRecommendation[] = [];

  for (const song of normalized) {
    const songKey = `${song.song.toLowerCase()}::${song.artist.toLowerCase()}`;
    const artistKey = song.artist.toLowerCase();
    if (seenSongs.has(songKey)) continue;
    seenSongs.add(songKey);

    if (!seenArtists.has(artistKey) && !isGenericReason(song.reason)) {
      primary.push(song);
      seenArtists.add(artistKey);
    } else {
      fallback.push(song);
    }
  }

  return [...primary, ...fallback].slice(0, 14);
}

function cleanText(value: unknown): string {
  return String(value || '')
    .replace(/[《》"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanReason(value: unknown): string {
  const reason = cleanText(value);
  return reason || '这首歌回应了日记里的具体情绪和场景。';
}

function isGenericReason(reason: string): boolean {
  return GENERIC_REASONS.some(item => reason.includes(item));
}

function isStructuredError(err: any): boolean {
  return ['ALL_API_FAILED', 'QUOTA_EXHAUSTED', 'CLOUD_AI_UNAVAILABLE'].includes(err?.message);
}

async function postChatCompletion(payload: DeepSeekPayload) {
  const userKey = await getUserApiKey();

  if (userKey) {
    try {
      return await axios.post(`${DIRECT_BASE_URL}/chat/completions`, payload, {
        headers: { Authorization: `Bearer ${userKey}` },
        timeout: 60000,
      });
    } catch (err) {
      console.error('User DeepSeek key failed, falling back to cloud gateway:', err);
    }
  }

  const deviceId = await getOrCreateDeviceId();
  try {
    const cloudData = await postCloudChatCompletion(deviceId, payload);
    return { data: cloudData };
  } catch (err: any) {
    if (err.response?.status === 429 || err.response?.data?.error === 'QUOTA_EXHAUSTED') {
      throw new Error('QUOTA_EXHAUSTED');
    }
    console.error('Cloud AI request failed:', err.response?.data || err.message);
    throw new Error(userKey ? 'ALL_API_FAILED' : 'CLOUD_AI_UNAVAILABLE');
  }
}
