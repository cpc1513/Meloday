import axios from 'axios';

export const CLOUD_AI_BASE_URL = (
  process.env.MELODAY_CLOUD_AI_URL || 'https://www.cpc1.asia/api/meloday'
).replace(/\/+$/, '');

export interface CloudAiStatus {
  ok: boolean;
  service?: string;
  hasDeepSeekKey?: boolean;
  generationLimit?: number;
  generationCount?: number;
  generationLeft?: number;
  message?: string;
  time?: string;
}

export async function getCloudAiStatus(deviceId: string): Promise<CloudAiStatus | null> {
  try {
    const res = await axios.get(`${CLOUD_AI_BASE_URL}/status`, {
      params: { deviceId },
      timeout: 12000,
    });
    return res.data;
  } catch (err) {
    console.error('Cloud AI status failed:', err);
    return null;
  }
}

export async function postCloudChatCompletion(
  deviceId: string,
  payload: unknown
): Promise<any> {
  const res = await axios.post(`${CLOUD_AI_BASE_URL}/chat`, {
    deviceId,
    ...(payload as Record<string, unknown>),
  }, {
    timeout: 60000,
  });
  return res.data;
}
