import { useState } from 'react';
import type { Song } from '../types';

interface Props {
  song: Song | null | undefined;
  size: number;
}

export default function CoverImage({ song, size }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const radius = size > 50 ? 14 : 10;
  const coverUrl = song?.cover_url || '';

  if (!song || !coverUrl || failedUrl === coverUrl) {
    return (
      <div
        aria-label={song?.name ? `${song.name} 默认封面` : '默认封面'}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: getGradient(song?.name || ''),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size > 50 ? 26 : 13,
          fontWeight: 760,
          color: '#fff',
          flexShrink: 0,
          boxShadow: size > 50 ? '0 18px 32px rgba(37,35,31,0.16)' : 'none',
        }}
      >
        ♪
      </div>
    );
  }

  return (
    <img
      src={coverUrl}
      alt={song.name}
      onError={() => setFailedUrl(coverUrl)}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        objectFit: 'cover',
        flexShrink: 0,
        boxShadow: size > 50 ? '0 18px 32px rgba(37,35,31,0.16)' : 'none',
      }}
    />
  );
}

function getGradient(name: string): string {
  const hues = [18, 42, 150, 204, 262, 336];
  const hue = hues[name.length % hues.length];
  return `linear-gradient(135deg, hsl(${hue}, 42%, 64%), hsl(${hue + 24}, 34%, 38%))`;
}
