const EMOTION_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  开心: { bg: '#F8E7C8', text: '#8A5F22', border: '#EBCF9E' },
  难过: { bg: '#DDEBF7', text: '#466A86', border: '#C5D9EA' },
  焦虑: { bg: '#F1DDD6', text: '#865A4F', border: '#E3C3B8' },
  平静: { bg: '#DDE9E2', text: '#49695B', border: '#C4D7CC' },
  期待: { bg: '#E9E0F3', text: '#665480', border: '#D4C4E7' },
  愤怒: { bg: '#F3D8D4', text: '#8A4F48', border: '#E2BAB4' },
  孤独: { bg: '#DDE1F0', text: '#515D82', border: '#C4CAE3' },
  兴奋: { bg: '#F9E0C9', text: '#8A6335', border: '#EDC8A4' },
  疲惫: { bg: '#E4E1D7', text: '#676150', border: '#D2CDBE' },
  感恩: { bg: '#E7E1CF', text: '#6F6242', border: '#D5C9A9' },
};

const DEFAULT_STYLE = { bg: '#F0EEEB', text: '#6B6258', border: '#E2DDD5' };

export function getEmotionBg(emotion: string): string {
  return (EMOTION_STYLES[emotion] || DEFAULT_STYLE).bg;
}

export function getEmotionText(emotion: string): string {
  return (EMOTION_STYLES[emotion] || DEFAULT_STYLE).text;
}

export function getEmotionBorder(emotion: string): string {
  return (EMOTION_STYLES[emotion] || DEFAULT_STYLE).border;
}
