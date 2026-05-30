import { get, run } from "../db.js";

const GENERATION_LIMIT = 100;
const KEY_GENERATION_COUNT = "generation_count";
const KEY_USER_API_KEY = "user_api_key";

let bundledApiKey: string | null = null;
let initialized = false;

/**
 * Called once at startup. Checks for a bundled key (from env) and
 * a user-configured key (from the DB).
 */
export async function initApiKey(): Promise<void> {
  if (initialized) return;
  initialized = true;

  // Bundled key comes from Electron via BUNDLED_DEEPSEEK_API_KEY env var
  bundledApiKey = process.env.BUNDLED_DEEPSEEK_API_KEY || null;
}

/**
 * Returns the effective API key, respecting user key priority
 * and generation quotas. Throws if no key is available.
 */
export async function getEffectiveApiKey(): Promise<string | null> {
  // 1. Check for user-configured key in DB
  const userKey = await queryUserApiKey();
  if (userKey) return userKey;

  // 2. Check bundled key with generation limit
  if (bundledApiKey) {
    const count = await getGenerationCount();
    if (count < GENERATION_LIMIT) {
      return bundledApiKey;
    }
  }

  return null;
}

export async function getGenerationInfo(): Promise<{
  generationCount: number;
  generationLimit: number;
  hasUserKey: boolean;
  hasBundledKey: boolean;
}> {
  return {
    generationCount: await getGenerationCount(),
    generationLimit: GENERATION_LIMIT,
    hasUserKey: !!(await queryUserApiKey()),
    hasBundledKey: !!bundledApiKey,
  };
}

/**
 * Increment the generation counter. Only counts when using the bundled key.
 */
export async function incrementGenerationCount(): Promise<void> {
  const row = await get<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [KEY_GENERATION_COUNT]
  );
  const current = row ? parseInt(row.value, 10) : 0;
  const next = current + 1;
  if (row) {
    await run("UPDATE settings SET value = ? WHERE key = ?", [
      String(next),
      KEY_GENERATION_COUNT,
    ]);
  } else {
    await run("INSERT INTO settings (key, value) VALUES (?, ?)", [
      KEY_GENERATION_COUNT,
      String(next),
    ]);
  }
}

/**
 * Store or update the user-customized API key.
 */
export async function setUserApiKey(apiKey: string): Promise<void> {
  const row = await get<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [KEY_USER_API_KEY]
  );
  if (row) {
    await run("UPDATE settings SET value = ? WHERE key = ?", [
      apiKey,
      KEY_USER_API_KEY,
    ]);
  } else {
    await run("INSERT INTO settings (key, value) VALUES (?, ?)", [
      KEY_USER_API_KEY,
      apiKey,
    ]);
  }
}

async function getGenerationCount(): Promise<number> {
  const row = await get<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [KEY_GENERATION_COUNT]
  );
  return row ? parseInt(row.value, 10) : 0;
}

async function queryUserApiKey(): Promise<string | null> {
  const row = await get<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [KEY_USER_API_KEY]
  );
  return row?.value || null;
}
