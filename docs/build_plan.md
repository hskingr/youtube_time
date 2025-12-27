# Build Plan - YouTube Time Matcher

**Status**: ✅ Complete (core implementation done)

This document serves as a reference for the project architecture and implementation strategy. The codebase has evolved since initial planning; see [README.md](../README.md) and [QUICKSTART.md](QUICKSTART.md) for current setup. The current app uses **YouTube Data API only** (no Custom Search), and some file names mentioned below (e.g., cache.ts, fuzzy-matcher.js) were part of earlier iterations.

## Overview

A minimal web app showing a YouTube video matching the current time.

**Key Features:**
- Single-page frontend (no build step)
- TypeScript/Express backend with SQLite caching
- YouTube Data API v3 (only provider)
- 7-day cache TTL, 1,440 max entries (per-minute granularity)

## Google API Setup & Authentication

### Prerequisites
You'll need a Google Cloud Platform account to access both the YouTube Data API and Google Custom Search API.

### Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Name your project (e.g., "youtube-time-matcher")
4. Click **"Create"**
5. Wait for project creation, then select it from the project dropdown

### Step 2: Enable YouTube Data API v3
1. In the Google Cloud Console, navigate to **"APIs & Services"** → **"Library"**
2. Search for **"YouTube Data API v3"**
3. Click on it, then click **"Enable"**
4. Wait for the API to be enabled (takes a few seconds)

### Step 3: Create YouTube API Key
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"API Key"**
3. A dialog shows your new API key - **copy it immediately**
4. Click **"Edit API key"** to restrict it (recommended for security)
5. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Check only **"YouTube Data API v3"**
6. Under **"Application restrictions"** (optional but recommended):
   - For development: Choose **"HTTP referrers"** and add `localhost:*`
   - For production: Add your actual domain(s)
   - Or choose **"IP addresses"** and add your server's IP
7. Click **"Save"**
8. Store this key as `YOUTUBE_API_KEY` in your `.env` file

### Step 4: Set Up Google Custom Search Engine (CSE)
1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/controlpanel/all)
2. Click **"Add"** to create a new search engine
3. Configure the search engine:
   - **Name**: "YouTube Time Search"
   - **What to search**: Select **"Search specific sites or pages"**
   - **Sites to search**: Add these:
     - `www.youtube.com/*`
     - `youtube.com/*`
     - `m.youtube.com/*`
   - **Language**: Your preferred language
4. Click **"Create"**
5. On the next page, note your **Search engine ID** (looks like: `a1b2c3d4e5f6g7h8i`)
6. Click **"Customize"** → **"Setup"** → Copy the **"Search engine ID"**
7. Store this as `GOOGLE_CSE_ID` in your `.env` file

### Step 5: Enable Custom Search API
1. Return to [Google Cloud Console](https://console.cloud.google.com/)
2. Go to **"APIs & Services"** → **"Library"**
3. Search for **"Custom Search API"**
4. Click on it, then click **"Enable"**

### Step 6: Create Custom Search API Key
1. Go to **"APIs & Services"** → **"Credentials"**
2. You can reuse the same API key from Step 3, OR create a new one:
   - Click **"+ Create Credentials"** → **"API Key"**
   - Click **"Edit API key"** to restrict it
   - Under **"API restrictions"**, check **"Custom Search API"**
   - Click **"Save"**
3. Store this key as `GOOGLE_CSE_API_KEY` in your `.env` file
   - Note: You can use the same key for both APIs if you enabled both restrictions

### API Quota & Pricing

#### YouTube Data API v3
- **Free tier**: 10,000 quota units/day
- **Cost per search**: 100 quota units
- **Effective free searches**: ~100 searches/day
- **Pricing after quota**: Not available, must request quota increase
- **Quota reset**: Daily at midnight Pacific Time

#### Google Custom Search API
- **Free tier**: 100 queries/day
- **Paid tier**: $5 per 1,000 queries (up to 10,000/day max)
- **Rate limit**: 10 queries/second (burst: 100/100 seconds)

### Authentication Methods

#### YouTube Data API
The YouTube Data API v3 supports two authentication methods:

1. **API Key (Simple - used in this project)**
   - Suitable for public data access (search, video info)
   - No user consent required
   - URL format: `https://www.googleapis.com/youtube/v3/search?part=snippet&q=QUERY&key=YOUR_API_KEY`
   - **Use case**: Our read-only video search

2. **OAuth 2.0 (Complex - not needed for this project)**
   - Required for user-specific data or actions
   - Requires user login and consent
   - **Use case**: Uploading videos, accessing private data, managing playlists

#### Custom Search API
Uses simple API key authentication only:
- URL format: `https://www.googleapis.com/customsearch/v1?key=YOUR_API_KEY&cx=YOUR_CSE_ID&q=QUERY`

### Example API Calls

#### YouTube Data API Search Request
```bash
GET https://www.googleapis.com/youtube/v3/search
  ?part=snippet
  &type=video
  &q=14:30
  &maxResults=10
  &key=YOUR_YOUTUBE_API_KEY
```

**Response fields** (relevant):
```json
{
  "items": [
    {
      "id": {
        "videoId": "dQw4w9WgXcQ"
      },
      "snippet": {
        "title": "Video title with time 14:30",
        "description": "Description mentioning 14:30...",
        "thumbnails": {
          "default": { "url": "https://..." },
          "medium": { "url": "https://..." },
          "high": { "url": "https://..." }
        }
      }
    }
  ]
}
```

#### Custom Search API Request
```bash
GET https://www.googleapis.com/customsearch/v1
  ?key=YOUR_CSE_API_KEY
  &cx=YOUR_CSE_ID
  &q=14:30
  &num=10
```

**Response fields** (relevant):
```json
{
  "items": [
    {
      "title": "Video title - YouTube",
      "link": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "snippet": "Description with time 14:30...",
      "pagemap": {
        "metatags": [
          {
            "og:image": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
          }
        ]
      }
    }
  ]
}
```

### Security Best Practices

1. **Never commit API keys to git**
   - Add `.env` to `.gitignore`
   - Provide `.env.example` with dummy values

2. **Restrict API keys properly**
   - Use API restrictions (limit to specific APIs)
   - Use application restrictions (IP or HTTP referrer)
   - Regenerate keys if exposed

3. **Monitor usage**
   - Set up billing alerts in Google Cloud Console
   - Check quota usage daily at **"APIs & Services"** → **"Dashboard"**
   - Enable notifications for quota warnings

4. **Rate limiting**
   - Implement backend rate limiting (e.g., 10 requests/minute per IP)
   - Cache aggressively to reduce API calls
   - Use exponential backoff on API errors

5. **Environment-specific keys**
   - Use different API keys for development and production
   - Rotate keys periodically (every 90 days recommended)

### Troubleshooting Common Issues

**"API key not valid" error:**
- Verify the API is enabled in Google Cloud Console
- Check API key restrictions match your usage
- Wait 1-5 minutes after creating/modifying keys

**"Quota exceeded" error:**
- Check usage in Google Cloud Console dashboard
- Implement caching to reduce calls
- Consider upgrading CSE to paid tier
- Request quota increase for YouTube API

**"Access Not Configured" error:**
- The API is not enabled for your project
- Go to API Library and enable the required API

**No results from Custom Search:**
- Verify CSE ID is correct
- Check that youtube.com is in "Sites to search"
- Ensure search engine status is "Active"

### Testing Your Setup
```bash
# Test YouTube API
curl "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=14:30&maxResults=5&key=YOUR_YOUTUBE_API_KEY"

# Test Custom Search API
curl "https://www.googleapis.com/customsearch/v1?key=YOUR_CSE_API_KEY&cx=YOUR_CSE_ID&q=14:30&num=5"
```

Both should return JSON with video results. If you get errors, check the error message for specific troubleshooting steps.

## Project Structure
```
youtube_time/
├── backend/
│   ├── src/
│   │   ├── server.ts          # Express server with /api/search endpoint
│   │   ├── search.ts           # Search provider with CSE + YouTube API
│   │   ├── cache.ts            # TTL cache with ETag support
│   │   ├── transform.ts        # Response transformation
│   │   ├── types.ts            # TypeScript interfaces
│   │   └── config.ts           # Configuration loader
│   ├── .env.example            # Template for environment variables
│   ├── .env                    # Actual secrets (gitignored)
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── index.html              # Single page app
│   ├── app.js                  # Client-side logic
│   ├── styles.css              # Styling
│   └── fuzzy-matcher.js        # Time variant matching
├── docs/
│   └── build_plan.md           # This file
└── package.json                # Root package for scripts
```

## Implementation Steps

### Phase 1: Backend Setup
1. **Initialize backend project**
   - Set up TypeScript with Node.js/Express
   - Create package.json with dependencies: express, dotenv, better-sqlite3, axios, cors
   - Configure tsconfig.json for Node environment

2. **Environment configuration (backend/.env)**
   ```
   GOOGLE_CSE_API_KEY=your_key_here
   GOOGLE_CSE_ID=your_cse_id_here
   YOUTUBE_API_KEY=your_youtube_key_here
   PORT=3000
   DB_PATH=./cache.db
   ```

3. **Set up SQLite database (backend/src/database.ts)**
   - Initialize SQLite connection
   - Create video_cache table schema
   - Implement cache CRUD operations:
     - `getCachedVideo(time: string)`: Retrieve by time, check 7-day freshness
     - `setCachedVideo(data)`: Insert or update entry
     - `evictOldestCache()`: Delete oldest when > 1,440 entries
     - `getCacheCount()`: Return current cache size

4. **Implement search provider (backend/src/search.ts)**
   - `generateTimeVariants(time: string)`: Create query strings
     - "14:30", "1430", "2:30 PM", "2:30PM", "14.30"
   - `searchWithCSE(query: string)`: Query Google Custom Search API
   - `searchWithYouTube(query: string)`: Fallback to YouTube Data API
   - `search(time: string)`: Try each variant until title match found
   - `filterByTitle(results, time)`: Extract time from titles, strict match

5. **Create API endpoint (backend/src/server.ts)**
   - `GET /api/video` (no parameters - uses server time)
   - Get current server time (HH:MM format)
   - Check SQLite cache first
   - If cache miss or stale: call search()
   - Return: `{ videoId, videoUrl, title, timestamp }`
   - Error handling: 404 if no video found

6. **Transform responses (backend/src/transform.ts)**
   - Normalize CSE and YouTube API responses
   - Extract: videoId, title, viewCount
   - Sort by view count (ascending)
   - Return lowest view count match

### Phase 2: Frontend Development
7. **Create HTML structure (frontend/index.html)**
   - Video player container (YouTube iframe)
   - Current time display
   - Loading spinner
   - Error message area
   - "No video found" fallback state

8. **Implement client logic (frontend/app.js)**
   - On page load: Display current time
   - Automatically call `/api/video`
   - Show loading state during fetch
   - Embed video via iframe: `https://www.youtube.com/embed/{videoId}`
   - Handle errors: Show friendly message
   - Display video title below player

9. **Style the interface (frontend/styles.css)**
   - Centered layout
   - Responsive video embed (16:9 aspect ratio)
   - Loading animation
   - Clean, minimal design
   - Mobile-friendly

### Phase 3: Testing & Deployment
10. **Testing**
    - Test various times (00:00, 12:00, 23:59)
    - Verify cache persistence across server restarts
    - Test 7-day refresh logic
    - Verify title-only filtering works
    - Test with no matching videos

11. **Deployment**
    - Deploy backend (Railway, Render, or VPS)
    - Deploy frontend (Vercel, Netlify, or GitHub Pages)
    - Configure environment variables
    - Initialize SQLite database
    - Test in production

## Technical Decisions

### API Strategy
- **Primary**: Google Custom Search (100 free queries/day)
- **Fallback**: YouTube Data API (10,000 quota units/day, search = 100 units)
- **Trigger**: Try CSE first, fallback to YouTube if no title matches found
- **Query approach**: Try multiple time format variants sequentially

### Caching Strategy
- **Database**: SQLite with persistent storage
- **TTL**: 7 days per cached entry
- **Max size**: 1,440 entries (one per minute)
- **Eviction**: FIFO based on created_at when limit reached
- **Rationale**: Long TTL reduces API calls, database persists across restarts

### Title Matching Rules
- **Strict requirement**: Time MUST appear in video title
- **Formats supported**:
  - 24-hour: "14:30", "1430", "14.30"
  - 12-hour: "2:30 PM", "2:30PM"
- **Filtering**: Regex extraction of time patterns from title
- **Case insensitive**: "14:30" matches "At 14:30" or "at 14:30"

### Video Selection Strategy
- **Ranking**: Sort by view count (ascending)
- **Preference**: Lower view count = higher priority
- **Result**: Return single best match (first result after sorting)

### User Flow
1. User visits website
2. Frontend displays current system time
3. Frontend automatically calls backend `/api/video`
4. Backend checks SQLite cache for current time (HH:MM)
5. If cached AND < 7 days old: Return cached video
6. If not cached OR ≥ 7 days: Search APIs with multiple queries
7. Filter results: Only videos with time in title
8. Sort by view count (low to high)
9. Cache result in SQLite
10. Return video to frontend
11. Frontend embeds video in iframe player

## Further Considerations

### Open Questions
1. **Tolerance**: ±1, ±2, or ±5 minutes?
   - **Recommendation**: Start with ±2, make configurable

2. **Locale variants**: Include international formats?
   - **Recommendation**: Phase 2 feature, start with EN formats

3. **Provider strategy**: CSE-only or auto-fallback?
   - **Recommendation**: Auto-fallback if < 5 results from CSE

4. **Result ranking**: How to prioritize matches?
   - Exact title match > description match > comment match
   - Recency factor (newer videos ranked higher?)
   - View count factor?

### Future Enhancements
- User preferences (tolerance, time format)
- Save favorite time-matched videos
- Share results via URL parameters
- Multiple video queue/playlist
- Dark mode
- Analytics (popular search times)
- Rate limiting on backend
- Deploy to cloud (Vercel, Railway, etc.)

### Security & Privacy
- Rate limit API endpoint
- Validate all inputs
- No user data collection
- API keys in .env only (never committed)
- CORS restricted to known origins in production

### Cost Management
- Monitor API usage daily
- Set up alerts for quota thresholds
- Implement aggressive caching
- Consider paid tier if popular (CSE: $5/1000 queries after free tier)

## Dependencies

### Backend
- express: ^4.18.0
- dotenv: ^16.0.0
- node-cache: ^5.1.0
- axios: ^1.6.0
- cors: ^2.8.5
- typescript: ^5.0.0
- @types/node: ^20.0.0
- @types/express: ^4.17.0

### Frontend
- Vanilla JavaScript (no framework needed)
- Modern browser with Fetch API support

## Project Requirements & Design Decisions

### Core Functionality
1. **Automatic time detection**: Use current system time when page loads (no manual input)
2. **Title-only matching**: Search results MUST have time in the video title (strict filtering)
3. **Multiple query variants**: Generate and try multiple time format queries
4. **Low view count priority**: Prefer lesser-known videos over viral content
5. **Persistent caching**: SQLite database with 1,440 entry maximum (one per minute)
6. **7-day refresh cycle**: Only re-fetch videos after 7 days for same time slot

### Scope Limitations (Hobby Project)
- Small scale for friends only (no scaling concerns)
- No quota exhaustion worries
- No concurrent request handling needed
- No content moderation required
- No complex error handling for unavailable videos
- No monitoring/analytics needed

### Search Strategy
**Query Generation**: For time like 14:30, generate variants:
- "14:30" (24-hour exact)
- "1430" (no separator)
- "2:30 PM" (12-hour with space)
- "2:30PM" (12-hour no space)
- "14.30" (period separator)

**Filtering Logic**:
- Parse video title, extract all time patterns
- Must find exact match in title (case-insensitive)
- Discard if time only in description/tags
- Sort by view count (ascending - prefer low views)

### Caching Architecture
**SQLite Schema**:
```sql
CREATE TABLE video_cache (
  time TEXT PRIMARY KEY,        -- Format: "HH:MM" (24-hour)
  video_id TEXT NOT NULL,       -- YouTube video ID
  video_url TEXT NOT NULL,      -- Full YouTube URL
  title TEXT NOT NULL,          -- Video title for verification
  view_count INTEGER,           -- For sorting/debugging
  created_at DATETIME NOT NULL, -- First cached
  updated_at DATETIME NOT NULL  -- Last refreshed
);
```

**Cache Logic**:
1. On page load, get current time (format as HH:MM)
2. Query SQLite for matching time entry
3. If found AND updated_at < 7 days ago: Return cached video
4. If not found OR updated_at ≥ 7 days: Query API
5. Store/update result in SQLite
6. If cache size > 1,440: Delete oldest created_at entries

**Cache Eviction**: FIFO based on created_at when limit reached

## Additional Considerations & Concerns

### Architectural Concerns

**1. Search Query Strategy** ✅ ADDRESSED
- **Solution**: Generate 5+ query variants per time, try in sequence
- Filter strictly: time MUST appear in title
- Client-side regex matching post-retrieval

**2. False Positives** ✅ ADDRESSED
- **Solution**: Title-only matching eliminates most false positives
- Timestamp references in descriptions ignored

**3. Video Availability** ⚠️ DEFERRED
- No handling for deleted/private videos initially
- Future: Could add status check or user reporting

**4. Timezone Ambiguity** ✅ ADDRESSED
- Ignored - only care about time string in title

### Performance Concerns

**5. API Response Time** ✅ MITIGATED
- Single API call on page load
- 7-day cache drastically reduces API calls
- Most requests served from SQLite (<50ms)

**6. Cache Strategy Trade-offs** ✅ OPTIMIZED
- 1,440 max entries = one per minute of day
- 7-day TTL balances freshness vs API usage
- SQLite handles this size easily (<1MB database)

**7. Concurrent Requests** ❌ NOT NEEDED
- Small hobby project scope

### Cost Management Concerns

**8. API Quota Exhaustion** ❌ NOT A CONCERN
- Hobby project for friends
- 7-day cache means max ~206 API calls/day (1440/7)
- Well under 100 free searches/day limit

**9. Paid Tier Economics** ❌ NOT APPLICABLE
- No scale concerns

### UX Concerns

**10. Search Result Relevance** ✅ ADDRESSED
- Strict title matching ensures relevance
- If no match: Show "No video found for HH:MM"

**11. Video Selection** ✅ ADDRESSED
- Ranking: Low view count prioritized
- Exact title match required
- Single best result returned (no user choice)

**12. Mobile Experience** ✅ SIMPLIFIED
- No input needed - auto-loads on page visit
- Just ensure video embed is responsive

### Technical Debt Concerns

**13. No Database** ✅ RESOLVED
- Using SQLite for persistent cache

**14. Error Handling Gaps** ✅ BASIC COVERAGE
- Handle API failures gracefully
- Show friendly "No video found" message

**15. No Monitoring/Observability** ✅ ACCEPTABLE
- Basic console logging sufficient
- Hobby project scope

### Content Concerns

**16. Content Moderation** ❌ NOT A CONCERN
- Relying on YouTube's algorithms

**17. Copyright/Legal** ❌ NOT A CONCERN
- Hobby project, YouTube embedding is standard

### Development Concerns

**18. Testing Strategy** ⚠️ MINIMAL
- Manual testing for edge cases
- No automated tests initially

**19. Environment Parity** ⚠️ BASIC
- Simple deployment, single environment

**20. TypeScript Strictness** ✅ YES
- Use strict mode
- Define interfaces for API responses

## Deployment Checklist
- [ ] Backend compiles without errors
- [ ] Frontend works locally
- [ ] SQLite database initializes correctly
- [ ] Environment variables configured
- [ ] API keys tested and working
- [ ] Cache persistence verified (survives restart)
- [ ] 7-day refresh logic tested
- [ ] Title filtering tested (rejects description-only matches)
- [ ] Low view count sorting verified
- [ ] Error handling tested (no video found case)
- [ ] CORS configured for frontend domain
- [ ] Documentation complete
- [ ] Deploy backend (Railway/Render/VPS)
- [ ] Deploy frontend (Vercel/Netlify/GitHub Pages)
- [ ] Test production deployment
- [ ] Share with friends! 🎉