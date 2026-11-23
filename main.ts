// Corebreaker — Day One, Day Seven entry for make.fun (Node 22, standard library only).
// Reads VIDEO.json from the repository root and writes a validated copy to /output/VIDEO.json.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const sourceRoot = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const outputRoot = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const TIKTOK_VIDEO_PATTERN = /^https:\/\/(?:www\.|m\.)?tiktok\.com\/(?:@[^/]+\/video\/\d+|v\/\d+\.html)(?:[?#].*)?$/;

function publishVideoManifest(): void {
  const inputPath = join(sourceRoot, 'VIDEO.json');
  const raw = readFileSync(inputPath, 'utf8');
  const parsed: unknown = JSON.parse(raw);

  if (!parsed || typeof parsed !== 'object' || typeof (parsed as { url?: unknown }).url !== 'string') {
    throw new Error('VIDEO.json must contain a string "url" property');
  }

  const videoUrl = (parsed as { url: string }).url.trim();
  if (!TIKTOK_VIDEO_PATTERN.test(videoUrl)) {
    throw new Error(`VIDEO.json url is not a full TikTok video address: ${videoUrl}`);
  }

  mkdirSync(outputRoot, { recursive: true });
  const destination = join(outputRoot, 'VIDEO.json');
  writeFileSync(destination, JSON.stringify({ url: videoUrl }) + '\n', 'utf8');
}

try {
  publishVideoManifest();
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`Failed to publish VIDEO.json: ${detail}`);
  process.exit(1);
}
