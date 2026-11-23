// Deterministic 1080x1920 @ 60fps capture & final TikTok compositor for Bramble Hop.
// 1. Synthesizes cozy 16-bit chiptune & SFX stereo soundtrack WAV.
// 2. Streams 1332 raw RGBA frames (22.2s @ 60fps) from headless Chrome directly into ffmpeg.
// 3. Overlays make.fun's unmodified 9:16 transparent referral card at t=18.2s (with blur+desat
//    ease-in on the live Day 7 background per press-pack spec), types referral code 93p1fwth
//    in true Menlo Bold (#191419) starting at rest_s=1.433s, holds cleanly, and muxes stereo AAC.

import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { generateSoundtrack } from './synth-audio.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const GAME_DIR = join(REPO_ROOT, 'game');
const WORK_DIR = resolve(REPO_ROOT, '../../run/tiktok-day1-day7');
const CARD_WEBM = resolve(REPO_ROOT, '../../run/tiktok-day1-day-seven-card.webm');
const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 60;
const TOTAL_FRAMES = 1332; // 22.2s
const DURATION = 22.2;
const CARD_START = 18.2;
const REFERRAL_CODE = '93p1fwth';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

function runCmd(bin, args, label) {
  console.log(`[${bin}] ${label}...`);
  const res = spawnSync(bin, args, { stdio: 'inherit' });
  if (res.status !== 0) {
    throw new Error(`${bin} (${label}) exited with code ${res.status}`);
  }
}

async function captureGameplay(rawVideoPath) {
  const ff = spawn(
    'ffmpeg',
    [
      '-y',
      '-f', 'rawvideo',
      '-pix_fmt', 'rgba',
      '-s', `${WIDTH}x${HEIGHT}`,
      '-r', String(FPS),
      '-i', 'pipe:0',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '16',
      '-pix_fmt', 'yuv420p',
      rawVideoPath,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );

  let received = 0;
  let resolveDone;
  let rejectDone;
  const donePromise = new Promise((res, rej) => {
    resolveDone = res;
    rejectDone = rej;
  });

  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'POST' && url.pathname === '/frame') {
      if (url.searchParams.get('done') === '1') {
        res.writeHead(200);
        res.end('ok');
        ff.stdin.end();
        return;
      }
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const buf = Buffer.concat(chunks);
        received += 1;
        if (received % 150 === 0 || received === TOTAL_FRAMES) {
          console.log(`[capture] ${received}/${TOTAL_FRAMES} frames`);
        }
        const ok = ff.stdin.write(buf);
        if (ok) {
          res.writeHead(200);
          res.end('ok');
        } else {
          ff.stdin.once('drain', () => {
            res.writeHead(200);
            res.end('ok');
          });
        }
      });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/error') {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        res.writeHead(200);
        res.end('ok');
        rejectDone(new Error(Buffer.concat(chunks).toString('utf8')));
      });
      return;
    }

    const rel = url.pathname === '/' ? 'render.html' : url.pathname.replace(/^\/+/, '');
    const filePath = join(GAME_DIR, rel);
    if (!existsSync(filePath)) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(readFileSync(filePath));
  });

  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const { port } = server.address();
  const targetUrl = `http://127.0.0.1:${port}/render.html?capture=1&frames=${TOTAL_FRAMES}`;
  console.log(`[capture] Launching headless Chrome on ${targetUrl}`);

  const chrome = spawn(
    CHROME_BIN,
    [
      '--headless=new',
      '--disable-gpu-sandbox',
      '--no-sandbox',
      '--window-size=1080,1920',
      '--force-device-scale-factor=1',
      '--autoplay-policy=no-user-gesture-required',
      targetUrl,
    ],
    { stdio: 'ignore' },
  );

  ff.on('exit', (code) => {
    if (code === 0) resolveDone();
    else rejectDone(new Error(`ffmpeg raw capture exited ${code}`));
  });

  try {
    await donePromise;
  } finally {
    chrome.kill('SIGTERM');
    server.close();
  }
}

function renderBoldCodeOverlay(outPngPath) {
  // Renders the referral code in true Menlo Bold (index=1, 62px, #191419) onto a transparent
  // 1080x1920 PNG aligned to the press-pack 9:16 code box (x=212, centre_y=1271) + white caret cover.
  const py = `
from PIL import Image, ImageDraw, ImageFont
img = Image.new("RGBA", (1080, 1920), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
draw.rectangle([208, 1230, 217, 1312], fill=(255, 255, 255, 255))
font = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 62, index=1)
bbox = draw.textbbox((0, 0), "${REFERRAL_CODE}", font=font)
th = bbox[3] - bbox[1]
ty = int(round(1271 - th / 2 - bbox[1]))
draw.text((214, ty), "${REFERRAL_CODE}", font=font, fill=(0x19, 0x14, 0x19, 255))
img.save("${outPngPath}")
`;
  runCmd('python3', ['-c', py], 'render Menlo Bold referral code overlay');
}

async function main() {
  mkdirSync(WORK_DIR, { recursive: true });
  if (!existsSync(CARD_WEBM)) {
    throw new Error(`Missing press-pack referral card at ${CARD_WEBM}`);
  }

  const audioPath = join(WORK_DIR, 'bramble-soundtrack.wav');
  const rawVideoPath = join(WORK_DIR, 'bramble-raw.mp4');
  const codeOverlayPng = join(WORK_DIR, 'referral-code-bold.png');
  const finalVideoPath = join(WORK_DIR, 'bramble-hop-day1-day7-tiktok.mp4');

  console.log('[audio] Synthesizing cozy 16-bit chiptune & SFX soundtrack...');
  generateSoundtrack(audioPath);

  renderBoldCodeOverlay(codeOverlayPng);

  console.log('[capture] Rendering 1332 deterministic 1080x1920 @ 60fps pixel-art frames...');
  await captureGameplay(rawVideoPath);

  const typeStart = (CARD_START + 1.433).toFixed(3); // 19.633s
  const typeEnd = (CARD_START + 1.433 + 0.52).toFixed(3);

  // Press-pack faithful composite:
  // - 0..18.2s: crisp pixel-art gameplay
  // - 18.2..22.2s: live gameplay eases into blur + desaturated under the 9:16 transparent card
  // - Card decoded with libvpx-vp9 (preserves alpha), held +1.5s via tpad
  // - Menlo Bold 93p1fwth reveals cleanly left-to-right starting at rest_s=1.433s, then holds!
  const filterComplex = [
    `[0:v]split=2[main][tail]`,
    `[main]trim=0:${CARD_START},setpts=PTS-STARTPTS[v_main]`,
    `[tail]trim=${CARD_START}:${DURATION},setpts=PTS-STARTPTS,split=2[t_clean][t_blur]`,
    `[t_blur]gblur=sigma=24,eq=saturation=0.22:brightness=-0.04,format=yuva420p,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255*min(1,T/0.8)'[t_blur_a]`,
    `[t_clean][t_blur_a]overlay=shortest=1:format=auto[v_tail]`,
    `[v_main][v_tail]concat=n=2:v=1:a=0[bg]`,
    `[1:v]format=yuva420p,tpad=stop_mode=clone:stop_duration=1.5,setpts=PTS+${CARD_START}/TB[card]`,
    `[bg][card]overlay=eof_action=pass:format=auto[with_card]`,
    `[3:v]format=rgba,loop=loop=-1:size=1:start=0,setpts=N/(${FPS}*TB),trim=0:${DURATION},geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lt(T,${typeStart}),0,if(lt(X,208+340*min(1,(T-${typeStart})/0.52)),alpha(X,Y),0))'[code_reveal]`,
    `[with_card][code_reveal]overlay=format=auto,format=yuv420p[vout]`,
  ].join(';');

  runCmd(
    'ffmpeg',
    [
      '-y',
      '-i', rawVideoPath,
      '-c:v', 'libvpx-vp9',
      '-i', CARD_WEBM,
      '-i', audioPath,
      '-i', codeOverlayPng,
      '-filter_complex', filterComplex,
      '-map', '[vout]',
      '-map', '2:a',
      '-c:v', 'libx264',
      '-profile:v', 'high',
      '-level', '4.2',
      '-preset', 'medium',
      '-crf', '18',
      '-r', String(FPS),
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ar', '48000',
      '-movflags', '+faststart',
      '-t', String(DURATION),
      finalVideoPath,
    ],
    'final composite + referral card + Menlo Bold code + audio mux',
  );

  // Extract visual verification stills across every beat
  const checks = [
    ['v2-01-day1.png', '0.9'],
    ['v2-02-day7-slash.png', '2.37'],
    ['v2-03-day1-mid.png', '4.4'],
    ['v2-04-split-wipe.png', '9.8'],
    ['v2-05-chest-open.png', '12.65'],
    ['v2-06-closing-cta.png', '16.5'],
    ['v2-07-endcard-bold.png', '21.2'],
  ];
  for (const [name, ts] of checks) {
    runCmd(
      'ffmpeg',
      ['-y', '-ss', ts, '-i', finalVideoPath, '-frames:v', '1', join(WORK_DIR, name)],
      `extract ${name}`,
    );
  }

  console.log(`[done] TikTok-ready video saved to: ${finalVideoPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
