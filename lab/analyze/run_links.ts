import fs from 'fs';
import path from 'path';

interface VideoEntry {
    videoId: string;
    title: string;
    sourceFile: string;
}

function getDataFiles(dataDir: string): string[] {
    if (!fs.existsSync(dataDir)) {
        return [];
    }
    return fs
        .readdirSync(dataDir)
        .filter((file) => file.endsWith('.json'))
        .map((file) => path.join(dataDir, file));
}

function extractVideosFromFile(filePath: string): VideoEntry[] {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const items = data?.response?.items ?? [];
    const sourceFile = path.basename(filePath);

    return items
        .map((item: any) => {
            const videoId = item?.id?.videoId || item?.id;
            const title = item?.snippet?.title ?? '(no title)';
            if (!videoId || typeof videoId !== 'string') {
                return null;
            }
            return { videoId, title, sourceFile } as VideoEntry;
        })
        .filter((entry: VideoEntry | null): entry is VideoEntry => Boolean(entry));
}

async function main() {
    const dataDir = './data';
    const files = getDataFiles(dataDir);

    if (files.length === 0) {
        console.log('No JSON data files found under ./data. Run collect scripts first.');
        return;
    }

    const seen = new Set<string>();
    const allVideos: VideoEntry[] = [];

    for (const filePath of files) {
        const entries = extractVideosFromFile(filePath);
        for (const entry of entries) {
            if (seen.has(entry.videoId)) continue;
            seen.add(entry.videoId);
            allVideos.push(entry);
        }
    }

    if (allVideos.length === 0) {
        console.log('No videos found in the data files.');
        return;
    }

    console.log(`Found ${allVideos.length} unique videos across ${files.length} file(s):\n`);
    allVideos.forEach((entry, idx) => {
        const num = String(idx + 1).padStart(3, ' ');
        console.log(`${num}. ${entry.title} \n    https://www.youtube.com/watch?v=${entry.videoId} (source: ${entry.sourceFile})\n`);
    });
}

main().catch((err) => {
    console.error('Unexpected error in lab:analyze-links', err);
    process.exit(1);
});
