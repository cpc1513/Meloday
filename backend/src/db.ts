import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'meloday.db');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

export function run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

export function all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export function initDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        emotions TEXT,
        is_favorite INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id INTEGER NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playlist_id INTEGER NOT NULL,
        position INTEGER NOT NULL,
        name TEXT NOT NULL,
        artist TEXT NOT NULL,
        album TEXT,
        cover_url TEXT,
        music_source TEXT DEFAULT 'qq',
        source_id TEXT,
        media_id TEXT,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS plays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id INTEGER NOT NULL,
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        duration INTEGER,
        FOREIGN KEY (song_id) REFERENCES songs(id)
      );

      CREATE TABLE IF NOT EXISTS lyrics_cache (
        source_id TEXT PRIMARY KEY,
        raw_lyrics TEXT,
        parsed_lyrics TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `, (err) => {
      if (err) reject(err);
      else {
        db.run('ALTER TABLE entries ADD COLUMN is_favorite INTEGER DEFAULT 0', () => {
          db.run("ALTER TABLE songs ADD COLUMN music_source TEXT DEFAULT 'qq'", () => {
            db.run('ALTER TABLE songs ADD COLUMN source_id TEXT', () => {
              db.run('ALTER TABLE songs ADD COLUMN media_id TEXT', () => {
                db.all("PRAGMA table_info('lyrics_cache')", (_infoErr, rows: any[]) => {
                  const hasSourceId = rows?.some(row => row.name === 'source_id');
                  if (hasSourceId) return resolve();
                  db.serialize(() => {
                    db.run('DROP TABLE IF EXISTS lyrics_cache');
                    db.run(`
                      CREATE TABLE lyrics_cache (
                        source_id TEXT PRIMARY KEY,
                        raw_lyrics TEXT,
                        parsed_lyrics TEXT,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                      )
                    `, () => resolve());
                  });
                });
              });
            });
          });
        });
      }
    });
  });
}

export default db;
