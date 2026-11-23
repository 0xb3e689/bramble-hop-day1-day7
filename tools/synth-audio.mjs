// Pure Node.js stereo 48kHz WAV synthesizer for Bramble Hop (Day 1 vs Day 7).
// Day 1: near-silent prototype with sparse dry placeholder jump boop & coin blip.
// Day 7: warm cozy 16-bit chiptune (F major pentatonic) + cute tactile SFX + chest fanfare.

import { writeFileSync } from 'node:fs';

const SAMPLE_RATE = 48000;
const DURATION = 22.2;
const TOTAL_SAMPLES = Math.floor(SAMPLE_RATE * DURATION);

function isDay1(t) {
  return (t >= 0.0 && t < 1.8) || (t >= 3.8 && t < 5.6) || (t >= 7.6 && t < 8.8);
}

function isEndCard(t) {
  return t >= 18.2;
}

function midiToHz(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function triangle(phase) {
  const f = phase - Math.floor(phase);
  return 4 * Math.abs(f - 0.5) - 1;
}

function pulse25(phase) {
  return (phase - Math.floor(phase)) < 0.25 ? 1 : -1;
}

function clamp(v) {
  return Math.max(-0.96, Math.min(0.96, v));
}

export function generateSoundtrack(outPath) {
  const left = new Float32Array(TOTAL_SAMPLES);
  const right = new Float32Array(TOTAL_SAMPLES);

  // Cozy 116 BPM indie pixel melody (1 step = 8th note = 0.25862s)
  const STEP = 60 / 116 / 2;
  // Warm F major / D minor nostalgic 16-bit lead (Celeste / GBA vibe)
  const melody = [
    65, 69, 72, 74, 72, 69, 67, 65,
    62, 65, 69, 72, 69, 67, 65, 0,
    65, 69, 72, 77, 74, 72, 69, 72,
    74, 72, 69, 67, 65, 0,  69, 67,
  ];
  const bass = [
    41, 41, 48, 41, 45, 45, 48, 45,
    38, 38, 45, 38, 43, 43, 48, 43,
    46, 46, 53, 46, 41, 41, 48, 41,
    43, 43, 50, 43, 48, 48, 52, 48,
  ];
  const arp = [
    [53, 57, 60],
    [50, 53, 57],
    [58, 62, 65],
    [55, 60, 64],
  ];

  // Key gameplay SFX timestamps matched to BrambleSim's choreography
  const jumpTimes = [1.36, 3.32, 6.42, 10.22, 13.42, 15.12];
  const slashTimes = [2.35, 5.85, 9.45, 16.40];
  const coinTimes = [0.55, 0.92, 2.75, 4.10, 4.65, 6.50, 7.25, 11.15, 13.10, 14.55, 15.95, 16.90];
  const chestTime = 12.25;
  const typeStart = 18.2 + 1.433; // 19.633s

  let rng = 90210;
  function noise() {
    rng = (rng * 1664525 + 1013904223) >>> 0;
    return (rng / 4294967296) * 2 - 1;
  }

  let leadPhase = 0;
  let bassPhase = 0;
  let arpPhase = 0;
  let padPhases = [0, 0, 0];
  let lpL = 0;
  let lpR = 0;

  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const d1 = isDay1(t);
    const ec = isEndCard(t);
    const stepIdx = Math.floor(t / STEP);
    const stepPos = (t % STEP) / STEP;
    const stepT = stepPos * STEP;

    let sL = 0;
    let sR = 0;

    if (!d1 && !ec) {
      // Cozy 16-bit background music on Day 7
      const mNote = melody[stepIdx % melody.length];
      if (mNote > 0) {
        leadPhase += midiToHz(mNote) / SAMPLE_RATE;
        const env = Math.min(1, stepT / 0.012) * Math.exp(-stepT * 5.2);
        const wave = (pulse25(leadPhase) * 0.45 + Math.sin(2 * Math.PI * leadPhase) * 0.55) * env * 0.16;
        sL += wave * 1.05;
        sR += wave * 0.95;
      }

      // Warm triangle bassline
      const bNote = bass[stepIdx % bass.length];
      bassPhase += midiToHz(bNote) / SAMPLE_RATE;
      const bEnv = Math.exp(-stepT * 4.5) * 0.24;
      const bWave = triangle(bassPhase) * bEnv;
      sL += bWave;
      sR += bWave;

      // Soft twinkling 16th harp arpeggio
      const subStep = Math.floor(t / (STEP / 2));
      const subT = t % (STEP / 2);
      const chord = arp[Math.floor(stepIdx / 8) % arp.length];
      const aNote = chord[subStep % 3] + 12;
      arpPhase += midiToHz(aNote) / SAMPLE_RATE;
      const aEnv = Math.exp(-subT * 14) * 0.085;
      const aWave = Math.sin(2 * Math.PI * arpPhase) * aEnv;
      const pan = subStep % 2 === 0 ? 0.65 : 0.35;
      sL += aWave * pan * 1.4;
      sR += aWave * (1 - pan) * 1.4;

      // Soft cozy lo-fi percussion (gentle kick + brushed shaker)
      if (stepIdx % 4 === 0 && stepT < 0.12) {
        const k = Math.sin(2 * Math.PI * (55 + 75 * Math.exp(-stepT * 32)) * stepT) * Math.exp(-stepT * 18) * 0.22;
        sL += k;
        sR += k;
      }
      if (stepIdx % 2 === 1 && stepT < 0.035) {
        const sh = noise() * Math.exp(-stepT * 85) * 0.055;
        sL += sh * 0.85;
        sR += sh * 1.15;
      }
    } else if (ec) {
      // Gentle fading music-box Fmaj7 chord + crisp subtle key taps for 93p1fwth
      const ecT = t - 18.2;
      const fade = t > 21.4 ? Math.max(0, (22.2 - t) / 0.8) : Math.min(1, ecT / 0.25);
      const notes = [midiToHz(65), midiToHz(69), midiToHz(72)];
      let pad = 0;
      for (let p = 0; p < 3; p++) {
        padPhases[p] += notes[p] / SAMPLE_RATE;
        pad += Math.sin(2 * Math.PI * padPhases[p]) * 0.075;
      }
      sL += pad * fade;
      sR += pad * fade;

      for (let c = 0; c < 8; c++) {
        const ct = t - (typeStart + c * 0.065);
        if (ct >= 0 && ct < 0.018) {
          const clk = (noise() * 0.35 + Math.sin(2 * Math.PI * (2100 + c * 90) * ct) * 0.65) * Math.exp(-ct * 170) * 0.2;
          sL += clk;
          sR += clk;
        }
      }
    }

    // Jump SFX (dry tiny beep on Day 1, bouncy warm boing on Day 7)
    for (const jt of jumpTimes) {
      const dt = t - jt;
      if (dt >= 0 && dt < 0.11) {
        const f = d1 ? 310 + dt * 1100 : 280 + dt * 2100;
        const env = Math.exp(-dt * 24) * (d1 ? 0.10 : 0.17);
        const w = (d1 ? pulse25(dt * f) : triangle(dt * f)) * env;
        sL += w;
        sR += w;
      }
    }

    // Coin pickup SFX (dry blip on Day 1, classic two-tone sparkle ding on Day 7)
    for (const ct of coinTimes) {
      const dt = t - ct;
      if (dt >= 0 && dt < 0.18) {
        const f = d1 ? 880 : (dt < 0.055 ? 988 : 1318);
        const env = Math.exp(-dt * (d1 ? 34 : 18)) * (d1 ? 0.09 : 0.16);
        const w = (d1 ? pulse25(dt * f) : Math.sin(2 * Math.PI * f * dt)) * env;
        sL += w * 0.9;
        sR += w * 1.1;
      }
    }

    // Sword slash + cute slime pop SFX (Day 7)
    for (const st of slashTimes) {
      const dt = t - st;
      if (dt >= 0 && dt < 0.15) {
        const swish = noise() * Math.exp(-dt * 42) * (d1 ? 0.05 : 0.14);
        const pop = Math.sin(2 * Math.PI * (420 * Math.exp(-dt * 14)) * dt) * Math.exp(-dt * 22) * (d1 ? 0.06 : 0.22);
        sL += swish + pop;
        sR += swish + pop;
      }
    }

    // Treasure chest joyful 5-note sparkle arpeggio at 12.25s!
    const dch = t - chestTime;
    if (dch >= 0 && dch < 0.85) {
      const fanfare = [65, 69, 72, 77, 81];
      const idx = Math.min(4, Math.floor(dch / 0.09));
      const localT = dch - idx * 0.09;
      if (localT >= 0) {
        const hz = midiToHz(fanfare[idx]);
        const env = Math.exp(-localT * (idx === 4 ? 3.5 : 14)) * 0.22;
        const bell = (Math.sin(2 * Math.PI * hz * localT) * 0.7 + triangle(hz * localT) * 0.3) * env;
        sL += bell;
        sR += bell;
      }
    }

    // Warm 16-bit low-pass smoothing so square harmonics stay cozy, never harsh
    const alpha = d1 ? 0.45 : 0.26;
    lpL += (sL - lpL) * alpha;
    lpR += (sR - lpR) * alpha;

    left[i] = clamp(Math.tanh(lpL * 1.12));
    right[i] = clamp(Math.tanh(lpR * 1.12));
  }

  // Encode stereo 16-bit PCM WAV
  const numChannels = 2;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = SAMPLE_RATE * blockAlign;
  const dataSize = TOTAL_SAMPLES * blockAlign;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    buf.writeInt16LE(Math.round(left[i] * 32767), offset);
    buf.writeInt16LE(Math.round(right[i] * 32767), offset + 2);
    offset += 4;
  }

  writeFileSync(outPath, buf);
  return outPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2] || 'soundtrack.wav';
  generateSoundtrack(out);
  console.log(`Wrote ${out} (${DURATION}s stereo 48kHz WAV)`);
}
