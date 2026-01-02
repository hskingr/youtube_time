# Lab - TypeScript Experimentation

This directory contains TypeScript scripts for testing and experimenting with YouTube API functionality.

## Setup

Dependencies are managed in this directory:
```bash
cd lab
npm install
```

The `.env` file is symlinked from `../backend/.env` automatically.

## Running Scripts

From the lab directory:
```bash
npm run collect  # Run collect/run.ts
npm run collect:custom "your query"  # Run collect/run_custom_query.ts with any search query
npm run analyze  # Run analyze/run.ts
npm run analyze:links  # List all collected video links across data files
```

Notes:
- Time-based collector saves to `lab/data/*_test_result.json` and uses `publishedBefore=2015-01-01T00:00:00Z`.
- Custom collector saves to `lab/data/*_query_<slug>.json` and currently uses `publishedBefore=2013-01-01T00:00:00Z`.

Or from the backend directory:
```bash
npm run lab:collect
npm run lab:analyze
```

## Importing Backend Code

You can import TypeScript files from the backend:
```typescript
import { makeYouTubeApiRequest } from '../backend/src/search.js';
```

Note: Use `.js` extension even for `.ts` files (ESM convention).

## How It Works

- Uses `ts-node/esm` loader to run TypeScript directly
- `tsconfig.json` extends backend configuration
- Scripts have access to backend source code without compilation
