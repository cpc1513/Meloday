import { useRef, useCallback } from 'react';

// 模块级单例，确保全应用只有一个 Audio 实例
let globalAudio: HTMLAudioElement | null = null;

function getGlobalAudio(): HTMLAudioElement {
  if (!globalAudio) {
    globalAudio = new Audio();
    // 允许跨域音频加载（CORS）
    globalAudio.crossOrigin = 'anonymous';
    globalAudio.preload = 'auto';
  }
  return globalAudio;
}

export interface AudioError {
  code: number;
  message: string;
}

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getAudio = useCallback(() => {
    const audio = getGlobalAudio();
    audioRef.current = audio;
    return audio;
  }, []);

  /** 播放指定 URL，返回 Promise，失败时 reject */
  const play = useCallback((url: string): Promise<HTMLAudioElement> => {
    const audio = getAudio();

    return new Promise((resolve, reject) => {
      const onCanPlay = () => {
        cleanup();
        audio.play()
          .then(() => resolve(audio))
          .catch(err => reject(err));
      };

      const onError = () => {
        cleanup();
        const err = audio.error;
        let msg = '音频加载失败';
        if (err) {
          switch (err.code) {
            case MediaError.MEDIA_ERR_ABORTED: msg = '播放被中断'; break;
            case MediaError.MEDIA_ERR_NETWORK: msg = '网络错误，无法加载音频'; break;
            case MediaError.MEDIA_ERR_DECODE: msg = '音频解码失败'; break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: msg = '音频格式或来源不受支持'; break;
          }
        }
        reject(new Error(msg));
      };

      const cleanup = () => {
        audio.oncanplay = null;
        audio.oncanplaythrough = null;
        audio.onerror = null;
      };

      audio.oncanplay = onCanPlay;
      audio.oncanplaythrough = onCanPlay;
      audio.onerror = onError;

      // 如果 src 没变且已经加载好了，直接播放
      if (audio.src === url && audio.readyState >= 3) {
        audio.play()
          .then(() => resolve(audio))
          .catch(reject);
        return;
      }

      // 否则重新加载
      audio.pause();
      audio.src = url;
      audio.load();
    });
  }, [getAudio]);

  const pause = useCallback(() => {
    getAudio().pause();
  }, [getAudio]);

  const resume = useCallback((): Promise<void> => {
    return getAudio().play();
  }, [getAudio]);

  const seek = useCallback((time: number) => {
    const audio = getAudio();
    audio.currentTime = time;
  }, [getAudio]);

  const setVolume = useCallback((vol: number) => {
    getAudio().volume = vol;
  }, [getAudio]);

  return { audioRef, play, pause, resume, seek, setVolume };
}
