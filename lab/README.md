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
npm run analyze  # Run analyze/run.ts
```

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
