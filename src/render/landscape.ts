import { hash } from '../game/math.ts';
import type { Region } from '../game/types.ts';
import { Pixel, mix } from './pixel.ts';

export const SCENE_WIDTH = 640;
export const SCENE_HEIGHT = 360;

export interface Landscape {
  sky: HTMLCanvasElement;
  far: HTMLCanvasElement;
  ground: HTMLCanvasElement;
  front: HTMLCanvasElement;
  lights: { x: number; y: number; color: number; radius: number }[];
  palette: Palette;
}
interface Palette {
  sky: string; haze: string; far: string; mid: string; rock: string;
  light: string; ground: string; grass: string; accent: string;
}
const PALETTES: Record<Region, Palette> = {
  hollow: { sky: '#263d43', haze: '#bcaa7e', far: '#737d70', mid: '#515f55', rock: '#4b5148', light: '#999379', ground: '#424a3c', grass: '#748269', accent: '#d3a46c' },
  mine: { sky: '#171c25', haze: '#614439', far: '#4a3935', mid: '#39302e', rock: '#453d38', light: '#a98769', ground: '#383432', grass: '#716255', accent: '#e18953' },
  citadel: { sky: '#283b45', haze: '#bca687', far: '#787f7e', mid: '#6b716a', rock: '#74766a', light: '#c1b797', ground: '#535951', grass: '#7f8a70', accent: '#dfbd76' },
  tundra: { sky: '#213546', haze: '#a8bbc0', far: '#697f90', mid: '#516775', rock: '#526370', light: '#c4d6d6', ground: '#809499', grass: '#bccdcb', accent: '#b0d6df' },
  forest: { sky: '#253e3c', haze: '#a2ad7d', far: '#697d62', mid: '#3c5949', rock: '#45594a', light: '#9baa7c', ground: '#364b3a', grass: '#75935d', accent: '#d0b77c' },
  desert: { sky: '#39414b', haze: '#d2a979', far: '#998773', mid: '#846d57', rock: '#856f58', light: '#cbae7c', ground: '#8e7357', grass: '#b69b6f', accent: '#e1b278' },
  city: { sky: '#273640', haze: '#a19683', far: '#687274', mid: '#4f5b5c', rock: '#525a57', light: '#a2a18b', ground: '#434c4a', grass: '#777e6c', accent: '#d7aa6e' },
  ship: { sky: '#111923', haze: '#3f5865', far: '#405765', mid: '#31414b', rock: '#384a55', light: '#869ba0', ground: '#293943', grass: '#50656d', accent: '#8ccdd0' },
  moon: { sky: '#171d2c', haze: '#7a7278', far: '#77737b', mid: '#5b5966', rock: '#68636a', light: '#bab0a3', ground: '#54515d', grass: '#8c8490', accent: '#e0c48a' },
};

function mountain(p: Pixel, x: number, y: number, w: number, height: number, color: string, light: string, snow = false): void {
  p.poly([[x, y], [x + w * 0.2, y - height * 0.25], [x + w * 0.48, y - height], [x + w * 0.66, y - height * 0.6], [x + w, y]], color);
  p.poly([[x + w * 0.48, y - height], [x + w * 0.5, y - height * 0.53], [x + w * 0.35, y - height * 0.28], [x + w * 0.76, y], [x + w, y], [x + w * 0.66, y - height * 0.6]], light);
  if (snow) p.poly([[x + w * 0.32, y - height * 0.56], [x + w * 0.48, y - height], [x + w * 0.66, y - height * 0.6], [x + w * 0.52, y - height * 0.73], [x + w * 0.47, y - height * 0.59], [x + w * 0.42, y - height * 0.74]], '#c9d6d4');
}

function pine(p: Pixel, x: number, y: number, height: number, color: string, highlight: string): void {
  p.rect(x - 2, y - height * 0.7, 4, height * 0.7, '#373f35');
  for (let level = 0; level < 5; level++) {
    const yy = y - height + level * height * 0.15;
    const half = height * (0.13 + level * 0.055);
    p.poly([[x, yy], [x + half, yy + height * 0.36], [x - half, yy + height * 0.36]], color);
    p.line(x, yy + 2, x - half * 0.8, yy + height * 0.34, highlight);
  }
}

function stoneWall(p: Pixel, x: number, y: number, w: number, h: number, palette: Palette): void {
  p.rect(x, y, w, h, palette.rock);
  p.rect(x, y, w, 3, palette.light);
  for (let row = 0; row < h; row += 9) {
    p.rect(x, y + row + 8, w, 1, mix(palette.rock, '#171f22', 0.28));
    for (let col = -12; col < w; col += 22) {
      const xx = x + col + (row % 18 === 0 ? 11 : 0);
      if (xx >= x && xx < x + w) p.rect(xx, y + row, 1, 8, mix(palette.rock, '#171f22', 0.25));
    }
  }
  p.scatter(Math.round(w * h / 65), [x + 2, y + 4, w - 4, h - 5], [palette.light, mix(palette.rock, palette.light, 0.35)], 4);
}

function arch(p: Pixel, x: number, y: number, w: number, h: number, palette: Palette): void {
  const r = w / 2;
  p.ellipse(x + r, y + r, r, r, mix(palette.rock, '#131e24', 0.55));
  p.rect(x, y + r, w, h - r, mix(palette.rock, '#131e24', 0.55));
  p.line(x - 2, y + r, x - 2, y + h, palette.light, 2);
  p.line(x + w + 1, y + r, x + w + 1, y + h, mix(palette.rock, palette.light, 0.4), 2);
  for (let i = 0; i < 12; i++) {
    const angle = Math.PI + i / 11 * Math.PI;
    p.rect(x + r + Math.cos(angle) * (r + 2), y + r + Math.sin(angle) * (r + 2), 3, 3, i < 5 ? palette.light : mix(palette.rock, palette.light, 0.45));
  }
}

function tower(p: Pixel, x: number, y: number, w: number, h: number, palette: Palette, banner = false): void {
  stoneWall(p, x, y - h, w, h, palette);
  p.rect(x - 3, y - h - 3, w + 6, 4, palette.light);
  for (let xx = x - 2; xx < x + w; xx += 9) p.rect(xx, y - h - 10, 5, 8, palette.rock);
  p.rect(x + w - 7, y - h + 2, 7, h - 2, mix(palette.rock, '#17252a', 0.25));
  for (let yy = y - h + 15; yy < y - 15; yy += 26) {
    p.rect(x + w / 2 - 2, yy, 4, 13, '#202c2d');
    p.rect(x + w / 2 - 1, yy + 3, 1, 8, palette.accent);
  }
  if (banner) {
    p.rect(x + 7, y - h + 25, 13, 41, '#844e44');
    p.poly([[x + 7, y - h + 65], [x + 20, y - h + 65], [x + 14, y - h + 76]], '#844e44');
    p.line(x + 13, y - h + 31, x + 13, y - h + 56, '#c5a16c');
  }
}

function ruinedWall(p: Pixel, palette: Palette): void {
  stoneWall(p, -8, 148, 203, 94, palette);
  for (let i = 0; i < 4; i++) arch(p, 10 + i * 48, 177, 29, 66, palette);
  p.poly([[0, 145], [44, 145], [47, 128], [82, 132], [82, 111], [126, 121], [126, 145], [182, 145], [182, 153], [0, 153]], palette.rock);
  p.line(83, 113, 122, 122, palette.light, 2);
  p.rect(125, 112, 8, 113, mix(palette.rock, '#232f2b', 0.15));
  p.rect(122, 108, 14, 5, palette.light);
  p.rect(121, 221, 17, 8, palette.light);
  p.line(94, 139, 86, 164, '#2d3c34');
  p.line(86, 164, 93, 175, '#2d3c34');
  for (let i = 0; i < 45; i++) {
    const x = 12 + p.random() * 180;
    const y = 140 + p.random() * 28;
    p.rect(x, y, 3, 2, palette.grass);
  }
}

function tree(p: Pixel, x: number, y: number, height: number, palette: Palette): void {
  const trunk = mix(palette.rock, '#3a2620', 0.6);
  p.poly([[x - 11, y], [x - 7, y - height * 0.6], [x - 15, y - height * 0.82], [x - 3, y - height * 0.76], [x + 6, y - height * 0.48], [x + 11, y]], trunk);
  p.line(x - 4, y - 2, x - 2, y - height * 0.68, '#8e7855', 3);
  p.line(x, y - height * 0.5, x + 50, y - height * 0.82, trunk, 5);
  p.line(x - 5, y - height * 0.6, x - 44, y - height * 0.84, trunk, 4);
  const colors = [mix(palette.grass, '#182f26', 0.55), mix(palette.grass, '#25412e', 0.35), palette.grass, mix(palette.grass, palette.light, 0.3)];
  for (let i = 0; i < 80; i++) {
    const xx = x + (p.random() - 0.5) * 156;
    const yy = y - height * 0.83 + (p.random() - 0.5) * 64;
    const radius = 9 + p.random() * 23;
    p.ellipse(xx, yy, radius, radius * 0.46, colors[Math.floor(p.random() * 3)]);
    p.scatter(10, [xx - radius, yy - 4, radius * 2, 6], [colors[2], colors[3]], 4, 2);
  }
  for (let i = 0; i < 12; i++) p.line(x + (p.random() - 0.5) * 10, y - 10, x + (p.random() - 0.5) * 40, y + 3, trunk, 2);
}

function tent(p: Pixel, x: number, y: number): void {
  p.ellipse(x, y + 2, 45, 7, '#2a332a');
  p.line(x - 50, y + 2, x - 12, y - 45, '#aaa080');
  p.poly([[x - 44, y], [x - 15, y - 47], [x + 28, y - 40], [x + 43, y]], '#89745a');
  p.poly([[x - 44, y], [x - 15, y - 47], [x + 10, y]], '#b39165');
  p.poly([[x - 30, y], [x - 15, y - 39], [x, y]], '#292f2a');
  p.line(x - 15, y - 47, x + 28, y - 40, '#ceb184', 2);
  p.line(x - 15, y - 45, x - 42, y - 1, '#c7a776', 2);
  for (let i = 0; i < 6; i++) p.line(x + i * 5 - 1, y - 35 + i, x + 16 + i * 4, y - 2, '#77664f');
  p.line(x + 28, y - 40, x + 49, y + 1, '#bca77c');
  p.rect(x - 17, y - 53, 2, 9, '#736848');
}

function crate(p: Pixel, x: number, y: number, w = 19, h = 16): void {
  p.rect(x, y - h, w, h, '#6a604b');
  p.rect(x, y - h, w, 2, '#a6946b');
  p.rect(x, y - h + 2, 2, h - 2, '#8a7f60');
  p.rect(x + w - 4, y - h + 2, 4, h - 2, '#4a4d3e');
  p.line(x + 2, y - h + 4, x + w - 5, y - 2, '#a29167', 2);
  p.line(x + w - 5, y - h + 4, x + 2, y - 2, '#a29167');
}

function sky(p: Pixel, region: Region, palette: Palette): void {
  p.gradient(palette.sky, palette.haze, 250);
  p.rect(0, 250, 640, 110, palette.haze);
  const dark = region === 'ship' || region === 'moon' || region === 'mine';
  if (region !== 'mine') {
    p.scatter(dark ? 140 : 45, [0, 0, 640, 160], [mix(palette.sky, '#dfddc7', 0.55), '#bbc2b3'], 1);
    const radius = region === 'moon' ? 49 : region === 'ship' ? 64 : 19;
    p.ellipse(455, 71, radius + 2, radius + 2, mix(palette.sky, palette.accent, 0.4));
    p.ellipse(455, 71, radius, radius, region === 'moon' || region === 'ship' ? '#ac836b' : '#d1c094');
    if (region === 'moon' || region === 'ship') {
      for (let i = 0; i < 14; i++) p.ellipse(450 + p.random() * 25, 45 + p.random() * 48, p.random() * 19, 3, '#bd977e');
      p.ellipse(473, 59, radius - 4, radius - 3, palette.sky);
    }
  }
  for (let i = 0; i < 18; i++) {
    const y = 90 + p.random() * 90, x = p.random() * 640, w = 28 + p.random() * 140;
    p.rect(x, y, w, 1, mix(palette.haze, palette.sky, 0.5), 0.5);
    if (!dark) p.rect(x + 12, y - 2, w * 0.6, 2, mix(palette.haze, palette.sky, 0.4), 0.4);
  }
}

export function landscape(region: Region, battle = false): Landscape {
  const palette = PALETTES[region];
  const a = new Pixel(640, 360, hash(`${region}:sky`));
  const b = new Pixel(640, 360, hash(`${region}:far`));
  const c = new Pixel(640, 360, hash(`${region}:ground`));
  const d = new Pixel(640, 360, hash(`${region}:front`));
  const lights: Landscape['lights'] = [];
  sky(a, region, palette);
  if (region === 'mine') {
    b.poly([[0, 0], [640, 0], [640, 130], [603, 94], [578, 145], [541, 65], [490, 78], [455, 42], [412, 115], [361, 70], [318, 55], [274, 93], [231, 68], [190, 142], [170, 82], [140, 160], [93, 107], [50, 154], [0, 105]], '#252828');
    for (let i = 0; i < 8; i++) {
      const x = i * 100 - 10;
      b.rect(x, 80, 8, 172, palette.mid);
      b.line(x, 87, x + 93, 87, palette.mid, 7);
      b.line(x, 120, x + 90, 86, palette.mid, 3);
      b.line(x + 3, 94, x + 3, 242, palette.light);
    }
    b.rect(262, 134, 97, 95, '#171f23');
    for (let i = 0; i < 5; i++) b.rect(274 + i * 17, 145, 4, 84, '#5b5144');
    for (let i = 0; i < 10; i++) {
      const x = b.random() * 640, y = 130 + b.random() * 105;
      b.poly([[x, y], [x + 5, y - 11], [x + 9, y + 1]], '#c88556');
      b.line(x + 5, y - 10, x + 5, y, '#e0af75');
    }
  } else if (region === 'ship') {
    // A hangar looking into space; deck ribs frame the window.
    b.rect(0, 195, 640, 70, palette.mid);
    b.rect(0, 193, 640, 3, palette.light);
    for (const x of [0, 110, 535, 628]) {
      b.poly([[x, 0], [x + 17, 0], [x + 30, 210], [x - 2, 210]], palette.rock);
      b.line(x + 3, 0, x + 15, 210, palette.light, 2);
    }
    b.rect(0, 0, 640, 25, palette.rock);
    for (let i = 0; i < 9; i++) {
      const x = 12 + i * 75;
      b.rect(x, 202, 52, 32, '#253c47');
      b.rect(x + 4, 206, 44, 2, '#71969e');
      b.scatter(18, [x + 4, 213, 40, 15], ['#92bfc1', '#a3966f'], 2);
    }
    lights.push({ x: 80, y: 212, color: 0x7cb9c3, radius: 55 }, { x: 548, y: 212, color: 0x7cb9c3, radius: 55 });
  } else {
    for (let i = -1; i < 7; i++) mountain(b, i * 145, 225, 240, 55 + b.random() * 75, palette.far, mix(palette.far, palette.haze, 0.25), region === 'tundra');
    if (region === 'hollow' || region === 'city' || region === 'citadel' || region === 'moon') {
      for (let i = 0; i < 12; i++) {
        const x = 200 + i * 22;
        const h = 20 + b.random() * 60;
        b.rect(x, 204 - h, 14 + b.random() * 8, h, mix(palette.far, palette.mid, 0.5));
        b.rect(x + 3, 204 - h - 6, 9, 6, mix(palette.far, palette.mid, 0.5));
        for (let yy = 208 - h; yy < 200; yy += 9) b.rect(x + 5, yy, 2, 3, mix(palette.accent, palette.far, 0.55));
      }
      b.rect(155, 176, 400, 6, mix(palette.far, palette.mid, 0.4));
      for (let i = 0; i < 8; i++) b.rect(170 + i * 52, 181, 5, 30, palette.far);
    }
    if (region === 'tundra' || region === 'forest' || region === 'hollow') {
      for (let i = -1; i < 25; i++) pine(b, i * 29, 238, 30 + b.random() * 47, palette.mid, mix(palette.mid, palette.light, 0.2));
    }
  }
  // Terrain layers and a worn path through the playable plane.
  c.poly([[0, 225], [80, 213], [157, 238], [237, 228], [319, 247], [405, 236], [505, 217], [640, 229], [640, 360], [0, 360]], palette.ground);
  c.poly([[253, 238], [350, 238], [383, 268], [493, 288], [640, 320], [640, 360], [107, 360], [199, 317], [277, 290], [276, 264]], mix(palette.ground, palette.light, 0.29));
  c.scatter(4000, [0, 238, 640, 122], [palette.grass, palette.ground, mix(palette.ground, '#182623', 0.25), mix(palette.light, palette.ground, 0.5)], 4);
  if (region === 'city' || region === 'citadel' || region === 'moon' || region === 'ship') {
    for (let y = 242; y < 360; y += 15) {
      c.line(0, y, 640, y, mix(palette.ground, '#172328', 0.25));
      for (let x = (y % 30 ? 0 : 18); x < 640; x += 39) c.line(x, y + 1, x - 9, y + 14, mix(palette.ground, '#172328', 0.2));
    }
  }
  if (region === 'hollow' && !battle) {
    ruinedWall(c, palette);
    tower(c, 578, 244, 45, 102, palette, true);
    tree(c, 535, 276, 219, palette);
    tent(c, 265, 264);
    crate(c, 191, 277, 24, 19); crate(c, 180, 265); crate(c, 448, 277);
    c.rect(413, 272, 28, 4, '#88734e'); c.rect(417, 276, 3, 8, '#464839'); c.rect(435, 276, 3, 8, '#464839');
    // A carved stone shrine and offerings.
    stoneWall(c, 104, 262, 24, 17, palette);
    c.rect(114, 250, 5, 12, '#7b806b'); c.rect(111, 254, 11, 3, '#939681');
    c.rect(107, 260, 2, 3, '#c6a56a');
    lights.push({ x: 367, y: 276, color: 0xf3a451, radius: 95 }, { x: 237, y: 249, color: 0xe2a75d, radius: 44 });
  } else if (region === 'citadel' || region === 'city' || region === 'moon') {
    tower(c, 20, 251, 47, 145, palette, region !== 'moon');
    tower(c, 551, 250, 58, 171, palette, true);
    stoneWall(c, 59, 226, 103, 24, palette);
    stoneWall(c, 454, 225, 99, 24, palette);
    for (let i = 0; i < 4; i++) { c.rect(69 + i * 25, 212, 6, 14, palette.light); c.rect(459 + i * 25, 211, 6, 14, palette.light); }
    lights.push({ x: 98, y: 218, color: 0xe9b26b, radius: 50 }, { x: 527, y: 216, color: 0xe9b26b, radius: 50 });
  } else if (region === 'forest' || region === 'hollow') {
    tree(c, 53, 284, 220, palette);
    tree(c, 582, 268, 198, palette);
    ruinedWall(b, { ...palette, rock: palette.mid, light: mix(palette.light, palette.mid, 0.7) });
    lights.push({ x: 314, y: 267, color: 0x97b987, radius: 80 });
  } else if (region === 'mine') {
    c.line(165, 232, 76, 360, '#242b2b', 3); c.line(201, 232, 165, 360, '#242b2b', 3);
    for (let y = 246; y < 360; y += 12) c.line(152 - (y - 246) * 0.7, y, 198 - (y - 246) * 0.3, y, '#8f7959', 3);
    c.rect(39, 236, 45, 25, '#5e5b4c'); c.rect(35, 232, 54, 5, '#8c8066');
    c.ellipse(47, 263, 5, 5, '#232b2b'); c.ellipse(76, 263, 5, 5, '#232b2b');
    for (const x of [85, 530]) {
      c.rect(x, 172, 5, 67, '#60533f');
      c.rect(x - 4, 168, 13, 13, '#ba8d57');
      c.rect(x - 2, 169, 9, 8, '#edbc75');
      lights.push({ x: x + 2, y: 173, color: 0xf5a363, radius: 73 });
    }
  } else if (region === 'tundra') {
    for (let i = 0; i < 6; i++) {
      const x = i < 3 ? 25 + i * 28 : 497 + i * 22;
      pine(c, x, 258 + i * 4, 95 + c.random() * 50, '#394f58', '#91acb4');
    }
    c.poly([[191, 260], [213, 202], [232, 191], [239, 254]], '#90adb9');
    c.poly([[209, 257], [232, 192], [234, 236], [244, 255]], '#c1d5d6');
    c.line(232, 196, 226, 247, '#dce7dd');
  } else if (region === 'desert') {
    mountain(c, -82, 284, 260, 115, palette.rock, palette.light);
    mountain(c, 494, 283, 225, 139, palette.rock, mix(palette.light, palette.rock, 0.3));
    c.rect(135, 206, 4, 65, '#595246');
    c.poly([[139, 211], [163, 215], [157, 230], [139, 227]], '#a96f56');
    for (let i = 0; i < 12; i++) c.line(260 + i * 8, 311 + i % 3, 292 + i * 8, 311 + i % 3, '#af946d');
  }
  // Foreground silhouettes create a distinct depth plane without obscuring actors.
  d.poly([[0, 317], [20, 305], [52, 322], [74, 312], [108, 338], [170, 347], [218, 360], [0, 360]], mix(palette.ground, '#12221f', 0.5));
  d.poly([[483, 360], [520, 344], [556, 322], [588, 332], [612, 309], [640, 302], [640, 360]], mix(palette.ground, '#152021', 0.45));
  if (['hollow', 'forest', 'tundra'].includes(region)) {
    for (let i = 0; i < 160; i++) {
      const x = i < 80 ? d.random() * 146 : 527 + d.random() * 114;
      const y = 324 + d.random() * 36;
      const color = mix(palette.grass, '#172a22', 0.45);
      d.line(x, y, x - 3 + d.random() * 6, y - 4 - d.random() * 13, color);
      if (i % 15 === 0) d.rect(x, y - 9, 2, 2, palette.accent);
    }
  }
  return { sky: a.canvas, far: b.canvas, ground: c.canvas, front: d.canvas, lights, palette };
}
