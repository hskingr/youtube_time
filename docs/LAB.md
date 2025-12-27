# YouTube Time Matcher – Data Analysis Lab

This lab is a playground for collecting and analyzing YouTube Data API responses to improve how the app chooses videos in relation to the current time.

The lab is **optional** and runs separately from the main server. It reuses the same YouTube API key and search logic, but stores its own data (JSON files, reports) under `lab/`.

## Goals

- Capture raw YouTube API responses for selected times of day.
- Analyze patterns in titles, metadata, and availability.
- Compare different query formats and parameters.
- Inform improvements to `backend/src/search.ts` without touching production code or the main cache DB.

## Layout

- `lab/`
  - `collect/run.ts` – data collection entrypoint (YouTube search)
  - `analyze/run.ts` – analyzer for saved responses
  - `data/` – stored raw JSON and any derived analysis artifacts

## Running the Lab

From `lab/` (after `npm install` and `YOUTUBE_API_KEY` is set in your shell or a local `.env`):

```bash
npm install
npm run collect   # collects YouTube search responses
npm run analyze   # scans saved files for strict time matches
```

Notes:
- The collector builds multiple 12-hour time variants and appends `-january ... -december` to queries to avoid month/date hits.
- The current collector also sends `publishedBefore=2015-01-01T00:00:00Z` to bias toward older uploads.
- Saved files are written under `lab/data/*_test_result.json` with the request metadata (API key redacted).

## Next Steps (for future work)

- Plug in the existing YouTube search logic from `backend/src/search.ts` into the lab scripts.
- Implement JSON storage structure under `backend/lab/data/` (e.g., by date and time).
- Add analysis routines that:
  - Count results per time/variant.
  - Examine title patterns and false positives.
  - Compare different query parameter choices.
- Generate a short human-readable report (Markdown or text) summarizing findings and suggested code changes.
