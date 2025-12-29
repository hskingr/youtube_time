#!/bin/bash

mkdir -p ./backups
scp motherhouse:/opt/docker/data/youtube_time/data/cache.db ./backups/cache.db.$(date +%Y%m%d_%H%M%S).db
