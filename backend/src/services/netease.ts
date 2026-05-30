import axios from 'axios';

const BASE_URL = 'https://music.mcseekeri.com';

export interface NeteaseSong {
  id: number;
  name: string;
  artist: string;
  album: string;
  coverUrl: string;
}

export interface LyricLine {
  time: number;
  text: string;
}

/** 搜索歌曲，返回多个候选 */
export async function searchSongs(keyword: string, limit = 5): Promise<NeteaseSong[]> {
  try {
    const res = await axios.get(`${BASE_URL}/search`, {
      params: { keywords: keyword, limit },
      timeout: 12000,
    });
    const songs = res.data?.result?.songs;
    if (!songs || songs.length === 0) return [];

    return songs.map((song: any) => ({
      id: song.id,
      name: song.name,
      artist: song.artists?.[0]?.name || song.ar?.[0]?.name || 'Unknown',
      album: song.album?.name || song.al?.name || '',
      coverUrl: song.album?.picUrl || song.al?.picUrl || '',
    }));
  } catch (e) {
    console.error('Netease search failed:', keyword, e);
    return [];
  }
}

/** 获取单首歌曲的播放 URL */
export async function getPlayUrl(id: number): Promise<string | null> {
  try {
    const res = await axios.get(`${BASE_URL}/song/url`, {
      params: { id, br: 320000 },
      timeout: 12000,
    });
    const urls = res.data?.data;
    if (!urls || urls.length === 0) return null;
    return urls[0].url || null;
  } catch (e) {
    console.error('Netease url failed:', id, e);
    return null;
  }
}

export async function getLyrics(id: number): Promise<{ raw: string; lines: LyricLine[] }> {
  try {
    const res = await axios.get(`${BASE_URL}/lyric`, {
      params: { id },
      timeout: 12000,
    });
    const raw = res.data?.lrc?.lyric || res.data?.yrc?.lyric || '';
    return { raw, lines: parseLyrics(raw) };
  } catch (e) {
    console.error('Netease lyric failed:', id, e);
    return { raw: '', lines: [] };
  }
}

/** 并发验证多个候选，返回第一个能播放的 */
export async function findPlayableSong(keyword: string): Promise<NeteaseSong | null> {
  const candidates = await searchSongs(keyword, 5);
  if (candidates.length === 0) return null;

  // 并发检查所有候选的播放 URL（但只发一批，不是瀑布流）
  const urlChecks = await Promise.all(
    candidates.map(async (song) => ({
      song,
      url: await getPlayUrl(song.id),
    }))
  );

  const playable = urlChecks.find((c) => c.url);
  if (playable) return playable.song;

  // 全都没 URL，返回第一个（至少能显示）
  return candidates[0];
}

function parseLyrics(raw: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const matches = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
    const text = line.replace(/\[[^\]]+\]/g, '').trim();
    if (!matches.length || !text) continue;
    for (const match of matches) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fraction = match[3] ? Number(match[3].padEnd(3, '0')) / 1000 : 0;
      lines.push({ time: minutes * 60 + seconds + fraction, text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}
