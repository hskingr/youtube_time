#!/bin/sh

ssh motherhouse 'mkdir -p /opt/docker/data/youtube_time'
ssh motherhouse 'test -f /opt/docker/data/youtube_time/cache.db' || scp ./backend/cache.db motherhouse:/opt/docker/data/youtube_time/
docker  --context motherhouse compose -f docker-compose.prod.yml pull && \
docker  --context motherhouse compose -f docker-compose.prod.yml up -d --remove-orphans --build
