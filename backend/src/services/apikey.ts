import crypto from 'crypto';
import { get, run } from '../db.js';

const LEGACY_GENERATION_LIMIT = 365;
const KEY_GENERATION_COUNT = 'generation_count';
const KEY_USER_API_KEY = 'user_api_key';
const KEY_DEVICE_ID = 'device_id';

let initialized = false;

export async function initApiKey(): Promise<void> {
  if (initialized) return;
  initialized = true;
  await getOrCreateDeviceId();
}

export async function getUserApiKey(): Promise<string | null> {
  return queryUserApiKey();
}

export async function getGenerationInfo(): Promise<{
  generationCount: number;
  generationLimit: number;
  hasUserKey: boolean;
  hasProxyToken: boolean;
  deviceId: string;
}> {
  return {
    generationCount: await getLegacyGenerationCount(),
    generationLimit: LEGACY_GENERATION_LIMIT,
    hasUserKey: !!(await queryUserApiKey()),
    hasProxyToken: false,
    deviceId: await getOrCreateDeviceId(),
  };
}

export async function setUserApiKey(apiKey: string): Promise<void> {
  const row = await get<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [KEY_USER_API_KEY]
  );
  if (row) {
    await run('UPDATE settings SET value = ? WHERE key = ?', [
      apiKey,
      KEY_USER_API_KEY,
    ]);
  } else {
    await run('INSERT INTO settings (key, value) VALUES (?, ?)', [
      KEY_USER_API_KEY,
      apiKey,
    ]);
  }
}

export async function deleteUserApiKey(): Promise<void> {
  await run('DELETE FROM settings WHERE key = ?', [KEY_USER_API_KEY]);
}

export async function getOrCreateDeviceId(): Promise<string> {
  const row = await get<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [KEY_DEVICE_ID]
  );
  if (row?.value) return row.value;

  const deviceId = crypto.randomUUID();
  await run('INSERT INTO settings (key, value) VALUES (?, ?)', [
    KEY_DEVICE_ID,
    deviceId,
  ]);
  return deviceId;
}

async function getLegacyGenerationCount(): Promise<number> {
  const row = await get<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [KEY_GENERATION_COUNT]
  );
  return row ? parseInt(row.value, 10) : 0;
}

async function queryUserApiKey(): Promise<string | null> {
  const row = await get<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [KEY_USER_API_KEY]
  );
  return row?.value || null;
}
