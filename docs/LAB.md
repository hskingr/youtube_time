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
  - `collect/run_custom_query.ts` – collector for arbitrary YouTube searches (free-form queries)
  - `analyze/run.ts` – analyzer for saved responses
  - `analyze/run_links.ts` – prints all unique YouTube links found in saved data
  - `data/` – stored raw JSON and any derived analysis artifacts

## Running the Lab

From `lab/` (after `npm install` and `YOUTUBE_API_KEY` is set in your shell or a local `.env`):

```bash
npm install
npm run collect   # collects YouTube search responses
npm run collect:custom "lofi hip hop 2014"  # collects responses for any custom query
npm run analyze:links  # prints clickable YouTube URLs from saved data
npm run analyze   # scans saved files for strict time matches
```

Notes:
- The time-based collector builds multiple 12-hour time variants and appends `-january ... -december` to queries to avoid month/date hits.
- The time-based collector uses `publishedBefore=2015-01-01T00:00:00Z` to bias toward older uploads; the custom collector currently uses `publishedBefore=2013-01-01T00:00:00Z`.
- The custom collector accepts any search string plus `--max-results` to override the default 50.
- Saved files are written under `lab/data/*_test_result.json` (time collector) and `lab/data/*_query_<slug>.json` (custom collector) with the request metadata (API key redacted).

## Next Steps (for future work)

- Plug in the existing YouTube search logic from `backend/src/search.ts` into the lab scripts.
- Implement JSON storage structure under `backend/lab/data/` (e.g., by date and time).
- Add analysis routines that:
  - Count results per time/variant.
  - Examine title patterns and false positives.
  - Compare different query parameter choices.
- Generate a short human-readable report (Markdown or text) summarizing findings and suggested code changes.
