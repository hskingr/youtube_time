import axios from 'axios';
import fs from 'fs';

interface SearchResult {
  videoId: string;
  videoUrl: string;
  title: string;
  viewCount: number;
  thumbnailUrl?: string | undefined;
}

interface YouTubeSearchItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    thumbnails?: {
      default?: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
    };
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
  const hour = parseInt(hours);
  const minuteStr = minutes;

  const variants: string[] = [];

  // 12-hour formats
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const ampmLower = ampm.toLowerCase();

  const hour12Str = hour12.toString();
  const hour12PaddedStr = hour12.toString().padStart(2, '0');

  // Common 12-hour variants
  variants.push(`${hour12Str}:${minuteStr} ${ampm}`);        // "7:34 PM"
  variants.push(`${hour12Str}:${minuteStr} ${ampmLower}`);   // "7:34 pm"
  variants.push(`${hour12Str}:${minuteStr}${ampm}`);         // "7:34PM"
  variants.push(`${hour12Str}:${minuteStr}${ampmLower}`);    // "7:34pm"
  variants.push(`${hour12PaddedStr}:${minuteStr}${ampmLower}`); // "07:34pm"
  variants.push(`${hour12Str}:${minuteStr} ${ampm.charAt(0)}.${ampm.charAt(1)}.`); // "7:34 P.M."

  return [...new Set(variants)];
}

function validateTimeInTitle(title: string): boolean {
  const strictTimeRegex = /(?<!\d)(\d{1,2}):(\d{2})(?!:\d{2})\s*(AM|am|pm|PM|a\.m\.|p\.m\.)/gi;
  const matches = title.match(strictTimeRegex);
  return matches !== null && matches.length === 1;
}

interface YoutubeApiParams {
  key?: string;
  part?: string;
  q?: string;
  maxResults?: number;
  order?: string;
  type?: string;
  videoEmbeddable?: string;
  videoSyndicated?: string;
  safeSearch?: string;
  [key: string]: string | number | undefined;
}

export async function makeYouTubeApiRequest(
  endpoint: string,
  params: YoutubeApiParams
): Promise<any> {
  const response = await axios.get(`https://www.googleapis.com/youtube/v3/${endpoint}`, {
    params: {
      ...params,
    },
  });

  return response;
}

function buildSearchQuery(variants: string[]): string {
  const baseQuery = variants.map(v => `"${v}"`).join(' | ');
  const monthExclusions = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const exclusionTokens = monthExclusions.map(month => `-${month}`).join(' ');
  return `${baseQuery} ${exclusionTokens}`.trim();
}

async function searchWithYouTube(time: string): Promise<SearchResult | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn('YouTube API key not configured');
    return null;
  }

  const variants = generateTimeVariants(time);
  const query = buildSearchQuery(variants);

  const params = {
    key: apiKey,
    part: 'snippet',
    q: query,
    maxResults: 50,
    type: 'video',
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    safeSearch: 'moderate',
    publishedBefore: '2015-01-01T00:00:00Z'
  };

  try {
    const response = await makeYouTubeApiRequest('search', params as YoutubeApiParams);

    const data = response.data as YouTubeResponse;

    if (!data.items || data.items.length === 0) return null;

    const filtered = data.items.filter((item: YouTubeSearchItem) =>
      validateTimeInTitle(item.snippet.title)
    );

    if (filtered.length === 0) return null;

    // save all api calls for development purposes
    if (process.env.NODE_ENV !== 'production') {
      fs.writeFileSync(`./data/${time.replace(/[: ]/g, '_')}_youtube_search.json`, JSON.stringify(response.data, null, 2));
    }

    const validFilteredVideos = filtered.filter(async (item: YouTubeSearchItem) => {
      const videoId = item.id.videoId;
      return await verifyVideoAvailable(videoId, apiKey);
    });

    // Pick a random video from the valid filtered list
    if (validFilteredVideos.length > 0) {
      const randomIndex = Math.floor(Math.random() * validFilteredVideos.length);
      const selected = validFilteredVideos[randomIndex];

      if (!selected) return null;

      return {
        videoId: selected.id.videoId,
        videoUrl: `https://www.youtube.com/watch?v=${selected.id.videoId}`,
        title: selected.snippet.title,
        viewCount: 0, // View count can be fetched separately if needed
        thumbnailUrl: selected.snippet.thumbnails?.high?.url || selected.snippet.thumbnails?.medium?.url || selected.snippet.thumbnails?.default?.url
      } as SearchResult;
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
  return await searchWithYouTube(time);
}

