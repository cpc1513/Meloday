import { useState } from 'react';
import type { Song } from '../types';

interface Props {
  song: Song | null | undefined;
  size: number;
}

export default function CoverImage({ song, size }: Props) {
  const [error, setError] = useState(false);
  const initial = song?.name?.[0] || '♪';
  const radius = size > 50 ? 14 : 10;

  if (!song || error || !song.cover_url) {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: getGradient(song?.name || ''),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size > 50 ? 28 : 14,
        fontWeight: 760,
        color: '#fff',
        flexShrink: 0,
        boxShadow: size > 50 ? '0 18px 32px rgba(37,35,31,0.16)' : 'none',
      }}>
        {initial}
      </div>
    );
  }

  return (
    <img
      src={song.cover_url}
      alt={song.name}
      onError={() => setError(true)}
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
  const hues = [20, 42, 154, 204, 262, 340];
  const hue = hues[name.length % hues.length];
  return `linear-gradient(135deg, hsl(${hue}, 42%, 62%), hsl(${hue + 24}, 34%, 38%))`;
}
