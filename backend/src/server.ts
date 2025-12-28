import type { Request, Response } from 'express';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { getCachedVideo, setCachedVideo, getCacheCount, evictOldestCache, getCachedVideosInRange, getAllCachedVideos } from './database.js';
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
      view_count: result.viewCount,
      thumbnail_url: result.thumbnailUrl ?? null
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

// Helper function to generate time range (±range minutes around center time)
export function generateTimeRange(centerTime: string, range: number): { start: string; end: string } {
  let [hours, minutes] = centerTime.split(':').map(Number);

  typeof hours !== 'number' ? hours = 0 : null;
  typeof minutes !== 'number' ? minutes = 0 : null;

  const centerMinutes = hours * 60 + minutes;

  const startMinutes = (centerMinutes - range + 1440) % 1440;
  const endMinutes = (centerMinutes + range) % 1440;

  let amountOfMinutes = endMinutes - startMinutes;
  if (amountOfMinutes < 0) {
    amountOfMinutes += 1440;
  }

  const startH = Math.floor(startMinutes / 60);
  const startM = startMinutes % 60;
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;


  return {
    start: `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`,
    end: `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
  };
}

app.get('/videos', (req: Request, res: Response) => {
  try {
    const time = req.query.time as string | undefined;
    const rangeParam = req.query.range as string | undefined;
    // const limitParam = req.query.limit as string | undefined;
    const pageParam = req.query.page as string | undefined;

    const page = pageParam ? parseInt(pageParam) : 1;
    const range = rangeParam ? parseInt(rangeParam) : 30;
    // limit should be the range
    const limit = rangeParam ? parseInt(rangeParam) : 60;

    let videos;

    if (!time) {
      console.error('Time parameter is required');
      return res.status(400).json({ error: 'Time parameter is required' });
    }

    // Time-based range query
    const { start, end } = generateTimeRange(time, range);
    videos = getCachedVideosInRange(start, end, limit);

    // Create a map of cached videos by time
    const videoMap = new Map(videos.map(v => [v.time, v]));

    const [hours, minutes] = time.split(':').map(Number);

    if (typeof hours !== 'number' || typeof minutes !== 'number') {
      console.error('Invalid time format');
      return res.status(400).json({ error: 'Invalid time format' });
    }

    const offset = (page - 1) * range;

    const centerMinutes = (hours * 60 + minutes + offset) % 1440;
    const startMinutes = (centerMinutes - range + 1440 + offset) % 1440;

    const timesInRange: string[] = [];
    const response: any[] = [];

    for (let i = 0; i < range * 2; i++) {
      const time = (startMinutes + i) % 1440;
      const h = Math.floor(time / 60).toString().padStart(2, '0');
      const m = (time % 60).toString().padStart(2, '0');
      timesInRange.push(`${h}:${m}`);

      const formattedTime = `${h}:${m}`;

      response.push(videoMap.has(formattedTime) ? {
        time: formattedTime,
        videoId: videoMap.get(formattedTime)!.video_id,
        videoUrl: videoMap.get(formattedTime)!.video_url,
        title: videoMap.get(formattedTime)!.title,
        viewCount: videoMap.get(formattedTime)!.view_count,
        thumbnailUrl: videoMap.get(formattedTime)!.thumbnail_url,
        cached: true
      } : {
        time: formattedTime,
        videoId: null,
        videoUrl: null,
        title: null,
        viewCount: null,
        thumbnailUrl: null,
        cached: false
      });
    }

    res.json({
      videos: response,
      total: response.length,
      page: page,
      limit: limit,
      centerTime: time || null
    });
  } catch (error) {
    console.error('Error in /videos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
