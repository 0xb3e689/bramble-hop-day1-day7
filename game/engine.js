// BRAMBLE HOP — Shared deterministic 16-bit pixel-art engine for "Day one, day seven"
// Logical resolution: 180 x 320 (exact 6x integer scale to 1080 x 1920, nearest-neighbor).
// Locked camera, identical room platforms, identical scripted jump/combat path in Day 1 & Day 7.

export const LW = 180;
export const LH = 320;
export const SCALE = 6;
export const WIDTH = LW * SCALE;   // 1080
export const HEIGHT = LH * SCALE;  // 1920

// Identical platform geometry used by BOTH Day 1 and Day 7
export const PLATFORMS = [
  { x: 10, y: 238, w: 160, h: 16, kind: 'ground' },
  { x: 14, y: 196, w: 62,  h: 11, kind: 'ledge' },
  { x: 96, y: 164, w: 68,  h: 11, kind: 'ledge' },
  { x: 20, y: 132, w: 64,  h: 11, kind: 'ledge' },
  { x: 58, y: 98,  w: 66,  h: 12, kind: 'shrine' },
];

export const TORCHES = [
  { x: 22, y: 226 },
  { x: 154, y: 226 },
  { x: 65, y: 86 },
  { x: 115, y: 86 },
];

export const CHEST_POS = { x: 84, y: 87, w: 14, h: 11 };

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Handcrafted pixel sprite matrices (0 = transparent)
const KNIGHT_IDLE = [
  '....rrrr....',
  '...rRRRRr...',
  '...ssssss...',
  '..sWWwwWWs..',
  '..sWkkkkWs..',
  '..sWWWWWWs..',
  '...bbbbbb...',
  '..bBbbbbBb..',
  '..bBbbbbBb..',
  '...bBBBBb...',
  '...dd..dd...',
  '...dd..dd...',
];

const KNIGHT_RUN = [
  '....rrrr....',
  '...rRRRRr...',
  '...ssssss...',
  '..sWWwwWWs..',
  '..sWkkkkWs..',
  '..sWWWWWWs..',
  '...bbbbbb...',
  '..bBbbbbBb..',
  '..bBbbbbBb..',
  '...bBBBBb...',
  '..dd....dd..',
  '.dd......dd.',
];

const SLIME_A = [
  '...gggg...',
  '..gGggGg..',
  '.gGGggggg.',
  '.ggkggkgg.',
  'gggggggggg',
  'gggggggggg',
  'gddddddddg',
  '.dddddddd.',
];

const SLIME_B = [
  '..........',
  '..gggggg..',
  '.gGGggggg.',
  'gggkggkggg',
  'gggggggggg',
  'gggggggggg',
  'gddddddddg',
  '.dddddddd.',
];

const CHEST_CLOSED = [
  '.oooooooooooo.',
  'oBBBBByyBBBBBo',
  'oBBBBByyBBBBBo',
  'oBBBBByyBBBBBo',
  'oyyyyyyyyyyyyo',
  'oBBBBBYYBBBBBo',
  'oBBBBByyBBBBBo',
  'oBBBBByyBBBBBo',
  'oBBBBByyBBBBBo',
  'oDDDDDyyDDDDDo',
  '.oooooooooooo.',
];

const CHEST_OPEN = [
  '..oooooooooo..',
  '.oDDDDDDDDDDo.',
  '.oBBBBBBBBBBoo',
  'ooyyyyyyyyyyoo',
  'oGGGGGGGGGGGGo',
  'oBBBBByyBBBBBo',
  'oBBBBByyBBBBBo',
  'oBBBBByyBBBBBo',
  'oBBBBByyBBBBBo',
  'oDDDDDyyDDDDDo',
  '.oooooooooooo.',
];

const PALETTE = {
  r: '#a82334',
  R: '#e84a5f',
  s: '#6a748c',
  W: '#dce4f2',
  w: '#99a8c4',
  k: '#1c1d2b',
  b: '#2d558a',
  B: '#4e84c4',
  d: '#3a2d36',
  g: '#38a862',
  G: '#8ef2a0',
  o: '#2b1b1e',
  y: '#f5c747',
  Y: '#fff4a3',
  D: '#5e3622',
};

const BERRY_SLIME_PAL = {
  ...PALETTE,
  g: '#c44569',
  G: '#ff9eb5',
  d: '#782240',
};

const CHEST_PAL = {
  o: '#24161b',
  B: '#9e5a31',
  D: '#66341c',
  y: '#e8b438',
  Y: '#fff2a6',
  G: '#ffd84d',
};

function drawMatrix(ctx, matrix, x, y, palette, flipX = false, scaleX = 1, scaleY = 1) {
  const h = matrix.length;
  const w = matrix[0].length;
  ctx.save();
  ctx.translate(Math.round(x + w / 2), Math.round(y + h));
  ctx.scale((flipX ? -1 : 1) * scaleX, scaleY);
  for (let row = 0; row < h; row++) {
    const line = matrix[row];
    for (let col = 0; col < w; col++) {
      const ch = line[col];
      if (ch === '.') continue;
      const colHex = palette[ch];
      if (!colHex) continue;
      ctx.fillStyle = colHex;
      ctx.fillRect(col - w / 2, row - h, 1, 1);
    }
  }
  ctx.restore();
}

export class BrambleSim {
  constructor({ scripted = true, seed = 20261124 } = {}) {
    this.scripted = scripted;
    this.seed = seed;
    this.reset();
  }

  reset() {
    this.rng = mulberry32(this.seed);
    this.t = 0;
    this.frame = 0;
    this.coinsCollected = 0;
    this.score = 0;
    this.chestOpened = false;
    this.chestOpenT = -1;
    this.hitstop = 0;

    this.player = {
      x: 24,
      y: 226,
      vx: 0,
      vy: 0,
      w: 10,
      h: 12,
      facing: 1,
      onGround: true,
      squashX: 1,
      squashY: 1,
      slashTimer: 0,
      slashDir: 1,
      scarf: [
        { x: 24, y: 232 },
        { x: 21, y: 232 },
        { x: 18, y: 233 },
        { x: 15, y: 234 },
      ],
    };

    this.input = { left: false, right: false, jump: false, slash: false };

    // Static coins placed along the exact climb path
    this.coins = [
      { x: 56, y: 225, taken: false },
      { x: 78, y: 225, taken: false },
      { x: 30, y: 184, taken: false },
      { x: 58, y: 184, taken: false },
      { x: 112, y: 152, taken: false },
      { x: 144, y: 152, taken: false },
      { x: 36, y: 120, taken: false },
      { x: 66, y: 120, taken: false },
      { x: 72, y: 86, taken: false },
      { x: 106, y: 86, taken: false },
    ];

    // Cute patrolling slimes on each platform
    this.slimes = [
      { id: 1, x: 46, y: 188, minX: 20, maxX: 62, dir: 1, spd: 18, alive: true, kind: 'green', phase: 0.2 },
      { id: 2, x: 130, y: 156, minX: 102, maxX: 150, dir: -1, spd: 20, alive: true, kind: 'berry', phase: 1.4 },
      { id: 3, x: 50, y: 124, minX: 24, maxX: 72, dir: 1, spd: 19, alive: true, kind: 'green', phase: 2.3 },
      { id: 4, x: 120, y: 230, minX: 92, maxX: 152, dir: -1, spd: 17, alive: true, kind: 'berry', phase: 0.8 },
    ];

    this.particles = [];
    this.lootCoins = [];
    this.popups = [];
    this.clouds = [
      { x: 18, y: 26, w: 34, spd: 3.2 },
      { x: 96, y: 42, w: 42, spd: 2.4 },
      { x: 152, y: 18, w: 28, spd: 3.8 },
    ];
    this.fireflies = [];
    for (let i = 0; i < 16; i++) {
      this.fireflies.push({
        x: 12 + this.rng() * 156,
        y: 66 + this.rng() * 182,
        phase: this.rng() * Math.PI * 2,
        spd: 0.9 + this.rng() * 1.4,
      });
    }
    this.leaves = [];
    for (let i = 0; i < 9; i++) {
      this.leaves.push({
        x: this.rng() * LW,
        y: 50 + this.rng() * 190,
        vx: -4 - this.rng() * 6,
        vy: 8 + this.rng() * 8,
        phase: this.rng() * Math.PI * 2,
        col: i % 2 === 0 ? '#e88b43' : '#f2c14e',
      });
    }

    // Pre-generate deterministic grass blades & flowers on every platform
    this.foliage = [];
    for (const p of PLATFORMS) {
      for (let gx = p.x + 3; gx < p.x + p.w - 3; gx += 4) {
        const r = this.rng();
        if (r > 0.32) {
          this.foliage.push({
            x: gx,
            y: p.y,
            h: 2 + Math.floor(this.rng() * 3),
            flower: r > 0.84 ? (r > 0.92 ? '#ff8fb1' : '#ffe373') : null,
            phase: this.rng() * Math.PI * 2,
          });
        }
      }
    }

    // Scripted indie platformer choreography (0..22.5s)
    // Carefully timed so every jump, slash, and chest-open lands cleanly on our cut beats!
    this.script = this.buildScript();
  }

  buildScript() {
    // Keyframes of (t, x, y, facing, onGround, slashAt?)
    // Piecewise smooth movement + natural parabolic jumps between identical platforms!
    return [
      // Start on ground left -> run right grabbing first 2 coins -> turn & jump to Lower-Left Ledge
      { t: 0.00, x: 24,  y: 226, f: 1, g: true },
      { t: 1.05, x: 84,  y: 226, f: 1, g: true },
      { t: 1.35, x: 76,  y: 226, f: -1, g: true },
      // Jump up onto Lower-Left Ledge (crosses the 1.80s Day 1 -> Day 7 cut right mid-jump!)
      { t: 1.65, x: 64,  y: 184, f: -1, g: false },
      { t: 2.00, x: 56,  y: 184, f: -1, g: true },
      // Slash Slime #1 on Lower-Left Ledge at t=2.35s, run left to grab coin, then jump to Mid-Right Ledge
      { t: 2.35, x: 46,  y: 184, f: -1, g: true, slash: true },
      { t: 2.90, x: 26,  y: 184, f: -1, g: true },
      { t: 3.30, x: 64,  y: 184, f: 1, g: true },
      // Jump across to Mid-Right Ledge (crosses 3.80s Day 7 -> Day 1 cut)
      { t: 3.65, x: 86,  y: 146, f: 1, g: false },
      { t: 4.00, x: 108, y: 152, f: 1, g: true },
      { t: 4.70, x: 148, y: 152, f: 1, g: true },
      // Turn & slash Slime #2 right after 5.60s Day 1 -> Day 7 cut!
      { t: 5.55, x: 132, y: 152, f: -1, g: true },
      { t: 5.85, x: 120, y: 152, f: -1, g: true, slash: true },
      { t: 6.40, x: 102, y: 152, f: -1, g: true },
      // Leap across to Mid-Left Bridge
      { t: 6.80, x: 84,  y: 112, f: -1, g: false },
      { t: 7.20, x: 68,  y: 120, f: -1, g: true },
      // Brief Day 1 cut (7.6s..8.6s) walking on Mid-Left Bridge
      { t: 8.30, x: 32,  y: 120, f: -1, g: true },
      { t: 8.80, x: 42,  y: 120, f: 1, g: true },
      // Split-screen wipe (8.8s..10.8s): slash Slime #3 and hop toward Top Shrine!
      { t: 9.45, x: 56,  y: 120, f: 1, g: true, slash: true },
      { t: 10.20, x: 74, y: 120, f: 1, g: true },
      // Uninterrupted Day 7 finish: leap up to Top Shrine & open Treasure Chest!
      { t: 10.65, x: 70, y: 80,  f: 1, g: false },
      { t: 11.05, x: 68, y: 86,  f: 1, g: true },
      { t: 11.70, x: 76, y: 86,  f: 1, g: true },
      { t: 12.25, x: 85, y: 86,  f: 1, g: true, openChest: true },
      // Joyful victory hop & coin sweep down the platforms
      { t: 13.40, x: 112, y: 86,  f: 1, g: true },
      { t: 14.00, x: 132, y: 110, f: 1, g: false },
      { t: 14.45, x: 138, y: 152, f: 1, g: true },
      { t: 15.10, x: 110, y: 152, f: -1, g: true },
      { t: 15.65, x: 124, y: 196, f: 1, g: false },
      { t: 16.05, x: 132, y: 226, f: -1, g: true },
      { t: 16.40, x: 118, y: 226, f: -1, g: true, slash: true },
      { t: 17.50, x: 62,  y: 226, f: -1, g: true },
      { t: 18.60, x: 90,  y: 226, f: 1, g: true },
      { t: 20.50, x: 48,  y: 226, f: -1, g: true },
      { t: 22.80, x: 96,  y: 226, f: 1, g: true },
    ];
  }

  emitDust(x, y, count = 5, col = '#dfe6f0') {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (this.rng() - 0.5) * 6,
        y: y + (this.rng() - 0.5) * 2,
        vx: (this.rng() - 0.5) * 28,
        vy: -8 - this.rng() * 18,
        size: 1 + (this.rng() > 0.5 ? 1 : 0),
        col,
        life: 0.25 + this.rng() * 0.22,
        maxLife: 0.45,
        grav: 18,
      });
    }
  }

  emitSplat(x, y, col1, col2) {
    for (let i = 0; i < 14; i++) {
      const a = this.rng() * Math.PI * 2;
      const spd = 22 + this.rng() * 52;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 24,
        size: this.rng() > 0.4 ? 2 : 1,
        col: i % 3 === 0 ? col2 : col1,
        life: 0.35 + this.rng() * 0.35,
        maxLife: 0.7,
        grav: 135,
      });
    }
  }

  triggerSlash() {
    this.player.slashTimer = 0.22;
    this.player.slashDir = this.player.facing;
    for (const s of this.slimes) {
      if (!s.alive) continue;
      const dx = s.x - this.player.x;
      const dy = s.y - this.player.y;
      if (Math.hypot(dx, dy) < 34) {
        s.alive = false;
        this.score += 50;
        this.hitstop = 0.045;
        this.emitSplat(
          s.x + 5,
          s.y + 4,
          s.kind === 'green' ? '#4ad47a' : '#e85d88',
          s.kind === 'green' ? '#b8ffc9' : '#ffc2d4',
        );
        this.popups.push({ x: s.x + 5, y: s.y - 4, text: '+50', col: '#ffffff', life: 0.75, maxLife: 0.75 });
      }
    }
  }

  openChest() {
    if (this.chestOpened) return;
    this.chestOpened = true;
    this.chestOpenT = this.t;
    this.score += 250;
    this.popups.push({ x: CHEST_POS.x + 7, y: CHEST_POS.y - 6, text: '+250', col: '#ffe869', life: 1.1, maxLife: 1.1 });

    // Fountain of bouncing gold coins cascading down the platforms!
    for (let i = 0; i < 18; i++) {
      this.lootCoins.push({
        x: CHEST_POS.x + 6 + (this.rng() - 0.5) * 4,
        y: CHEST_POS.y + 2,
        vx: (this.rng() - 0.5) * 95,
        vy: -75 - this.rng() * 68,
        collected: false,
        age: 0,
      });
    }
    this.emitSplat(CHEST_POS.x + 7, CHEST_POS.y + 2, '#ffd84d', '#fff8c2');
  }

  step(dt) {
    this.t += dt;
    this.frame += 1;

    // Gentle clouds, fireflies & autumn leaves
    for (const c of this.clouds) {
      c.x += c.spd * dt;
      if (c.x > LW + 12) c.x = -c.w - 8;
    }
    for (const l of this.leaves) {
      l.x += (l.vx + Math.sin(this.t * 2.2 + l.phase) * 7) * dt;
      l.y += l.vy * dt;
      if (l.y > 246) {
        l.y = 48;
        l.x = 20 + this.rng() * 165;
      }
      if (l.x < -4) l.x = LW + 4;
    }

    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }

    const prevX = this.player.x;
    const prevY = this.player.y;
    const wasOnGround = this.player.onGround;

    if (this.scripted) {
      // Interpolate along scripted indie platformer keyframes
      let idx = 0;
      while (idx < this.script.length - 2 && this.script[idx + 1].t <= this.t) idx++;
      const a = this.script[idx];
      const b = this.script[idx + 1];
      const span = Math.max(0.001, b.t - a.t);
      const u = Math.max(0, Math.min(1, (this.t - a.t) / span));
      // Smooth horizontal ease, parabolic arc when jumping
      const ease = u * u * (3 - 2 * u);
      this.player.x = a.x + (b.x - a.x) * ease;
      const linearY = a.y + (b.y - a.y) * u;
      const jumpArc = (!a.g || !b.g) ? -Math.sin(u * Math.PI) * 14 : 0;
      this.player.y = linearY + jumpArc;
      this.player.facing = b.f;
      this.player.onGround = a.g && b.g;

      if (b.slash && !b._slashed && this.t >= b.t - 0.04) {
        b._slashed = true;
        this.triggerSlash();
      }
      if (b.openChest && !b._opened && this.t >= b.t - 0.04) {
        b._opened = true;
        this.openChest();
      }
    } else {
      // Playable interactive mode for standalone day1.html / day7.html
      const move = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
      this.player.vx = move * 72;
      if (move !== 0) this.player.facing = move;
      if (this.input.jump && this.player.onGround) {
        this.player.vy = -168;
        this.player.onGround = false;
      }
      if (this.input.slash && this.player.slashTimer <= 0) {
        this.triggerSlash();
      }
      this.player.vy += 420 * dt;
      this.player.x = Math.max(12, Math.min(LW - 22, this.player.x + this.player.vx * dt));
      const nextY = this.player.y + this.player.vy * dt;
      this.player.onGround = false;
      for (const p of PLATFORMS) {
        const withinX = this.player.x + 8 > p.x && this.player.x + 2 < p.x + p.w;
        if (withinX && this.player.vy >= 0 && this.player.y + this.player.h <= p.y + 3 && nextY + this.player.h >= p.y) {
          this.player.y = p.y - this.player.h;
          this.player.vy = 0;
          this.player.onGround = true;
          break;
        }
      }
      if (!this.player.onGround) this.player.y = nextY;
      if (this.player.y > 226) {
        this.player.y = 226;
        this.player.vy = 0;
        this.player.onGround = true;
      }
      if (!this.chestOpened && Math.hypot(this.player.x - CHEST_POS.x, this.player.y - CHEST_POS.y) < 16) {
        this.openChest();
      }
    }

    this.player.vx = (this.player.x - prevX) / dt;
    this.player.vy = (this.player.y - prevY) / dt;

    // Squash & stretch + dust puffs on takeoff / landing
    if (wasOnGround && !this.player.onGround) {
      this.player.squashX = 0.78;
      this.player.squashY = 1.24;
      this.emitDust(this.player.x + 5, this.player.y + 12, 5, '#dce6f2');
    } else if (!wasOnGround && this.player.onGround) {
      this.player.squashX = 1.25;
      this.player.squashY = 0.78;
      this.emitDust(this.player.x + 5, this.player.y + 12, 6, '#c7d6c3');
    }
    this.player.squashX += (1 - this.player.squashX) * Math.min(1, dt * 14);
    this.player.squashY += (1 - this.player.squashY) * Math.min(1, dt * 14);

    if (this.player.onGround && Math.abs(this.player.vx) > 22 && this.frame % 10 === 0) {
      this.emitDust(this.player.x + 5, this.player.y + 12, 1, '#c9d6be');
    }
    if (this.player.slashTimer > 0) this.player.slashTimer -= dt;

    // Update fluttering scarf physics tail
    const anchorX = this.player.x + (this.player.facing > 0 ? 3 : 8);
    const anchorY = this.player.y + 6;
    this.player.scarf[0].x = anchorX;
    this.player.scarf[0].y = anchorY;
    for (let i = 1; i < this.player.scarf.length; i++) {
      const prev = this.player.scarf[i - 1];
      const cur = this.player.scarf[i];
      const targetX = prev.x - this.player.facing * 2.6;
      const targetY = prev.y + 0.5 + Math.sin(this.t * 11 + i * 1.4) * 0.9;
      cur.x += (targetX - cur.x) * Math.min(1, dt * 18);
      cur.y += (targetY - cur.y) * Math.min(1, dt * 18);
    }

    // Collect static coins
    for (const c of this.coins) {
      if (c.taken) continue;
      if (Math.hypot(this.player.x + 5 - c.x, this.player.y + 6 - c.y) < 13) {
        c.taken = true;
        this.coinsCollected += 1;
        this.score += 10;
        this.emitDust(c.x, c.y, 5, '#ffe869');
        this.popups.push({ x: c.x, y: c.y - 4, text: '+1', col: '#ffe869', life: 0.55, maxLife: 0.55 });
      }
    }

    // Patrol slimes
    for (const s of this.slimes) {
      if (!s.alive) continue;
      s.x += s.dir * s.spd * dt;
      if (s.x < s.minX) { s.x = s.minX; s.dir = 1; }
      if (s.x > s.maxX) { s.x = s.maxX; s.dir = -1; }
    }

    // Bouncing chest loot coins
    for (const lc of this.lootCoins) {
      if (lc.collected) continue;
      lc.age += dt;
      lc.vy += 280 * dt;
      lc.x += lc.vx * dt;
      const ny = lc.y + lc.vy * dt;
      for (const p of PLATFORMS) {
        if (lc.x > p.x && lc.x < p.x + p.w && lc.vy > 0 && lc.y <= p.y && ny >= p.y - 2) {
          lc.y = p.y - 2;
          lc.vy = -lc.vy * 0.52;
          lc.vx *= 0.78;
          break;
        }
      }
      lc.y = Math.min(236, ny);
      if (lc.y >= 236) {
        lc.vy = -Math.abs(lc.vy) * 0.45;
        lc.vx *= 0.82;
      }
      if (lc.age > 0.35 && Math.hypot(this.player.x + 5 - lc.x, this.player.y + 6 - lc.y) < 14) {
        lc.collected = true;
        this.coinsCollected += 1;
        this.score += 10;
        this.emitDust(lc.x, lc.y, 3, '#fff08a');
      }
    }

    // Particles & popups
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      return p.life > 0;
    });
    this.popups = this.popups.filter((p) => {
      p.life -= dt;
      p.y -= 16 * dt;
      return p.life > 0;
    });
  }
}

// ============================================================
// DAY 1 RENDERER — Honest, flat programmer-art prototype
// ============================================================
export function renderDay1(ctx, sim) {
  // Flat dull slate sky
  ctx.fillStyle = '#252830';
  ctx.fillRect(0, 0, LW, LH);

  // Plain darker ground block below floor
  ctx.fillStyle = '#1d2027';
  ctx.fillRect(0, 254, LW, LH - 254);

  // Flat gray prototype platform rectangles
  for (const p of PLATFORMS) {
    ctx.fillStyle = '#5e6573';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#8b93a3';
    ctx.fillRect(p.x, p.y, p.w, 2);
  }

  // Plain brown rectangle for chest
  ctx.fillStyle = sim.chestOpened ? '#a8844c' : '#7a563b';
  ctx.fillRect(CHEST_POS.x, CHEST_POS.y, CHEST_POS.w, CHEST_POS.h);

  // Plain yellow squares for coins
  ctx.fillStyle = '#d9c24c';
  for (const c of sim.coins) {
    if (c.taken) continue;
    ctx.fillRect(Math.round(c.x - 2), Math.round(c.y - 2), 4, 4);
  }

  // Plain green rectangles for slimes
  for (const s of sim.slimes) {
    if (!s.alive) continue;
    ctx.fillStyle = s.kind === 'green' ? '#58a35c' : '#a8596d';
    ctx.fillRect(Math.round(s.x), Math.round(s.y), 10, 8);
  }

  // Plain white box player
  ctx.fillStyle = '#e6e8ed';
  ctx.fillRect(Math.round(sim.player.x + 1), Math.round(sim.player.y), 10, 12);

  // Plain flat hitbox rectangle if slashing
  if (sim.player.slashTimer > 0) {
    ctx.fillStyle = '#ffffff';
    const sx = sim.player.slashDir > 0 ? sim.player.x + 11 : sim.player.x - 9;
    ctx.fillRect(Math.round(sx), Math.round(sim.player.y + 4), 8, 3);
  }

  // Barebones debug text top-left
  ctx.fillStyle = '#9aa1b0';
  ctx.font = '8px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`coins:${sim.coinsCollected}`, 12, 62);
}

// ============================================================
// DAY 7 RENDERER — Handcrafted cozy 16-bit sunset pixel world
// ============================================================
function drawSunsetSky(ctx, sim) {
  // Banded 16-bit twilight-to-golden-hour pixel sky (zero smooth AI gradients!)
  const bands = [
    [0,   42, '#23274a'],
    [42,  76, '#333463'],
    [76, 108, '#4e4278'],
    [108,142, '#7d547f'],
    [142,178, '#b86c74'],
    [178,214, '#e09270'],
    [214,254, '#f2bc79'],
  ];
  for (const [y0, y1, col] of bands) {
    ctx.fillStyle = col;
    ctx.fillRect(0, y0, LW, y1 - y0);
  }

  // Twinkling pixel stars in upper twilight sky
  const stars = [
    [18, 16], [42, 28], [74, 14], [116, 22], [148, 12], [164, 34], [28, 52], [134, 48], [88, 38],
  ];
  for (let i = 0; i < stars.length; i++) {
    const [sx, sy] = stars[i];
    const bright = Math.sin(sim.t * 3.2 + i * 1.7) > 0.2;
    ctx.fillStyle = bright ? '#fff8d6' : '#a8a4cc';
    ctx.fillRect(sx, sy, 1, 1);
  }

  // Warm setting sun peeking behind distant hills
  ctx.fillStyle = '#ffe599';
  ctx.fillRect(126, 174, 18, 18);
  ctx.fillStyle = '#fff5cc';
  ctx.fillRect(129, 177, 12, 12);

  // Drifting fluffy pixel clouds
  for (const c of sim.clouds) {
    const cx = Math.round(c.x);
    const cy = Math.round(c.y);
    ctx.fillStyle = '#d48b8d';
    ctx.fillRect(cx + 2, cy + 4, c.w - 4, 4);
    ctx.fillStyle = '#f2b8a2';
    ctx.fillRect(cx, cy + 2, c.w, 4);
    ctx.fillStyle = '#ffe1c6';
    ctx.fillRect(cx + 5, cy, c.w - 10, 3);
  }

  // Distant layered silhouettes (misty mountain ridge + pine tree line)
  ctx.fillStyle = '#5c466e';
  for (let x = 0; x < LW; x += 2) {
    const h = Math.round(28 + Math.sin(x * 0.045) * 14 + Math.cos(x * 0.11) * 7);
    ctx.fillRect(x, 238 - h - 22, 2, h + 22);
  }
  ctx.fillStyle = '#3c3154';
  for (let x = 0; x < LW; x += 3) {
    const treeH = 14 + ((x * 37) % 15);
    ctx.fillRect(x, 238 - treeH - 6, 3, treeH + 6);
    ctx.fillRect(x + 1, 238 - treeH - 9, 1, 3);
  }
}

function drawMossyPlatform(ctx, p) {
  // Deep stone base
  ctx.fillStyle = '#2d2538';
  ctx.fillRect(p.x, p.y + 3, p.w, p.h - 3);

  // Carved brick highlights
  ctx.fillStyle = '#4b4059';
  for (let bx = p.x + 2; bx < p.x + p.w - 6; bx += 10) {
    ctx.fillRect(bx, p.y + 4, 8, 4);
  }
  ctx.fillStyle = '#3a3047';
  for (let bx = p.x + 6; bx < p.x + p.w - 6; bx += 10) {
    if (p.h > 11) ctx.fillRect(bx, p.y + 9, 8, 4);
  }

  // Lush moss & grass cap right on the exact hitbox top edge
  ctx.fillStyle = '#2f7a4d';
  ctx.fillRect(p.x, p.y + 2, p.w, 3);
  ctx.fillStyle = '#58b861';
  ctx.fillRect(p.x, p.y, p.w, 2);
  ctx.fillStyle = '#9be070';
  for (let gx = p.x + 1; gx < p.x + p.w - 2; gx += 4) {
    ctx.fillRect(gx, p.y, 2, 1);
  }

  // Hanging pixel vines underneath ledges
  if (p.kind !== 'ground') {
    ctx.fillStyle = '#3c8f54';
    for (let vx = p.x + 6; vx < p.x + p.w - 6; vx += 14) {
      const vl = 4 + ((vx * 7) % 7);
      ctx.fillRect(vx, p.y + p.h, 1, vl);
      ctx.fillStyle = '#6ec96b';
      ctx.fillRect(vx + 1, p.y + p.h + 2, 1, 2);
      ctx.fillStyle = '#3c8f54';
    }
  }
}

function drawPond(ctx, sim) {
  // Shimmering twilight pond at the bottom (y = 254..320)
  ctx.fillStyle = '#202642';
  ctx.fillRect(0, 254, LW, LH - 254);

  // Subtle sunset water reflection bands
  ctx.fillStyle = '#2c355c';
  ctx.fillRect(0, 254, LW, 22);
  ctx.fillStyle = '#474570';
  ctx.fillRect(0, 254, LW, 7);

  // Animated water ripples & warm sun reflection sparkles
  for (let row = 0; row < 10; row++) {
    const ry = 257 + row * 5;
    const shift = Math.sin(sim.t * 2.4 + row * 1.1) * 6;
    ctx.fillStyle = row < 3 ? '#f0a67a' : '#5e6b9c';
    ctx.fillRect(Math.round(124 + shift - row), ry, 16 - row, 1);
    ctx.fillStyle = '#3b4a78';
    ctx.fillRect(Math.round(24 - shift + row * 4), ry + 1, 14, 1);
  }

  // Deep earthy frame at very bottom (safe under TikTok captions)
  ctx.fillStyle = '#151829';
  ctx.fillRect(0, 296, LW, 24);
}

function drawPixelGlow(ctx, cx, cy, r, rgba) {
  ctx.fillStyle = rgba;
  const r2 = r * r;
  for (let dy = -r; dy <= r; dy++) {
    const span = Math.floor(Math.sqrt(Math.max(0, r2 - dy * dy)));
    ctx.fillRect(cx - span, cy + dy, span * 2 + 1, 1);
  }
}

export function renderDay7(ctx, sim) {
  drawSunsetSky(ctx, sim);
  drawPond(ctx, sim);

  // Wooden torches + flickering warm amber circular pixel glow
  for (let i = 0; i < TORCHES.length; i++) {
    const tr = TORCHES[i];
    const flick = Math.sin(sim.t * 16 + i * 2.1);
    const pulse = flick > 0 ? 1 : 0;
    drawPixelGlow(ctx, tr.x + 1, tr.y + 2, 12 + pulse, 'rgba(255, 176, 72, 0.10)');
    drawPixelGlow(ctx, tr.x + 1, tr.y + 2, 7 + pulse, 'rgba(255, 212, 112, 0.16)');
    // Wooden post
    ctx.fillStyle = '#4a2b1d';
    ctx.fillRect(tr.x, tr.y + 4, 2, 8);
    ctx.fillStyle = '#73442a';
    ctx.fillRect(tr.x, tr.y + 4, 1, 8);
    // Animated flame
    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(tr.x - 1, tr.y + 1, 4, 4);
    ctx.fillStyle = '#ffd15c';
    ctx.fillRect(tr.x, tr.y + (flick > 0 ? 0 : 1), 2, 3);
    ctx.fillStyle = '#fff9d6';
    ctx.fillRect(tr.x, tr.y + 2, 1, 1);
  }

  // Mossy cobblestone platforms
  for (const p of PLATFORMS) drawMossyPlatform(ctx, p);

  // Swaying grass blades & tiny wildflowers
  for (const f of sim.foliage) {
    const sway = Math.round(Math.sin(sim.t * 3.1 + f.phase) * 0.7);
    ctx.fillStyle = '#6ec96b';
    ctx.fillRect(f.x, f.y - f.h, 1, f.h);
    ctx.fillRect(f.x + sway, f.y - f.h - 1, 1, 1);
    if (f.flower) {
      ctx.fillStyle = f.flower;
      ctx.fillRect(f.x + sway, f.y - f.h - 2, 2, 2);
    }
  }

  // Treasure Chest on top shrine
  drawMatrix(
    ctx,
    sim.chestOpened ? CHEST_OPEN : CHEST_CLOSED,
    CHEST_POS.x,
    CHEST_POS.y,
    CHEST_PAL,
  );
  if (sim.chestOpened) {
    // Soft circular golden chest aura
    drawPixelGlow(ctx, CHEST_POS.x + 7, CHEST_POS.y + 3, 13, 'rgba(255, 224, 102, 0.15)');
    drawPixelGlow(ctx, CHEST_POS.x + 7, CHEST_POS.y + 3, 8, 'rgba(255, 240, 150, 0.18)');
  }

  // Spinning gold coins
  const spinFrame = Math.floor(sim.t * 8) % 4;
  const coinWidths = [5, 3, 1, 3];
  const cw = coinWidths[spinFrame];
  for (const c of sim.coins) {
    if (c.taken) continue;
    const bob = Math.round(Math.sin(sim.t * 4.5 + c.x * 0.2) * 1.4);
    const cx = Math.round(c.x - cw / 2);
    const cy = Math.round(c.y - 3 + bob);
    ctx.fillStyle = '#c9881c';
    ctx.fillRect(cx, cy, cw, 6);
    ctx.fillStyle = '#ffd84d';
    ctx.fillRect(cx, cy + 1, cw, 4);
    if (cw >= 3) {
      ctx.fillStyle = '#fff8c7';
      ctx.fillRect(cx + 1, cy + 1, 1, 2);
    }
  }

  // Bouncing loot coins from chest
  for (const lc of sim.lootCoins) {
    if (lc.collected) continue;
    const lx = Math.round(lc.x - 2);
    const ly = Math.round(lc.y - 2);
    ctx.fillStyle = '#d4921e';
    ctx.fillRect(lx, ly, 4, 4);
    ctx.fillStyle = '#ffe566';
    ctx.fillRect(lx, ly, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(lx, ly, 1, 1);
  }

  // Cute animated bouncy slimes
  for (const s of sim.slimes) {
    if (!s.alive) continue;
    const bounce = Math.sin(sim.t * 7.5 + s.phase);
    const mat = bounce > 0 ? SLIME_A : SLIME_B;
    const pal = s.kind === 'green' ? PALETTE : BERRY_SLIME_PAL;
    // Soft ground shadow
    ctx.fillStyle = 'rgba(18, 14, 28, 0.38)';
    ctx.fillRect(Math.round(s.x + 1), Math.round(s.y + 7), 8, 2);
    drawMatrix(ctx, mat, s.x, s.y, pal, s.dir < 0);
  }

  // Fluttering crimson scarf behind Tiny Knight
  for (let i = sim.player.scarf.length - 1; i >= 1; i--) {
    const seg = sim.player.scarf[i];
    ctx.fillStyle = i % 2 === 0 ? '#e84a5f' : '#c92e46';
    ctx.fillRect(Math.round(seg.x), Math.round(seg.y), 2, 2);
  }

  // Ground shadow under knight
  if (sim.player.onGround) {
    ctx.fillStyle = 'rgba(18, 14, 28, 0.35)';
    ctx.fillRect(Math.round(sim.player.x + 2), Math.round(sim.player.y + 11), 8, 2);
  }

  // Tiny Knight sprite with run cycle + squash-and-stretch
  const moving = Math.abs(sim.player.vx) > 12;
  const runToggle = Math.floor(sim.t * 10) % 2 === 0;
  const knightMat = (moving && runToggle && sim.player.onGround) ? KNIGHT_RUN : KNIGHT_IDLE;
  drawMatrix(
    ctx,
    knightMat,
    sim.player.x,
    sim.player.y,
    PALETTE,
    sim.player.facing < 0,
    sim.player.squashX,
    sim.player.squashY,
  );

  // Crisp pixel sword slash crescent!
  if (sim.player.slashTimer > 0) {
    const frac = sim.player.slashTimer / 0.22;
    const dir = sim.player.slashDir;
    const cx = Math.round(sim.player.x + 6 + dir * 7);
    const cy = Math.round(sim.player.y + 6);
    ctx.fillStyle = frac > 0.5 ? '#ffffff' : '#ffe885';
    ctx.fillRect(cx + dir * 2, cy - 5, 2, 3);
    ctx.fillRect(cx + dir * 4, cy - 3, 2, 6);
    ctx.fillRect(cx + dir * 2, cy + 3, 2, 3);
    ctx.fillStyle = '#ffd15c';
    ctx.fillRect(cx + dir * 1, cy - 6, 2, 1);
    ctx.fillRect(cx + dir * 1, cy + 5, 2, 1);
  }

  // Pixel dust, slime splats, and sparkle particles
  for (const p of sim.particles) {
    ctx.fillStyle = p.col;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }

  // Falling autumn leaves
  for (const l of sim.leaves) {
    ctx.fillStyle = l.col;
    ctx.fillRect(Math.round(l.x), Math.round(l.y), 2, 1);
  }

  // Glowing golden fireflies
  for (const ff of sim.fireflies) {
    const glow = 0.35 + 0.65 * Math.max(0, Math.sin(sim.t * ff.spd + ff.phase));
    const fx = Math.round(ff.x + Math.sin(sim.t * 0.9 + ff.phase) * 5);
    const fy = Math.round(ff.y + Math.cos(sim.t * 1.1 + ff.phase) * 3);
    ctx.fillStyle = `rgba(255, 236, 138, ${glow.toFixed(2)})`;
    ctx.fillRect(fx, fy, 1, 1);
  }

  // Crisp tiny pixel popups (+1, +50, +250)
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const pop of sim.popups) {
    ctx.fillStyle = '#1d1726';
    ctx.fillText(pop.text, Math.round(pop.x) + 1, Math.round(pop.y) + 1);
    ctx.fillStyle = pop.col;
    ctx.fillText(pop.text, Math.round(pop.x), Math.round(pop.y));
  }

  // Cozy minimal pixel HUD (3 tiny hearts + coin count) at y=60..70
  for (let h = 0; h < 3; h++) {
    const hx = 12 + h * 9;
    const hy = 61;
    ctx.fillStyle = '#24161b';
    ctx.fillRect(hx, hy, 7, 6);
    ctx.fillStyle = '#e84a5f';
    ctx.fillRect(hx + 1, hy + 1, 2, 2);
    ctx.fillRect(hx + 4, hy + 1, 2, 2);
    ctx.fillRect(hx + 1, hy + 2, 5, 2);
    ctx.fillRect(hx + 2, hy + 4, 3, 1);
    ctx.fillRect(hx + 3, hy + 5, 1, 1);
  }
  // Tiny coin icon + count on right
  ctx.fillStyle = '#ffd84d';
  ctx.fillRect(142, 61, 4, 5);
  ctx.fillStyle = '#fff7bd';
  ctx.fillRect(143, 62, 1, 2);
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#1b1626';
  ctx.fillText(`${sim.coinsCollected}`, 150, 61);
  ctx.fillStyle = '#fff5d6';
  ctx.fillText(`${sim.coinsCollected}`, 149, 60);
}
