import 'dotenv/config';
import { makeYouTubeApiRequest } from '../../backend/src/search.js';
import fs from 'fs';

/**
 * Generate time format variants for a given HH:MM time.
 * Returns an array of search patterns covering common formats.
 */
function generateTimeFormatVariants(hour: number, minute: number): string[] {
    const minuteStr = minute.toString().padStart(2, '0');
    const variants: string[] = [];

    // 12-hour formats
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const ampmLower = ampm.toLowerCase();

    // Hour with/without leading zero
    const hour12Str = hour12.toString();
    const hour12PaddedStr = hour12.toString().padStart(2, '0');

    // Common 12-hour variants
    variants.push(`${hour12Str}:${minuteStr} ${ampm}`);        // "7:34 PM"
    variants.push(`${hour12Str}:${minuteStr} ${ampmLower}`);   // "7:34 pm"
    variants.push(`${hour12Str}:${minuteStr}${ampm}`);         // "7:34PM"
    variants.push(`${hour12Str}:${minuteStr}${ampmLower}`);    // "7:34pm"
    variants.push(`${hour12PaddedStr}:${minuteStr}${ampmLower}`); // "07:34pm"
    variants.push(`${hour12Str}:${minuteStr} ${ampm.charAt(0)}.${ampm.charAt(1)}.`); // "7:34 P.M."

    // 24-hour formats
    // const hour24Str = hour.toString().padStart(2, '0');
    // variants.push(`${hour24Str}:${minuteStr}`);                // "19:34"

    return variants;
}

/**
 * Build a YouTube search query string from time variants.
 */
function buildSearchQuery(variants: string[]): string {
    const baseQuery = variants.map(v => `"${v}"`).join(' | ');
    const monthExclusions = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
    ];

    // Exclude obvious month terms to avoid date-like matches (e.g., "May 7:34").
    const exclusionTokens = monthExclusions.map(month => `-${month}`).join(' ');
    return `${baseQuery} ${exclusionTokens}`.trim();
}

async function main() {
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
        console.error('YOUTUBE_API_KEY is not set. Please configure backend/.env before running the lab.');
        process.exit(1);
    }

    console.log('YouTube Time Matcher – Lab: Collect');
    console.log('YOUTUBE_API_KEY is configured.');

    // Example: collect data for a specific time
    const hour = 4;
    const minute = 11;
    const timeVariants = generateTimeFormatVariants(hour, minute);
    const testQuery = buildSearchQuery(timeVariants);

    console.log(`\nSearching for time: ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    console.log(`Query variants: ${timeVariants.length}`);
    console.log(`Query: ${testQuery.substring(0, 100)}...`);

    const params = {
        key: apiKey,
        part: 'snippet',
        q: testQuery,
        maxResults: 50,
        type: 'video',
        videoEmbeddable: 'true',
        videoSyndicated: 'true',
        safeSearch: 'moderate',
        publishedBefore: '2015-01-01T00:00:00Z'

    };

    const result = await makeYouTubeApiRequest('search', params);
    const data = result?.data;

    if (!result) {
        console.log(`Test query "${testQuery}" returned no data.`);
        return;
    }

    console.log(`\nFound ${data.pageInfo.totalResults} total results (showing ${data.items?.length || 0})`);

    // Prepare data for saving
    const clearedParams = { ...params };
    clearedParams.key = 'REDACTED';

    const dataToSave = {
        time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        variants: timeVariants,
        request: { params: clearedParams },
        response: data
    };

    // Save results with sanitized filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const timeStr = `${hour.toString().padStart(2, '0')}_${minute.toString().padStart(2, '0')}`;
    const filename = `./data/${timestamp}_time_${timeStr}_test_result.json`;

    fs.mkdirSync('./data', { recursive: true });
    fs.writeFileSync(filename, JSON.stringify(dataToSave, null, 2));
    console.log(`\nResults saved to: ${filename}`);
}

main().catch((err) => {
    console.error('Unexpected error in lab:collect', err);
    process.exit(1);
});
