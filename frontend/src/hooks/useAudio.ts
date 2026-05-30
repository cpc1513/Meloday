import { useRef, useCallback } from 'react';

let globalAudio: HTMLAudioElement | null = null;

function getGlobalAudio(): HTMLAudioElement {
  if (!globalAudio) {
    globalAudio = new Audio();
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

  const play = useCallback((url: string, timeoutMs = 15000): Promise<HTMLAudioElement> => {
    const audio = getAudio();

    return new Promise((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('playing', onPlaying);
        audio.removeEventListener('error', onError);
      };

      const settleResolve = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(audio);
      };

      const settleReject = (err: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      };

      const timeoutId = window.setTimeout(() => {
        audio.pause();
        settleReject(new Error('QQ 音乐音频加载超时，请检查网络、代理或防火墙'));
      }, timeoutMs);

      const onCanPlay = () => {
        audio.play()
          .then(() => settleResolve())
          .catch(err => {
            settleReject(new Error(getPlaybackErrorMessage(err)));
          });
      };

      const onPlaying = () => {
        settleResolve();
      };

      const onError = () => {
        const err = audio.error;
        let msg = 'QQ 音乐音频加载失败';
        if (err) {
          switch (err.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              msg = '播放被中断';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              msg = '网络错误，无法加载 QQ 音乐音频';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              msg = '音频解码失败';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              msg = '音频格式或来源不受支持';
              break;
          }
        }
        settleReject(new Error(msg));
      };

      audio.addEventListener('canplay', onCanPlay);
      audio.addEventListener('canplaythrough', onCanPlay);
      audio.addEventListener('playing', onPlaying);
      audio.addEventListener('error', onError);

      if (audio.src === url && audio.readyState >= 3) {
        audio.play()
          .then(() => settleResolve())
          .catch(err => {
            settleReject(new Error(getPlaybackErrorMessage(err)));
          });
        return;
      }

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

function getPlaybackErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err || '');
  if (message.includes('NotAllowedError')) {
    return '系统阻止了自动播放，请手动点击播放按钮重试';
  }
  if (message.includes('NotSupportedError')) {
    return 'QQ 音乐音频格式或来源不受支持';
  }
  return message || 'QQ 音乐音频播放失败';
}
