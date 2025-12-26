# YouTube Time Matcher

A web app that shows a YouTube video matching the current time. Ask for the current time, and get a video that contains that time in its title.

## 🚀 Quick Start

### Prerequisites
- YouTube Data API key ([get one here](https://console.cloud.google.com/apis/dashboard))

### Local Development (5 minutes)

```bash
# 1. Clone and install
git clone <repo>
cd youtube_time
cd backend && npm install && cd ..

# 2. Configure
cp backend/.env.example backend/.env
# Edit backend/.env and add your YOUTUBE_API_KEY

# 3. Run backend
cd backend
npm run dev:nodemon

# 4. Run frontend (in another terminal)
cd frontend
npm start
# Opens http://localhost:8000
```

### Docker (Production-like)

```bash
cp backend/.env.example .env
# Edit .env with your YOUTUBE_API_KEY

docker-compose up -d
# Frontend: http://localhost
# Backend: http://localhost:3000/video
```

## 📁 Project Structure

| Directory | Purpose |
|-----------|---------|
| `backend/` | TypeScript/Express API server |
| `frontend/` | Static HTML/JS/CSS client |
| `docs/` | Deployment & setup guides |

## 🔧 Architecture

**Backend (TypeScript/Express)**
- `GET /video?time=HH:MM` → searches YouTube for matching video
- SQLite cache with 7-day TTL (max 1,440 entries)
- Calls YouTube Data API with time variants
- Filters by videos with time in title

**Frontend (Vanilla JS)**
- Auto-detects current time
- Calls backend API
- Embeds video in iframe
- Auto-switches between dev (`localhost:3000`) and prod (`/api`) modes

## 📚 Documentation

- [QUICKSTART.md](docs/QUICKSTART.md) - Local development & Docker setup
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - PM2 & Docker deployment guides
- [TRAEFIK_DEPLOYMENT.md](docs/TRAEFIK_DEPLOYMENT.md) - VPS deployment with Traefik reverse proxy

## 🎬 How It Works

1. User visits the app → sees current time
2. Frontend calls `/video?time=HH:MM`
3. Backend checks SQLite cache (7-day TTL)
4. If miss/stale: queries YouTube API for `"14:30"`, `"2:30 PM"`, etc.
5. Filters results by videos with time in title
6. Caches result, returns `{videoId, title, viewCount, timestamp}`
7. Frontend embeds `https://www.youtube.com/embed/{videoId}`

## 🔑 API Key Setup

### Get YouTube API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/dashboard)
2. Enable "YouTube Data API v3"
3. Create an API key (restrict to HTTP referrer or IP for security)
4. Add to `.env`: `YOUTUBE_API_KEY=your_key_here`

**Quota**: 10,000 units/day (100 per search ≈ 100 searches/day free)

## 🛠️ Development

### Commands

**Backend**
```bash
cd backend
npm install        # Install dependencies
npm run dev        # Watch mode with ts-node
npm run build      # Compile TypeScript
npm start          # Run compiled code
```

**Frontend**
```bash
cd frontend
npm install        # Install dependencies
npm start          # Start http-server on port 8000
```

### Environment Variables

```bash
# backend/.env
YOUTUBE_API_KEY=your_key_here  # Required
PORT=3000                       # Optional (default: 3000)
DB_PATH=./cache.db             # Optional (default: ./cache.db)
```

## 🐳 Docker Compose

**Development** (`docker-compose.yml`)
- Backend on `localhost:3000`
- Frontend on `localhost:80` (or auto-assigned port)
- No SSL, simple setup

**Production** (`docker-compose.prod.yml`)
- Requires Traefik reverse proxy on network `myNetwork`
- SSL via Let's Encrypt
- No exposed ports (all via Traefik)

## 📋 Troubleshooting

**"No video found"**
- Verify `YOUTUBE_API_KEY` is set correctly
- Check API is enabled in Google Cloud Console
- Check quota: https://console.cloud.google.com/apis/dashboard

**Backend not responding**
- Check logs: `docker-compose logs backend` or `npm run dev`
- Verify database directory: `mkdir -p backend/data`

**Frontend shows error**
- Check backend is running: `curl http://localhost:3000/video`
- Check browser console for network errors
- Clear browser cache

## 📝 License

MIT (or your chosen license)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) (if applicable)
