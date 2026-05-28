const EMOTION_BG: Record<string, string> = {
  '开心': '#F5E6D3',
  '难过': '#D4E5ED',
  '焦虑': '#E8DED4',
  '平静': '#DED4E2',
  '期待': '#E2DDD4',
  '愤怒': '#D4E2D4',
  '孤独': '#D0D4E2',
  '兴奋': '#F0E6D8',
  '疲惫': '#E0E0D8',
  '感恩': '#E8E0D4'
};

const EMOTION_TEXT: Record<string, string> = {
  '开心': '#8B6B4A',
  '难过': '#4A6B8B',
  '焦虑': '#6B5B4F',
  '平静': '#5B4F6B',
  '期待': '#6B5B4F',
  '愤怒': '#4F6B4F',
  '孤独': '#4F4F6B',
  '兴奋': '#7B6B4A',
  '疲惫': '#5B5B4F',
  '感恩': '#6B5B4F'
};

export function getEmotionBg(emotion: string): string {
  return EMOTION_BG[emotion] || '#F0EEEB';
}

export function getEmotionText(emotion: string): string {
  return EMOTION_TEXT[emotion] || '#6B5B4F';
}
