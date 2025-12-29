# Grid Design Plan

## Original Notes
I want to show a grid of all videos that have been fetched from the database.

This meaans I would need to display 1440 small thumbnails.

Each thumbnail can be clicked on to load an enlarged version of the video

To get everything, an api call would need to be made to the backend

The backend would then return a json array of the 1440 entries with their thumbnails.

Note: I would need to update the sqlite db to ensure that the thumbnails are grabbed and downloaded.

Some questions

1. Fetching 1440 results is quite a lot. I should do some caching on the frontend to make sure this isnt done each time.
2. We should have an overlay on each thumbnail to show the time. The grid can be scrolled (maybe infinitel), and when the user laods a page the thumbnail is put into focus.
3. should we store the images as urls to fetch from the youtube domain (https://i.ytimg.com/vi/CR8pNozyN0s/default.jpg) or download them and fetch them ourselves?

We should definately use some kind of lazy loading so not everything is displayed at once. Would that mean that the api calls that are made to get all the values could be restricted. For example, if it is 14:54 we can make a request to the api where only 50 results after and before are returned. When the user scrolls, we could load the correct ones depending on what position the user is in,

## Refined Implementation Plan

### 1. Database Schema
- **Action**: Update `video_cache` table in `backend/src/database.ts`.
- **Changes**:
    - Add `thumbnail_url` column (TEXT).
    - Update `VideoCache` interface.
    - Update `cacheVideo` function to store the URL.

### 2. YouTube Data Capture
- **Action**: Modify `backend/src/search.ts`.
- **Changes**:
    - Extract `snippet.thumbnails.medium.url` from YouTube API response.
    - Pass this URL to the `cacheVideo` function.

### 3. API Development
- **Action**: Create `GET /videos` endpoint in `backend/src/server.ts`.
- **Strategy**: **Separate Endpoint**. Do not reuse `/video`. This endpoint must be **Read-Only/Cache-Only**.
- **Features**:
    - **Pagination**: Support `page` and `limit` (e.g., `?page=1&limit=60`).
    - **Time-based Cursor**: Support fetching by time range (e.g., `?time=14:54&range=60` to get ±30 mins).
    - **Behavior**: Query the database for existing entries in the range. **Do NOT** trigger YouTube API searches for missing times.
    - **Response**: JSON array of cached videos with thumbnail URLs.
    - **Missing Data**: The API returns only what exists. The Frontend is responsible for rendering placeholders for missing minutes based on the requested range.

### 4. Frontend Grid (Lazy Loading)
- **Action**: Create `frontend/grid.js` and create a `frontend/grid.html` file.
- **Features**:
    - **Container**: Add a toggleable `#grid-view` div.
    - **Virtualization/Lazy Loading**: Use `IntersectionObserver` to detect scroll position and fetch data in chunks (e.g., 60 minutes at a time).
    - **Caching**: Store fetched pages in a simple JS object/Map to avoid re-fetching during the same session.
    - **UI**:
        - 12x60 grid (responsive).
        - Overlay HH:MM on thumbnails.
        - "No Signal" placeholder for missing cache entries.
        - Click to play video.

### 5. Asset Strategy
- **Initial**: Store and serve YouTube URLs (`https://i.ytimg.com/...`).
- **Future**: Implement a background job to download images to `backend/data/thumbnails/` if hotlinking becomes an issue or for offline support.

### 6. Additional Considerations
- **Thumbnail Quality**: Use `snippet.thumbnails.medium.url` (320x180). It offers a good balance between quality and bandwidth for a grid layout. `default` (120x90) might be too small for high-DPI screens, and `high` is unnecessary.
- **Existing Cache Migration**: Existing database entries will have `NULL` thumbnails.
    - *Strategy*: Allow them to expire naturally (7-day TTL). They will appear as "No Signal" in the grid until they are re-fetched by the main app flow.
    - *Alternative*: Create a one-off script to backfill thumbnails using `videos.list` for existing IDs (watch quota usage).
- **Quota Efficiency**: Ensure the thumbnail is captured during the `videos.list` verification step in `search.ts` to ensure the video is actually available and the metadata is fresh.
- **Grid UX**:
    - **"Jump to Now"**: A floating action button to scroll the grid to the user's current local time.
    - **Timezones**: The grid represents a generic 24-hour cycle. The "current time" highlight must be calculated client-side.
