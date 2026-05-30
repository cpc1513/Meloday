import axios from "axios";
import {
  canUseProxyQuota,
  getGenerationInfo,
  getOrCreateDeviceId,
  getProxyToken,
  getUserApiKey,
} from "./apikey.js";

const DIRECT_BASE_URL = "https://api.deepseek.com/v1";
const PROXY_BASE_URL = process.env.MELODAY_PROXY_URL || "https://kmyppoy4p6bki.kimi.site/api/v1/deepseek";

interface EmotionResult {
  emotions: string[];
}

interface SongRecommendation {
  song: string;
  artist: string;
  reason: string;
}

const GENERIC_REASONS = [
  "适合你的心情",
  "陪伴你的心情",
  "治愈你的心情",
  "符合你的情绪",
  "缓解你的情绪",
  "带来力量",
  "给你安慰",
];

type DeepSeekPayload = {
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  temperature: number;
  response_format: { type: "json_object" };
};

export async function hasAiGenerationAccess(): Promise<boolean> {
  return Boolean(await getUserApiKey()) || await canUseProxyQuota();
}

export async function analyzeEmotions(content: string): Promise<string[]> {
  try {
    const response = await postChatCompletion({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "\u4f60\u662f\u4e00\u4f4d\u60c5\u7eea\u5206\u6790\u4e13\u5bb6\u3002\u8bf7\u9605\u8bfb\u65e5\u8bb0\uff0c\u5224\u65ad\u6700\u4e3b\u8981\u7684 1-2 \u79cd\u60c5\u7eea\u3002\u53ea\u8fd4\u56de JSON \u683c\u5f0f\uff1a{\"emotions\":[\"\u60c5\u7eea1\",\"\u60c5\u7eea2\"]}\u3002\u53ef\u9009\uff1a\u5f00\u5fc3\u3001\u96be\u8fc7\u3001\u5e73\u9759\u3001\u7126\u8651\u3001\u6124\u6012\u3001\u671f\u5f85\u3001\u5b64\u72ec\u3001\u5174\u596b\u3001\u75b2\u60eb\u3001\u611f\u6069\u3002",
        },
        { role: "user", content },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.data.choices[0].message.content) as EmotionResult;
    return result.emotions?.slice(0, 2) || ["\u5e73\u9759"];
  } catch (err: any) {
    if (isStructuredError(err)) throw err;
    console.error("Emotion analysis failed:", err.message);
    return ["\u5e73\u9759"];
  }
}

export async function recommendPlaylist(
  content: string,
  emotions: string[]
): Promise<SongRecommendation[]> {
  try {
    const response = await postChatCompletion({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `你是 Meloday 的音乐策展人，不是按情绪标签套模板的歌单机器人。请根据用户日记生成 14 首候选歌，用于后续检索可播放歌曲。

核心原则：
- 日记里的具体线索优先于情绪标签。先理解场景、人物关系、时间感、能量水平、天气/地点/事件、用户真正需要的陪伴方式，再选歌。
- 情绪标签只作为辅助，不允许因为出现“难过、孤独、焦虑、开心”等词就固定推荐常见代表作。
- 不要每次推荐同一批歌；避免短视频神曲、过度热门疗伤歌、网络热梗歌、明显不贴合日记的歌曲。
- 歌单要像一天的情绪曲线：1-2 首贴近当下，3-5 首回应日记里的场景或事件，6-8 首完成情绪转场，9-10 首收束陪伴；第 11-14 首作为可替换候选，也要保持同等质量。
- 保持多样性：同一歌手最多 1 首；相邻歌曲不要同语种、同风格、同年代连续堆叠；可混合华语、欧美、日语、韩语、独立、民谣、电子、纯音乐等，但不要为了多样而突兀。
- 优先选择 QQ 音乐更可能搜到且非 VIP 更可能可播放的歌曲；歌名和歌手必须准确、常见、可检索。
- reason 必须是 1 句中文，明确引用日记中的具体线索或情绪转场，不要写“适合你的心情”这类空话。

只返回 JSON 对象，格式为：
{"songs":[{"song":"歌名","artist":"歌手","reason":"推荐理由"}]}`,
        },
        {
          role: "user",
          content: `情绪标签：${emotions.join("、") || "未识别"}

日记原文：
${content}

请先在心里提取日记线索，但不要输出分析过程；只输出 JSON。`,
        },
      ],
      temperature: 0.85,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.data.choices[0].message.content);
    const songs: SongRecommendation[] = Array.isArray(result)
      ? result
      : result.songs || result.playlist || [];
    return diversifyRecommendations(songs).slice(0, 10);
  } catch (err: any) {
    if (isStructuredError(err)) throw err;
    console.error("Playlist recommendation failed:", err.message);
    return [];
  }
}

// --- Internal helpers ---

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
  return String(value || "")
    .replace(/[《》"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanReason(value: unknown): string {
  const reason = cleanText(value);
  return reason || "这首歌回应了日记里的具体情绪和场景。";
}

function isGenericReason(reason: string): boolean {
  return GENERIC_REASONS.some(item => reason.includes(item));
}

function isStructuredError(err: any): boolean {
  return ["ALL_API_FAILED", "QUOTA_EXHAUSTED", "PROXY_TOKEN_MISSING"].includes(err?.message);
}

async function postChatCompletion(payload: DeepSeekPayload) {
  const userKey = await getUserApiKey();

  // 1. Try user own API key first
  if (userKey) {
    try {
      return await axios.post(DIRECT_BASE_URL + "/chat/completions", payload, {
        headers: { Authorization: "Bearer " + userKey },
        timeout: 60000,
      });
    } catch {
      // User key unreachable, silently fall back to proxy
    }
  }

  // 2. Fall back to proxy (or use as primary when no user key)
  const proxyAvailable = await hasProxyQuota();
  if (!proxyAvailable) {
    throw new Error(userKey ? "ALL_API_FAILED" : "QUOTA_EXHAUSTED");
  }

  const proxyToken = getProxyToken();
  if (!proxyToken) {
    throw new Error("PROXY_TOKEN_MISSING");
  }

  const deviceId = await getOrCreateDeviceId();
  try {
    return await axios.post(PROXY_BASE_URL + "/chat/completions", payload, {
      headers: {
        "x-api-token": proxyToken,
        "x-meloday-device-id": deviceId,
      },
      timeout: 60000,
    });
  } catch {
    throw new Error("ALL_API_FAILED");
  }
}

async function hasProxyQuota(): Promise<boolean> {
  if (!getProxyToken()) return false;
  const info = await getGenerationInfo();
  return info.generationCount < info.generationLimit;
}
