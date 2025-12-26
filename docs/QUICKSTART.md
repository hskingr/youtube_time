# YouTube Time Matcher - Quick Start Guide

## Prerequisites

- Docker & Docker Compose installed (optional; can run locally without Docker)
- Node.js 18+ (for local development)
- YouTube Data API key from Google Cloud Console

## Local Development Setup

### 1. Clone & Install
```bash
cd youtube_time
npm install
cd backend && npm install
cd ..
```

### 2. Configure Environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your YouTube API key:
# YOUTUBE_API_KEY=your_youtube_api_key_here
# PORT=3000 (optional, defaults to 3000)
# DB_PATH=./cache.db (optional, defaults to ./cache.db)
```

### 3. Run with Docker Compose
```bash
# Build images
docker-compose build

# Start services (backend on 3000, frontend on 80)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Test
- Frontend: http://localhost
- Backend: http://localhost:3000/video (local) or http://localhost:3000/api/video (via Traefik in prod)
- Database: `backend/cache.db` (persisted in `backend/data/`)

Note: In development, the endpoint is `/video`. Traefik adds the `/api` prefix in production.

## Local Development without Docker

### Build Backend
```bash
cd backend
npm install
npm run build
npm start
```

### Serve Frontend
```bash
# Option 1: Simple Python server
cd frontend
python -m http.server 8000

# Option 2: With Live Reload (requires live-server)
npm install -g live-server
live-server frontend

# Option 3: Node.js http-server
npm install -g http-server
http-server frontend
```

Visit http://localhost:8000 (or your server's port)

Update `frontend/app.js` if using different backend port:
```javascript
const API_URL = 'http://localhost:3000';
```

## Production Deployment with Traefik

### Prerequisites
- Traefik reverse proxy running on `myNetwork`
- Domain configured (e.g., `time.libraryoftype.xyz`)
- SSL certificates via Let's Encrypt

### Deploy
```bash
# Build and start with production compose
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

### Access
- Frontend: https://time.libraryoftype.xyz
- Backend: https://time-backend.libraryoftype.xyz/api/video

No external ports exposed - all traffic through Traefik!

## Useful Commands

### Docker Compose
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service_name]

# Rebuild specific service
docker-compose build backend

# Remove all data (clean slate)
docker-compose down -v
```

### PM2 (Alternative to Docker)
```bash
cd backend
npm install -g pm2
npm run build
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit

# Logs
pm2 logs youtube-time-backend
```

## Troubleshooting

### Backend not connecting
- Check `.env` file has all API keys
- Verify database directory exists: `mkdir -p backend/data`
- Check logs: `docker-compose logs backend`

### Frontend shows error
- Check backend is running: `curl http://localhost:3000/api/video`
- Verify API_URL in `frontend/app.js`
- Clear browser cache

### No videos found
- Verify YouTube API key is valid and enabled in Google Cloud Console
- Check that "YouTube Data API v3" is enabled for your project
- API quota may be exhausted (free tier = 10,000 quota units/day; each search = 100 units ≈ 100 searches/day)

### Database permission issues
- Ensure `backend/data/` directory is writable
- On Docker: volumes are auto-created

## File Structure
```
youtube_time/
├── backend/
│   ├── src/
│   │   ├── server.ts        # Express app
│   │   ├── search.ts        # YouTube/CSE search
│   │   ├── database.ts      # SQLite cache
│   │   └── transform.ts     # Response transform
│   ├── dist/                # Compiled JavaScript
│   ├── data/                # SQLite database (persisted)
│   ├── logs/                # Application logs
│   ├── Dockerfile
│   ├── ecosystem.config.js  # PM2 config
│   └── package.json
├── frontend/
│   ├── index.html           # Single page app
│   ├── app.js              # Client logic
│   ├── styles.css          # Retro styling
│   └── nginx.conf          # Nginx proxy config
├── docker-compose.yml       # Development
├── docker-compose.prod.yml  # Production (Traefik)
└── DEPLOYMENT.md           # This file
```

## API Endpoints

### GET /api/video
Returns video for current server time.

**Response (200):**
```json
{
  "videoId": "dQw4w9WgXcQ",
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "title": "Video title mentioning 14:30",
  "viewCount": 12345,
  "timestamp": "2025-12-26T14:30:00.000Z"
}
```

**Response (404):**
```json
{
  "error": "No video found for this time"
}
```

## Performance Notes

- First request for a time: ~1-3 seconds (API call)
- Subsequent requests (within 7 days): <100ms (database lookup)
- Cache size: 1,440 entries max (one per minute)
- Database size: <10MB for full cache

## Next Steps

1. Test locally with `docker-compose up`
2. Deploy to production with Traefik
3. Monitor logs for errors
4. Enjoy retro 90s vibes! 🌈
