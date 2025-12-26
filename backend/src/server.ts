import type { Request, Response } from 'express';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { getCachedVideo, setCachedVideo, getCacheCount, evictOldestCache } from './database.js';
import { searchForTimeVideo } from './search.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(cors());

function getCurrentTimeHHMM(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

interface VideoResponse {
  videoId: string;
  videoUrl: string;
  title: string;
  viewCount: number;
  timestamp: string;
}

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'YouTube Time Video API',
    endpoints: ['/api/video'],
    usage: '/api/video?time=HH:MM'
  });

});

app.get('/video', async (req: Request, res: Response) => {
  try {
    // query string 'time' in HH:MM format
    const queryTime = req.query.time as string | undefined;
    const querySkipCache = req.query.skipCache;

    const skipCache = querySkipCache === 'true' ? true : false;
    const time = queryTime || getCurrentTimeHHMM();


    const cached = skipCache ? null : getCachedVideo(time);
    const now = new Date();

    if (cached) {
      const updated = new Date(cached.updated_at);
      const days = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
      if (days < 7) {
        return res.json({
          videoId: cached.video_id,
          videoUrl: cached.video_url,
          title: cached.title,
          viewCount: cached.view_count,
          timestamp: cached.updated_at
        } as VideoResponse);
      }
    }

    const result = await searchForTimeVideo(time);
    if (!result) {
      return res.status(404).json({ error: 'No video found for this time' });
    }

    setCachedVideo({
      time,
      video_id: result.videoId,
      video_url: result.videoUrl,
      title: result.title,
      view_count: result.viewCount
    });

    while (getCacheCount() > 1440) {
      evictOldestCache();
    }

    res.json({
      ...result,
      timestamp: new Date().toISOString()
    } as VideoResponse);
  } catch (error) {
    console.error('Error in /api/video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
