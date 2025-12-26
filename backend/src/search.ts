import axios from 'axios';
import fs from 'fs';

interface SearchResult {
  videoId: string;
  videoUrl: string;
  title: string;
  viewCount: number;
}

interface YouTubeSearchItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
  };
}

interface YouTubeResponse {
  items: YouTubeSearchItem[];
}

interface YouTubeVideoItem {
  id: string;
  status: {
    embeddable: boolean;
    privacyStatus: string;
  };
  contentDetails?: {
    regionRestriction?: {
      blocked?: string[];
    };
  };
}

interface YouTubeVideosResponse {
  items: YouTubeVideoItem[];
}

function generateTimeVariants(time: string): string[] {
  const parts = time.split(':');
  const hours = parts[0] || '00';
  const minutes = parts[1] || '00';
  const h = parseInt(hours);
  const m = minutes;

  const variants: string[] = [
  ];

  if (h > 12) {
    const h12 = h - 12;
    variants.push(`${h12}:${minutes} PM`);
    variants.push(`${h12}:${minutes}PM`);
  } else if (h === 0) {
    variants.push(`12:${minutes} AM`);
    variants.push(`12:${minutes}AM`);
  } else if (h < 12) {
    variants.push(`${h}:${minutes} AM`);
    variants.push(`${h}:${minutes}AM`);
  } else {
    variants.push(`${h}:${minutes} PM`);
    variants.push(`${h}:${minutes}PM`);
  }

  return [...new Set(variants)];
}

function extractTimeFromTitle(title: string, targetTime: string): boolean {
  const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?|\d{1,2}\.\d{2}|\d{4}/g;
  const matches = title.match(timeRegex) || [];
  return matches.some(match => match.includes(targetTime.substring(0, 5)));
}

async function searchWithYouTube(query: string): Promise<SearchResult | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn('YouTube API key not configured');
    return null;
  }

  /* GET https://youtube.googleapis.com/youtube/v3/search?q=12%3A41&key=[YOUR_API_KEY] HTTP/1.1

Authorization: Bearer [YOUR_ACCESS_TOKEN]
Accept: application/json
 */
  try {
    const response = await axios.get<YouTubeResponse>('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: apiKey,
        part: 'snippet',
        q: query,
        maxResults: 50,
        order: 'viewCount',
        type: 'video',
        videoEmbeddable: 'true',
        videoSyndicated: 'true',
        safeSearch: 'moderate'
      }
    });

    if (!response.data.items || response.data.items.length === 0) return null;

    const filtered = response.data.items.filter(item =>
      extractTimeFromTitle(item.snippet.title, query)
    );

    if (filtered.length === 0) return null;

    // save all api calls for development purposes
    if (process.env.NODE_ENV !== 'production') {
      fs.writeFileSync(`./data/${query.replace(/[: ]/g, '_')}_youtube_search.json`, JSON.stringify(response.data, null, 2));
    }

    // Verify videos are actually available and embeddable
    for (const item of filtered) {
      const videoId = item.id.videoId;
      const isValid = await verifyVideoAvailable(videoId, apiKey);

      if (isValid) {
        return {
          videoId,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          title: item.snippet.title,
          viewCount: 0
        };
      }
    }

    return null;
  } catch (error) {
    console.error('YouTube search error:', error);
    return null;
  }
}

async function verifyVideoAvailable(videoId: string, apiKey: string): Promise<boolean> {
  try {
    const response = await axios.get<YouTubeVideosResponse>('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        key: apiKey,
        part: 'status,contentDetails',
        id: videoId
      }
    });

    if (!response.data.items || response.data.items.length === 0) return false;

    const video = response.data.items[0];
    if (!video) return false;

    // Check if video is public and embeddable
    if (video.status.privacyStatus !== 'public') return false;
    if (!video.status.embeddable) return false;

    return true;
  } catch (error) {
    console.error(`Error verifying video ${videoId}:`, error);
    return false;
  }
}

export async function searchForTimeVideo(time: string): Promise<SearchResult | null> {
  const variants = generateTimeVariants(time);

  for (const variant of variants) {
    const youtubeResult = await searchWithYouTube(variant);
    if (youtubeResult) return youtubeResult;
  }

  return null;
}

