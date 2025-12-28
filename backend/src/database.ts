import Database from 'better-sqlite3';

interface CachedVideo {
  time: string;
  video_id: string;
  video_url: string;
  title: string;
  view_count: number;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

const dbPath = process.env.DB_PATH || './cache.db';
const db = new Database(dbPath);

db.exec(`CREATE TABLE IF NOT EXISTS video_cache (
  time TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  video_url TEXT NOT NULL,
  title TEXT NOT NULL,
  view_count INTEGER,
  thumbnail_url TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);`);

// Migration: Add thumbnail_url column to existing tables
try {
  db.exec(`ALTER TABLE video_cache ADD COLUMN thumbnail_url TEXT;`);
} catch (error: any) {
  // Column already exists, ignore error
  if (!error.message?.includes('duplicate column name')) {
    console.error('Migration error:', error);
  }
}

export function getCachedVideo(time: string): CachedVideo | undefined {
  return db.prepare('SELECT * FROM video_cache WHERE time = ?').get(time) as CachedVideo | undefined;
}

export function setCachedVideo(entry: {
  time: string,
  video_id: string,
  video_url: string,
  title: string,
  view_count: number,
  thumbnail_url?: string | null,
}) {
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO video_cache (time, video_id, video_url, title, view_count, thumbnail_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(time) DO UPDATE SET video_id=excluded.video_id, video_url=excluded.video_url, title=excluded.title, view_count=excluded.view_count, thumbnail_url=excluded.thumbnail_url, updated_at=excluded.updated_at`
  ).run(entry.time, entry.video_id, entry.video_url, entry.title, entry.view_count, entry.thumbnail_url || null, now, now);
}

export function getCacheCount(): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM video_cache').get() as { count: number };
  return result.count;
}

export function evictOldestCache() {
  db.prepare('DELETE FROM video_cache WHERE time IN (SELECT time FROM video_cache ORDER BY created_at ASC LIMIT 1)').run();
}

export function getCachedVideosInRange(startTime: string, endTime: string, limit: number = 1440): CachedVideo[] {
  // Check if range crosses midnight
  if (startTime > endTime) {
    // Get times from startTime to 23:59 AND 00:00 to endTime
    return db.prepare(`
      SELECT * FROM video_cache
      WHERE time >= ? OR time <= ?
      ORDER BY time ASC
      LIMIT ?
    `).all(startTime, endTime, limit) as CachedVideo[];
  }
  
  // Normal case: no midnight crossing
  return db.prepare(`
    SELECT * FROM video_cache
    WHERE time >= ? AND time <= ?
    ORDER BY time ASC
    LIMIT ?
  `).all(startTime, endTime, limit) as CachedVideo[];
}

export function getAllCachedVideos(limit: number = 1440, offset: number = 0): CachedVideo[] {
  return db.prepare(`
    SELECT * FROM video_cache
    ORDER BY time ASC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as CachedVideo[];
}
