import axios from 'axios';

const BASE_URL = 'https://api.deepseek.com/v1';

import { getEffectiveApiKey } from './apikey.js';

interface EmotionResult {
  emotions: string[];
}

interface SongRecommendation {
  song: string;
  artist: string;
  reason: string;
}

export async function analyzeEmotions(content: string): Promise<string[]> {
  const response = await axios.post(
    `${BASE_URL}/chat/completions`,
    {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一位情绪分析专家。请阅读日记，判断最主要的1-2种情绪。只返回JSON格式：{"emotions": ["情绪1", "情绪2"]}。可选：开心、难过、平静、焦虑、愤怒、期待、孤独、兴奋、疲惫、感恩。'
        },
        { role: 'user', content }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    },
    { headers: { Authorization: `Bearer ${await getEffectiveApiKey()}` } }
  );

  let result: EmotionResult;
  try {
    result = JSON.parse(response.data.choices[0].message.content) as EmotionResult;
  } catch {
    return ['平静'];
  }
  return result.emotions?.slice(0, 2) || ['平静'];
}

export async function recommendPlaylist(
  content: string,
  emotions: string[]
): Promise<SongRecommendation[]> {
  const response = await axios.post(
    `${BASE_URL}/chat/completions`,
    {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `你是一位音乐治疗师。根据日记和情绪推荐一个10首歌的歌单，陪伴用户度过今天的心情。
要求：
- 只返回JSON数组格式
- 每首包含 song（歌名）、artist（歌手）、reason（推荐理由，1句话）
- 可以是中文、英文、日语、韩语等任意语言，也可以包含纯音乐
- 优先选择网易云音乐能搜索到的歌曲
- 歌单要有起伏变化，第一首最贴合当前情绪，后面逐渐过渡

返回格式：[{"song": "...", "artist": "...", "reason": "..."}, ...]`
        },
        {
          role: 'user',
          content: `情绪：${emotions.join('、')}\n\n日记：${content}`
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    },
    { headers: { Authorization: `Bearer ${await getEffectiveApiKey()}` } }
  );

  let result;
  try {
    result = JSON.parse(response.data.choices[0].message.content);
  } catch {
    return [];
  }
  const songs: SongRecommendation[] = Array.isArray(result) ? result : result.songs || result.playlist || [];
  return songs.slice(0, 10);
}
