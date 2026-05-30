import axios from 'axios';

export interface QQMusicSong {
  id: string;
  mediaId: string | null;
  name: string;
  artist: string;
  album: string;
  coverUrl: string;
}

export interface LyricLine {
  time: number;
  text: string;
}

interface QQSearchSong {
  songmid?: string;
  strMediaMid?: string;
  songname?: string;
  singer?: Array<{ name?: string }>;
  albumname?: string;
  albummid?: string;
  album?: { mid?: string; name?: string };
  title?: string;
  name?: string;
  mid?: string;
}

const REQUEST_TIMEOUT = 12000;
const QQ_REFERER = 'https://y.qq.com';

export async function searchSongs(keyword: string, limit = 5): Promise<QQMusicSong[]> {
  try {
    const res = await axios.get('https://c.y.qq.com/soso/fcgi-bin/client_search_cp', {
      params: {
        format: 'json',
        n: limit,
        p: 1,
        w: keyword,
        cr: 1,
        g_tk: 5381,
        t: 0,
      },
      headers: { Referer: QQ_REFERER },
      timeout: REQUEST_TIMEOUT,
    });

    const list: QQSearchSong[] = res.data?.data?.song?.list || [];
    return list
      .map(normalizeSong)
      .filter((song): song is QQMusicSong => Boolean(song));
  } catch (e) {
    console.error('QQ Music search failed:', keyword, e);
    return [];
  }
}

export async function getPlayUrl(songmid: string, mediaId?: string | null): Promise<string | null> {
  try {
    const url = await getSinglePlayUrl(songmid, mediaId || songmid, '128')
      || await getSinglePlayUrl(songmid, mediaId || songmid, 'm4a');
    if (url) return url;

    const urls = await getBatchPlayUrls([songmid]);
    return urls[songmid] || null;
  } catch (e) {
    console.error('QQ Music url failed:', songmid, e);
    return null;
  }
}

export async function findPlayableSong(keyword: string): Promise<QQMusicSong | null> {
  const candidates = await searchSongs(keyword, 8);
  if (candidates.length === 0) return null;

  const urls = await getBatchPlayUrls(candidates.map(song => song.id));
  const playable = candidates.find(song => urls[song.id]);
  if (playable) return enrichCover(playable);

  const urlChecks = await Promise.all(
    candidates.slice(0, 4).map(async song => ({
      song,
      url: await getPlayUrl(song.id, song.mediaId),
    }))
  );
  const checkedPlayable = urlChecks.find(item => item.url)?.song;
  return checkedPlayable ? enrichCover(checkedPlayable) : null;
}

export async function getLyrics(songmid: string): Promise<{ raw: string; lines: LyricLine[] }> {
  try {
    const res = await axios.get('http://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg', {
      params: {
        songmid,
        pcachetime: Date.now(),
        g_tk: 5381,
        loginUin: 0,
        hostUin: 0,
        inCharset: 'utf8',
        outCharset: 'utf-8',
        notice: 0,
        platform: 'yqq',
        needNewCode: 0,
      },
      headers: { Referer: QQ_REFERER },
      timeout: REQUEST_TIMEOUT,
    });
    const payload = typeof res.data === 'string'
      ? JSON.parse(res.data.replace(/callback\(|MusicJsonCallback\(|jsonCallback\(|\)$/g, ''))
      : res.data;
    const raw = decodeBase64(payload?.lyric || '');
    return { raw, lines: parseLyrics(raw) };
  } catch (e) {
    console.error('QQ Music lyric failed:', songmid, e);
    return { raw: '', lines: [] };
  }
}

async function getBatchPlayUrls(songmids: string[]): Promise<Record<string, string>> {
  if (songmids.length === 0) return {};
  try {
    const idStr = songmids.map(id => `"${id}"`).join(',');
    const data = `{"req_0":{"module":"vkey.GetVkeyServer","method":"CgiGetVkey","param":{"guid":"2796982635","songmid":[${idStr}],"songtype":[0],"uin":"0","loginflag":1,"platform":"20"}},"comm":{"uin":0,"format":"json","ct":24,"cv":0}}`;
    const res = await axios.get('https://u.y.qq.com/cgi-bin/musicu.fcg', {
      params: {
        '-': 'getplaysongvkey',
        g_tk: 5381,
        loginUin: 0,
        hostUin: 0,
        format: 'json',
        inCharset: 'utf8',
        outCharset: 'utf-8',
        notice: 0,
        platform: 'yqq.json',
        needNewCode: 0,
        data,
      },
      timeout: REQUEST_TIMEOUT,
    });
    const req = res.data?.req_0?.data;
    const domain = req?.sip?.find((item: string) => !item.startsWith('http://ws')) || req?.sip?.[0] || '';
    const result: Record<string, string> = {};
    (req?.midurlinfo || []).forEach((item: { songmid?: string; purl?: string }) => {
      if (item.songmid && item.purl) result[item.songmid] = `${domain}${item.purl}`;
    });
    return result;
  } catch {
    return {};
  }
}

async function getSinglePlayUrl(songmid: string, mediaId: string, type: '128' | 'm4a'): Promise<string | null> {
  const typeObj = type === 'm4a'
    ? { prefix: 'C400', ext: '.m4a' }
    : { prefix: 'M500', ext: '.mp3' };
  const file = `${typeObj.prefix}${songmid}${mediaId}${typeObj.ext}`;
  const guid = Math.floor(Math.random() * 10000000).toString();
  const res = await axios.get('https://u.y.qq.com/cgi-bin/musicu.fcg', {
    params: {
      '-': 'getplaysongvkey',
      g_tk: 5381,
      loginUin: 0,
      hostUin: 0,
      format: 'json',
      inCharset: 'utf8',
      outCharset: 'utf-8',
      notice: 0,
      platform: 'yqq.json',
      needNewCode: 0,
      data: JSON.stringify({
        req_0: {
          module: 'vkey.GetVkeyServer',
          method: 'CgiGetVkey',
          param: {
            filename: [file],
            guid,
            songmid: [songmid],
            songtype: [0],
            uin: '0',
            loginflag: 1,
            platform: '20',
          },
        },
        comm: {
          uin: 0,
          format: 'json',
          ct: 19,
          cv: 0,
        },
      }),
    },
    timeout: REQUEST_TIMEOUT,
  });
  const req = res.data?.req_0?.data;
  const purl = req?.midurlinfo?.[0]?.purl;
  const domain = req?.sip?.find((item: string) => !item.startsWith('http://ws')) || req?.sip?.[0] || '';
  return purl && domain ? `${domain}${purl}` : null;
}

async function enrichCover(song: QQMusicSong): Promise<QQMusicSong> {
  if (song.coverUrl) return song;
  const albumMid = await getAlbumMid(song.id);
  return albumMid
    ? { ...song, coverUrl: buildCoverUrl(albumMid) }
    : song;
}

async function getAlbumMid(songmid: string): Promise<string> {
  try {
    const res = await axios.get('https://u.y.qq.com/cgi-bin/musicu.fcg', {
      params: {
        format: 'json',
        data: JSON.stringify({
          comm: { ct: 24, cv: 0 },
          songinfo: {
            module: 'music.pf_song_detail_svr',
            method: 'get_song_detail_yqq',
            param: { song_mid: songmid },
          },
        }),
      },
      headers: { Referer: QQ_REFERER },
      timeout: REQUEST_TIMEOUT,
    });
    return res.data?.songinfo?.data?.track_info?.album?.mid || '';
  } catch {
    return '';
  }
}

function normalizeSong(song: QQSearchSong): QQMusicSong | null {
  const id = song.songmid || song.mid;
  if (!id) return null;
  const albumMid = song.albummid || song.album?.mid || '';
  return {
    id,
    mediaId: song.strMediaMid || id,
    name: stripHtml(song.songname || song.title || song.name || ''),
    artist: (song.singer || []).map(item => item.name).filter(Boolean).join(' / ') || 'Unknown',
    album: song.albumname || song.album?.name || '',
    coverUrl: albumMid ? buildCoverUrl(albumMid) : '',
  };
}

function buildCoverUrl(albumMid: string): string {
  return `https://y.qq.com/music/photo_new/T002R300x300M000${albumMid}.jpg`;
}

function decodeBase64(value: string): string {
  if (!value) return '';
  return Buffer.from(value, 'base64').toString('utf8');
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
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
