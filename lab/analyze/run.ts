import 'dotenv/config';
import fs from 'fs';
import path from 'path';

/**
 * Entry point for YouTube lab data analysis.
 */
async function main() {
  console.log('YouTube Time Matcher – Lab: Analyze');

  // 1. STRICT REGEX
  // (?<!\d)                 : Prevents matching inside longer numbers
  // (\d{2}):(\d{2})         : Exactly HH:MM
  // (?!:\d{2})              : Rejects HH:MM:SS
  // \s*                     : Optional space
  // (am|pm|a\.m\.|p\.m\.)   : Matches am/pm and a.m./p.m. (case-insensitive)
  // /gi                     : Global + case-insensitive
  const strictTimeRegex = /(?<!\d)(\d{1,2}):(\d{2})(?!:\d{2})\s*(AM|am|pm|a\.m\.|p\.m\.)/gi;

  const dataDir = './data/'; // Ensure this matches your save path

  // Check if directory exists
  if (!fs.existsSync(dataDir)) {
    console.error(`Directory not found: ${dataDir}`);
    return;
  }

  const files = fs.readdirSync(dataDir).filter(file => file.endsWith('_test_result.json'));

  if (files.length === 0) {
    console.log("No data files found to analyze.");
    return;
  }

  console.log(`Found ${files.length} data files to analyze.`);

  let totalVideosProcessed = 0;
  let totalValidMatches = 0;

  for (const file of files) {
    console.log(`\n📄 Processing: ${file}`);
    const filePath = path.join(dataDir, file);
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(rawData);

    // Safety check for empty responses
    const items = data.response?.items || [];

    if (items.length === 0) {
      console.log(`   (Skipping empty file)`);
      continue;
    }

    // 2. Apply the Regex Filter Loop
    items.forEach((item: any) => {
      totalVideosProcessed++;
      const title = item.snippet.title;

      // 2. FIND ALL MATCHES
      const matches = title.match(strictTimeRegex);

      // 3. APPLY RULES
      // Rule A: Must have found at least one match
      // Rule B: Must NOT have found more than one (e.g. "12:34 pm vs 12:34 pm")
      if (matches && matches.length === 1) {

        // Optional: Normalize the string visually if you need to save it cleanly
        // (This standardizes "12:34 PM" and "12:34pm" to look identical if needed)
        const cleanTime = matches[0].replace(/\s+/g, '').toLowerCase();

        console.log(`   ✅ VALID: "${title}", Upload Date: ${item.snippet.publishTime.split('T')[0]}`);
        console.log(`https://www.youtube.com/watch?v=${item.id.videoId}`);
        totalValidMatches++;
      } else if (matches && matches.length > 1) {
        console.log(`   ⚠️ REJECT (Multiple Times): "${title}"`);
      } else {
        // No match, or it had punctuation issues like "12;34"
        // console.log(`   ❌ REJECT (Format/None): "${title}"`);
      }
    });
  }

  // 3. Final Report
  console.log('\n-------------------------------------------');
  console.log(`Analysis Complete.`);
  console.log(`Total Videos Scanned: ${totalVideosProcessed}`);
  console.log(`Strict "12:34 PM" Matches: ${totalValidMatches}`);
  console.log(`Hit Rate: ${((totalValidMatches / totalVideosProcessed) * 100).toFixed(2)}%`);
  console.log('-------------------------------------------');
}

main().catch((err) => {
  console.error('Unexpected error in lab:analyze', err);
  process.exit(1);
});