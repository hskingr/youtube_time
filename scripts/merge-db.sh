#!/bin/bash

# Database Merge Script
# Merges two SQLite databases, keeping the newest entries

set -e

if [ $# -ne 2 ]; then
  echo "Usage: $0 <source.db> <target.db>"
  echo "Merges source into target, keeping newest entries"
  exit 1
fi

SOURCE_DB="$1"
TARGET_DB="$2"

if [ ! -f "$SOURCE_DB" ]; then
  echo "Error: Source database not found: $SOURCE_DB"
  exit 1
fi

if [ ! -f "$TARGET_DB" ]; then
  echo "Error: Target database not found: $TARGET_DB"
  exit 1
fi

# Backup target
BACKUP="${TARGET_DB}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$TARGET_DB" "$BACKUP"
echo "✓ Backup created: $BACKUP"

# Merge databases
sqlite3 "$TARGET_DB" <<EOF
ATTACH DATABASE '$SOURCE_DB' AS source;

INSERT OR REPLACE INTO video_cache 
SELECT * FROM source.video_cache
WHERE time NOT IN (SELECT time FROM video_cache)
   OR updated_at > (SELECT updated_at FROM video_cache WHERE video_cache.time = source.video_cache.time);

DETACH DATABASE source;
EOF

echo "✅ Databases merged successfully!"
echo "   Backup: $BACKUP"
echo "   Target: $TARGET_DB"
