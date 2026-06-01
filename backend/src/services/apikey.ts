import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { get, run } from '../db.js';

const GENERATION_LIMIT = 365;
const KEY_GENERATION_COUNT = 'generation_count';
const KEY_USER_API_KEY = 'user_api_key';
const KEY_DEVICE_ID = 'device_id';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let proxyToken: string | null = null;
let initialized = false;

export async function initApiKey(): Promise<void> {
  if (initialized) return;
  initialized = true;
  proxyToken = process.env.MELODAY_PROXY_TOKEN || readLocalProxyToken();
  await getOrCreateDeviceId();
}

export async function getUserApiKey(): Promise<string | null> {
  return queryUserApiKey();
}

export function getProxyToken(): string | null {
  return proxyToken;
}

export async function canUseProxyQuota(): Promise<boolean> {
  if (!proxyToken) return false;
  const userKey = await queryUserApiKey();
  if (userKey) return false;
  return (await getGenerationCount()) < GENERATION_LIMIT;
}

export async function getGenerationInfo(): Promise<{
  generationCount: number;
  generationLimit: number;
  hasUserKey: boolean;
  hasProxyToken: boolean;
}> {
  return {
    generationCount: await getGenerationCount(),
    generationLimit: GENERATION_LIMIT,
    hasUserKey: !!(await queryUserApiKey()),
    hasProxyToken: !!proxyToken,
  };
}

export async function incrementGenerationCountIfProxy(): Promise<void> {
  const userKey = await queryUserApiKey();
  if (userKey || !proxyToken) return;

  const row = await get<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [KEY_GENERATION_COUNT]
  );
  const current = row ? parseInt(row.value, 10) : 0;
  const next = current + 1;
  if (row) {
    await run('UPDATE settings SET value = ? WHERE key = ?', [
      String(next),
      KEY_GENERATION_COUNT,
    ]);
  } else {
    await run('INSERT INTO settings (key, value) VALUES (?, ?)', [
      KEY_GENERATION_COUNT,
      String(next),
    ]);
  }
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

async function getGenerationCount(): Promise<number> {
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

function readLocalProxyToken(): string | null {
  const candidates = [
    path.join(__dirname, '..', '..', 'proxy-token.txt'),
    path.join(process.cwd(), 'proxy-token.txt'),
    path.join(process.cwd(), 'backend', 'proxy-token.txt'),
  ];

  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const token = fs.readFileSync(file, 'utf8').trim();
      if (token) return token;
    } catch {
      // Ignore unreadable optional token files and continue without bundled quota.
    }
  }

  return null;
}
