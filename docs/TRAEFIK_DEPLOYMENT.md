# YouTube Time - Traefik Deployment Guide

## Recommended Approach: Docker Context + docker-compose.prod.yml

This guide shows how to deploy to your VPS with Docker and Traefik.

## Prerequisites
- VPS with Docker and Traefik installed
- SSH access to VPS
- Traefik configured with Let's Encrypt

## Method 1: Docker Context Deployment (Recommended)

Deploy from your local machine without SSH'ing in each time.

### 1. Set up Docker context (one-time setup)
```bash
# Create a context pointing to your VPS
docker context create motherhouse --docker "host=ssh://user@your-vps-ip"

# Verify it was created
docker context ls

# Test the connection
docker --context motherhouse ps
```

### 2. Prepare environment variables on VPS
```bash
# SSH into your VPS
ssh user@your-vps-ip

# Create project directory
mkdir -p /opt/youtube_time
cd /opt/youtube_time

# Create .env file
nano .env

# Add your API keys:
YOUTUBE_API_KEY=your_youtube_key
YOUTUBE_API_KEY_2=your_second_youtube_key  # Optional - for quota doubling
```

### 3. Ensure Traefik network exists
```bash
# On VPS, create the network if it doesn't exist
docker network create myNetwork

# Or use your existing Traefik network name
# Update docker-compose.prod.yml networks section accordingly
```

### 4. Update docker-compose.prod.yml
Edit the file and change these lines to match your domain:
```yaml
# Line 28 & 54
Host(`your-domain.com`)  # Replace with your actual domain
```

Also update the image registry if using a private registry:
```yaml
# Lines 6 & 40 (optional - only if using a registry)
image: your-registry.com/youtube_time-backend:latest
```

Or omit the registry to build locally:
```yaml
build: ./backend  # Builds image locally instead of pulling from registry
```

### 5. Deploy from local machine
```bash
# Make script executable
chmod +x motherhouse.deploy.sh

# Deploy!
./motherhouse.deploy.sh
```

### 6. Verify deployment
```bash
# Check logs
docker --context motherhouse compose -f docker-compose.prod.yml logs -f

# Check status
docker --context motherhouse compose -f docker-compose.prod.yml ps

# Test main page
curl https://your-domain.com/

# Test API endpoint (note: accessed as /api/video but routed to backend as /video)
curl https://your-domain.com/api/video

# Test health endpoints
curl https://your-domain.com/api/health
curl https://your-domain.com/health

# Test grid view (ensure grid.html exists in frontend/)
curl https://your-domain.com/grid
```

**Important Routing Note:**
- Users access the backend API at `https://your-domain.com/api/video` and `https://your-domain.com/api/videos`
- Traefik strips the `/api` prefix via the `stripprefix` middleware before routing to the backend
- Backend receives requests at `/video` and `/videos` (without the `/api` prefix)
- Frontend code auto-detects the environment and uses the correct base URL

**Note**: The grid view requires `frontend/grid.html` and `frontend/grid.js` to be present before building the Docker image. If you get a 404 for `/grid` or `/grid.html`, ensure these files exist and rebuild: `./motherhouse.deploy.sh`

## Method 2: Direct VPS Deployment

Deploy directly on the VPS without docker context.

### 1. Copy files to VPS
```bash
# From your local machine
scp -r . user@your-vps-ip:/opt/youtube_time
```

### 2. SSH into VPS and deploy
```bash
# SSH into VPS
ssh user@your-vps-ip

# Navigate to project
cd /opt/youtube_time

# Create .env file with your API key
nano .env

# Ensure network exists
docker network create myNetwork

# Deploy
docker compose -f docker-compose.prod.yml up -d --build
```

### 3. Monitor deployment
```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check status
docker compose -f docker-compose.prod.yml ps

# Check Traefik dashboard (if enabled)
```

## Updating Your Deployment

### Using Docker Context (Method 1)
```bash
# From local machine
./motherhouse.deploy.sh
```

### Direct on VPS (Method 2)
```bash
# SSH into VPS
ssh user@your-vps-ip
cd /opt/youtube_time

# Pull latest changes
git pull  # if using git

# Or copy updated files
# scp -r . user@your-vps-ip:/opt/youtube_time

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

## Useful Commands

### Helper Scripts (Recommended)

The repository includes helper scripts for common tasks:

```bash
# Deploy to production (builds, pushes, and starts containers)
./motherhouse.deploy.sh

# Monitor logs and health checks
./motherhouse.monitor.sh

# Backup database from production
./motherhouse.backup.database.sh
# Creates timestamped backup in ./backups/
```

### Manual Docker Commands

### Check service status
```bash
docker --context motherhouse compose -f docker-compose.prod.yml ps
```

### View logs
```bash
# All services
docker --context motherhouse compose -f docker-compose.prod.yml logs -f

# Backend only
docker --context motherhouse compose -f docker-compose.prod.yml logs -f youtube_time_api

# Frontend only
docker --context motherhouse compose -f docker-compose.prod.yml logs -f youtube_time
```

### Restart services
```bash
docker --context motherhouse compose -f docker-compose.prod.yml restart
```

### Stop services
```bash
docker --context motherhouse compose -f docker-compose.prod.yml down
```

### Rebuild after code changes
```bash
docker --context motherhouse compose -f docker-compose.prod.yml up -d --build
```

## Troubleshooting

### Traefik not routing traffic
1. Check Traefik labels in docker-compose.prod.yml
2. Verify domain DNS points to VPS IP
3. Check Traefik logs: `docker logs traefik`
4. Ensure containers are on the same network as Traefik

### SSL certificate issues
1. Wait 1-2 minutes for Let's Encrypt to provision
2. Check Traefik logs for certificate errors
3. Verify certresolver name matches your Traefik config

### Service not starting
```bash
# Check logs for errors
docker --context motherhouse compose -f docker-compose.prod.yml logs

# Check if ports are available
docker --context motherhouse ps -a

# Check environment variables are set
docker --context motherhouse compose -f docker-compose.prod.yml config
```

### Database/logs persistence
Data is stored in mounted volumes:
- `./backend/data` - SQLite database
- `./backend/logs` - Application logs

Make sure these directories exist on the VPS.

## Security Notes

1. **Never commit .env files** - Keep API keys secure
2. **Use SSH keys** instead of passwords for VPS access
3. **Keep Docker and Traefik updated** for security patches
4. **Set up firewall rules** to only expose necessary ports (80, 443, 22)
