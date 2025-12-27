# YouTube Time Matcher – Data Analysis Lab

This lab is a playground for collecting and analyzing YouTube Data API responses to improve how the app chooses videos in relation to the current time.

The lab is **optional** and runs separately from the main server. It reuses the same YouTube API key and search logic, but stores its own data (JSON files, reports) under `backend/lab/`.

## Goals

- Capture raw YouTube API responses for selected times of day.
- Analyze patterns in titles, metadata, and availability.
- Compare different query formats and parameters.
- Inform improvements to `backend/src/search.ts` without touching production code or the main cache DB.

## Layout (planned)

- `backend/lab/`
  - `collect/`
    - `run.ts` – main entrypoint to run data collection for a set of times.
  - `analyze/`
    - `run.ts` – main entrypoint to analyze previously collected data.
  - `data/` – stored raw JSON and any derived analysis artifacts.
  - `config/` (optional) – config files for times to query, limits, etc.

## Running the Lab

From `backend/` (after `npm install` and `.env` is configured):

```bash
# Collect data for a set of times (skeleton, to be expanded)
npm run lab:collect

# Analyze collected data (skeleton, to be expanded)
npm run lab:analyze
```

Both commands will use the same `YOUTUBE_API_KEY` that the main server uses. If the key is missing, the lab will exit with an error message.

## Next Steps (for future work)

- Plug in the existing YouTube search logic from `backend/src/search.ts` into the lab scripts.
- Implement JSON storage structure under `backend/lab/data/` (e.g., by date and time).
- Add analysis routines that:
  - Count results per time/variant.
  - Examine title patterns and false positives.
  - Compare different query parameter choices.
- Generate a short human-readable report (Markdown or text) summarizing findings and suggested code changes.
