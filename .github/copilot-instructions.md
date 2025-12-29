# GitHub Copilot Instructions for youtube_time

This repo implements a small web app that shows a YouTube video matching the current time. It has a TypeScript/Express backend with SQLite caching and a static frontend served via nginx or a local http server. Use this guide to work productively as an AI coding agent.

## Architecture Overview
- **Backend (TypeScript/Express):**
  - Entrypoint: `backend/src/server.ts` exposes `GET /video` (production is routed as `/api/video` by Traefik).
  - Data flow: client sends `HH:MM` → backend checks SQLite cache → if stale/miss, calls YouTube APIs → returns `{ videoId, videoUrl, title, timestamp }`.
  - Cache: `backend/src/database.ts` uses `better-sqlite3`. Keys by `time` (HH:MM), 7-day TTL, max 1,440 entries (one per minute) with FIFO eviction.
  - Search: `backend/src/search.ts` builds time variants and queries YouTube Data API `search.list`; filters titles containing time tokens; verifies each candidate with `videos.list` (`status.embeddable`, `privacyStatus`).
  - Transform: `backend/src/transform.ts` placeholder; most logic is in `search.ts`.
- **Frontend (Static HTML/JS/CSS):**
  - Files: `frontend/index.html`, `frontend/app.js`, `frontend/styles.css`.
  - Client logic: `app.js` computes HH:MM, selects API base (`localhost:3000` in dev, `origin + /api` in prod), calls `/video?time=HH:MM`, and embeds `https://www.youtube.com/embed/{videoId}`.
  - Grid view: `frontend/grid.html` (`/grid`) + `frontend/grid.js` displays 24-hour timeline with lazy loading (intersection observer), modal player, and jump-to-now navigation.
- **Deployment:**
  - Traefik routes `/api` to backend and root to frontend. See `docker-compose.prod.yml`.
  - Frontend image serves static content via nginx; backend runs Node.

## Environment & Config
- **Backend env vars:**
  - `PORT` (default 3000), `DB_PATH` (default `./cache.db`), `YOUTUBE_API_KEY`.
y  - Only YouTube API is used. No CSE features are present or required.
- **Frontend:** No build step; served statically.
- **Prod routing:** Traefik strips `/api` prefix via `stripprefix` middleware in `docker-compose.prod.yml`.

## Developer Workflows
- **Backend development:**
  - Fast debug, no build: VS Code launch `Debug (ts-node ESM)` in `.vscode/launch.json` (runs TS directly).
  - Watch mode: `npm run dev:nodemon` in `backend` (nodemon + ts-node/esm).
  - Compiled run: `npm run build` then `npm start`.
- **Frontend development:**
  - Local server: `npm start` in `frontend` (http-server on port 8000, cache disabled).
  - API base auto-detected in `app.js` (`localhost` vs `origin + /api`).
- **Docker (prod-like):**
  - Compose file: `docker-compose.prod.yml` (no `version` key; services `youtube_time_api` and `youtube_time`).
  - Backend volumes map data/logs; frontend is built into image (no bind mounts for nginx conf).

## Patterns & Conventions
- **Time matching:**
  - Client: simple regex for `HH:MM` display.
  - Server: generate time variants (12h/24h forms) and filter titles via token regex; consider using `verifyVideoAvailable()` to avoid unavailable/blocked videos.
- **Caching:**
  - 7-day freshness check in `server.ts`; if fresh, return cache.
  - Size cap of 1,440 entries enforced via `evictOldestCache()` loop.
- **YouTube filters:**
  - Use `search.list` with `type=video`, `videoEmbeddable=true`, `videoSyndicated=true`, `safeSearch=moderate`.
  - Verify each candidate via `videos.list` (`part=status,contentDetails`). Drop non-embeddable or non-public.
- **Error handling:**
  - `GET /video` returns 404 when no match; 500 on internal errors.
- **Source maps & debugging:**
  - `backend/tsconfig.json` has `sourceMap: true`; VS Code configurations route output to Integrated Terminal.

## Key Files to Reference
- `backend/src/server.ts`: API routes, cache freshness logic, eviction.
- `backend/src/database.ts`: SQLite schema and operations.
- `backend/src/search.ts`: YouTube search + verification, time variant generation.
- `frontend/app.js`: Main view - API base selection, DOM updates, iframe embed.
- `frontend/grid.js`: Grid view - lazy loading, intersection observer, modal player.
- `frontend/index.html`: Main single-video view.
- `frontend/grid.html`: Grid timeline view (requires both grid.html and grid.js).
- `docker-compose.prod.yml`: Traefik labels, strip-prefix middleware, service boundaries.
- `docs/QUICKSTART.md`, `docs/DEPLOYMENT.md`, `docs/TRAEFIK_DEPLOYMENT.md`: operational guides.
- Deployment helpers: `motherhouse.deploy.sh` (build/push/compose up), `motherhouse.monitor.sh` (tail and health), `motherhouse.backup.database.sh` (backup SQLite DB).

## Common Tasks (Examples)
- **Add a new time format (future):** Update `generateTimeVariants()` and the title token regex in `search.ts`; keep comparison normalized to `HH:MM`.
- **Tighten embeddability checks:** Extend `verifyVideoAvailable()` to reject region-blocked videos by inspecting `contentDetails.regionRestriction.blocked`.
- **Change cache TTL or size:** Adjust freshness threshold in `server.ts` and cap in eviction loop; schema doesn’t require changes.
- **Run local dev:**
  - Backend: `npm run dev:nodemon` (port 3000) in `backend`.
  - Frontend: `npm start` in `frontend` then open `http://localhost:8000`.
- **Prod deploy tweaks:** Modify Traefik `stripPrefix` or domains in `docker-compose.prod.yml`; backend must continue to receive `/video` without `/api` prefix.

## Gotchas
- **Embedding restrictions:** YouTube Error 153 means owner disabled embedding; `videoEmbeddable=true` helps, but final verification via `videos.list` is required.
- **Debug breakpoints not binding:** Use the `Debug (ts-node ESM)` config or rebuild before debugging compiled JS.
- **API keys:** Must be present or the backend returns warnings and skips providers.
- **Frontend caching:** `http-server` is set with `-c-1` to avoid stale assets during dev.
- **Grid view 404 in production:** Ensure `frontend/grid.html` and `frontend/grid.js` exist before building Docker image. Frontend Dockerfile copies all files from `frontend/` to nginx's `/usr/share/nginx/html`. Missing files result in 404 errors. Rebuild with `./motherhouse.deploy.sh` after adding files.

---
Questions or unclear areas? Tell me which flows need more detail (e.g., more robust locale time parsing, or deployment scripts like `motherhouse.deploy.sh`).