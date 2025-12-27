# YouTube Time Matcher - Backend Deployment Guide

## PM2 Setup (Local/VPS)

### Install PM2
```bash
npm install -g pm2
```

### Start with PM2
```bash
cd backend
npm run build
pm2 start ecosystem.config.js --env production
```

### Useful PM2 Commands
```bash
# Monitor running apps
pm2 monit

# View logs
pm2 logs youtube-time-backend

# Stop app
pm2 stop youtube-time-backend

# Restart app
pm2 restart youtube-time-backend

# Delete app
pm2 delete youtube-time-backend

# Make PM2 start on boot
pm2 startup
pm2 save
```

## Docker Setup

### Build Docker Image
```bash
docker build -t youtube-time-backend:latest ./backend
```

### Run with Docker Compose
```bash
# Copy environment variables
cp backend/.env.example .env
# Edit .env with your API keys

# Start services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Run Docker Container Manually
```bash
docker run -d \
  -p 3000:3000 \
  -e YOUTUBE_API_KEY=your_youtube_key \
  -v backend-data:/app/data \
  -v backend-logs:/app/logs \
  --restart unless-stopped \
  --name youtube-time-backend \
  youtube-time-backend:latest
```

## Data Persistence

Both PM2 and Docker preserve:
- **cache.db** - SQLite database at `/app/data/cache.db`
- **logs/** - Application logs

## Environment Variables
Required:
```
YOUTUBE_API_KEY=your_youtube_data_api_key
```

Optional:
```
PORT=3000 (defaults to 3000)
DB_PATH=/app/data/cache.db (defaults to ./cache.db; for Docker use /app/data/cache.db)
```

## Health Checks

Both setups include health checks that verify the `/api/video` endpoint is responding. If the health check fails 3 times in a row, the container will be considered unhealthy.

## Production Recommendations

1. **Use Docker Compose** for reliable container orchestration
2. **Mount volumes** for persistent database and logs
3. **Set restart policy** to `unless-stopped` for automatic recovery
4. **Monitor logs** regularly for errors
5. **Use a reverse proxy** (nginx) for SSL/HTTPS
6. **Set memory limits** to prevent resource exhaustion
