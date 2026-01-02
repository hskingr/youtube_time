import 'dotenv/config';
import { makeYouTubeApiRequest } from '../../backend/src/search.js';
import fs from 'fs';

function parseCliArgs() {
    const args = process.argv.slice(2);
    const cliOptions = {
        query: '',
        maxResults: 50,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--help' || arg === '-h') {
            return { ...cliOptions, help: true } as const;
        }

        if ((arg === '--max-results' || arg === '--limit') && args[i + 1]) {
            const value = Number(args[i + 1]);
            if (!Number.isNaN(value) && value > 0) {
                cliOptions.maxResults = value;
            }
            i += 1;
            continue;
        }

        // Everything else is treated as part of the query
        cliOptions.query = args.slice(i).join(' ');
        break;
    }

    return cliOptions;
}

function sanitizeForFilename(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'query';
}

async function main() {
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
        console.error('YOUTUBE_API_KEY is not set. Please configure backend/.env before running the lab.');
        process.exit(1);
    }

    const cli = parseCliArgs();

    if (!cli.query || (cli as { help?: boolean }).help) {
        console.log('Usage: npx ts-node lab/collect/run_custom_query.ts [--max-results N] "your search query"');
        console.log('Example: npx ts-node lab/collect/run_custom_query.ts "lofi hip hop 2014"');
        return;
    }

    const { query, maxResults } = cli as { query: string; maxResults: number };

    console.log('YouTube Time Matcher – Lab: Custom Query');
    console.log('YOUTUBE_API_KEY is configured.');
    console.log(`\nSearching for custom query: ${query}`);
    console.log(`maxResults: ${maxResults}`);

    const params = {
        key: apiKey,
        part: 'snippet',
        q: query,
        maxResults,
        type: 'video',
        videoEmbeddable: 'true',
        videoSyndicated: 'true',
        safeSearch: 'moderate',
        publishedBefore: '2013-01-01T00:00:00Z',
        location: '53.621186,-2.8315645',
        locationRadius: '1000km',
    };

    const result = await makeYouTubeApiRequest('search', params);
    const data = result?.data;

    if (!result) {
        console.log(`Custom query "${query}" returned no data.`);
        return;
    }

    console.log(`\nFound ${data.pageInfo.totalResults} total results (showing ${data.items?.length || 0})`);

    // Prepare data for saving
    const clearedParams = { ...params };
    clearedParams.key = 'REDACTED';

    const dataToSave = {
        query,
        request: { params: clearedParams },
        response: data,
    };

    // Save results with sanitized filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const querySlug = sanitizeForFilename(query);
    const filename = `./data/${timestamp}_query_${querySlug}.json`;

    fs.mkdirSync('./data', { recursive: true });
    fs.writeFileSync(filename, JSON.stringify(dataToSave, null, 2));
    console.log(`\nResults saved to: ${filename}`);
}

main().catch((err) => {
    console.error('Unexpected error in lab:custom-query', err);
    process.exit(1);
});
