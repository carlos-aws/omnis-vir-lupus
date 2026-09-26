import { ENEMY_MAP } from '../data/enemies.ts';
import { ITEM_MAP } from '../data/items.ts';
import { GROWTH } from '../data/origins.ts';
import { colorOf, levelOf, xpForLevel } from '../game/state.ts';
import type { GameState, Item, Origin } from '../game/types.ts';
import { Pixel, mix } from './pixel.ts';

const ORIGIN_COLORS: Record<Origin, { hair: string; coat: string; skin: string; eye: string }> = {
  red: { hair: '#914a3c', coat: '#995c4a', skin: '#cba17b', eye: '#d08057' },
  gold: { hair: '#d7b36e', coat: '#a69562', skin: '#d1ac85', eye: '#ebce83' },
  obsidian: { hair: '#d0d6cf', coat: '#7d95a2', skin: '#a8afb3', eye: '#a9c2d4' },
};
export type Pose = 'idle' | 'walk1' | 'walk2' | 'attack' | 'hurt' | 'rest';

function weapon(p: Pixel, x: number, y: number, shape: Item['shape'], color: string, attack: boolean): void {
  const edge = mix(color, '#f2ead6', 0.65);
  if (shape === 'axe') {
    p.line(x, y - 21, x + (attack ? 12 : -4), y + 13, '#554734', 2);
    p.poly([[x - 7, y - 20], [x + 5, y - 25], [x + 11, y - 18], [x + 8, y - 11], [x - 5, y - 13]], '#27323a');
    p.poly([[x - 6, y - 19], [x + 4, y - 23], [x + 9, y - 18], [x + 7, y - 13], [x - 4, y - 14]], color);
    p.line(x + 5, y - 23, x + 10, y - 18, edge, 2);
    p.line(x + 10, y - 18, x + 8, y - 13, edge);
  } else if (shape === 'spear') {
    p.line(x, y - 24, x, y + 16, '#5d655b', 2);
    p.poly([[x + 1, y - 35], [x + 6, y - 21], [x + 1, y - 18], [x - 4, y - 21]], color);
    p.line(x + 1, y - 33, x + 1, y - 20, edge);
    p.rect(x - 2, y - 2, 7, 2, '#b5a16e');
  } else {
    if (attack) {
      p.poly([[x - 3, y - 1], [x + 21, y - 13], [x + 23, y - 16], [x + 17, y - 15], [x - 5, y - 4]], color);
      p.line(x - 2, y - 3, x + 22, y - 16, edge);
      p.line(x - 5, y - 9, x + 1, y + 3, '#d0ad68', 2);
    } else {
      p.poly([[x, y - 3], [x + 1, y - 31], [x + 5, y - 37], [x + 6, y - 8], [x + 4, y - 3]], '#29313a');
      p.poly([[x + 1, y - 4], [x + 2, y - 30], [x + 4, y - 34], [x + 4, y - 6]], color);
      p.line(x + 4, y - 33, x + 4, y - 7, edge);
      if (shape === 'razor') p.line(x + 2, y - 29, x - 2, y - 22, color);
      p.rect(x - 3, y - 4, 12, 2, '#c2a568');
      p.rect(x + 1, y - 1, 3, 8, '#514136');
      p.rect(x, y + 6, 5, 2, '#b79c66');
    }
  }
}

export function heroSprite(state: Pick<GameState, 'origin' | 'carved' | 'xp' | 'equipment' | 'upgrades'>, pose: Pose = 'idle'): HTMLCanvasElement {
  const p = new Pixel(80, 88);
  const color = colorOf(state);
  const palette = ORIGIN_COLORS[color];
  const level = levelOf(state);
  const phase = GROWTH.reduce<number>((best, stage, index) => level >= stage.level ? index : best, 0);
  const weaponItem = ITEM_MAP[state.equipment.weapon ?? ''];
  const armor = ITEM_MAP[state.equipment.armor ?? ''];
  const worn = armor?.color ?? palette.coat;
  const metal = mix(worn, '#cbd2c5', 0.35);
  const dark = '#20282b', shade = mix(worn, '#222d30', 0.55);
  const old = phase >= 6;
  const hair = mix(palette.hair, '#d9d7c4', [0, 0, 0, 0, .05, .2, .48, .76][phase]);
  const x = color === 'obsidian' ? -1 : 0;
  const foot = 79;
  const top = [25, 23, 21, 19, 18, 18, 19, 20][phase];
  const stride = pose === 'walk1' ? 3 : pose === 'walk2' ? -3 : 0;
  const attack = pose === 'attack';
  const bob = stride ? -1 : 0;
  p.ctx.translate(x + (pose === 'hurt' ? -2 : 0), bob);
  // A cape sits behind the whole silhouette; it grows more distinct with age.
  if (level >= 8 || color === 'obsidian') {
    p.poly([[27, top + 18], [43, top + 18], [48 + stride, 69], [34, 72], [18 - stride, 68]], dark);
    p.poly([[28, top + 19], [41, top + 19], [44 + stride, 67], [33, 69], [21 - stride, 66]], shade);
    p.line(26, top + 25, 23 - stride, 64, mix(worn, '#29312a', 0.4), 2);
    p.line(39, top + 25, 43 + stride, 66, mix(worn, '#c4ad78', 0.2));
    p.rect(28, 67, 10, 2, '#b69b66');
    if (phase >= 5) {
      p.line(22, 62, 20, 71, '#c1aa78');
      p.line(44, 62, 47, 71, '#c1aa78');
      p.rect(21, 70, 5, 2, '#c8b07b');
      p.rect(42, 70, 5, 2, '#c8b07b');
    }
  }
  // Far arm and shoulder.
  p.poly([[23, top + 19], [29, top + 20], [26, 57], [20, 56], [19, top + 28]], dark);
  p.rect(21, top + 24, 5, 15, shade);
  p.rect(21, 52, 5, 8, palette.skin);
  p.rect(20, top + 21, 8, 7, metal);
  p.rect(21, top + 20, 6, 2, mix(metal, '#e6d4a4', 0.35));
  // Boots and separated legs.
  p.rect(27 + stride, 56, 7, foot - 56, dark);
  p.rect(36 - stride, 56, 7, foot - 56, dark);
  p.rect(28 + stride, 57, 5, 12, '#525753');
  p.rect(37 - stride, 57, 5, 12, '#3d4747');
  p.rect(25 + stride, 74, 10, 6, '#252d2d');
  p.rect(36 - stride, 74, 10, 6, '#20292b');
  p.rect(27 + stride, 73, 6, 2, '#8b7f61');
  p.rect(38 - stride, 73, 5, 2, '#8b7f61');
  p.rect(26 + stride, 79, 8, 1, '#929180');
  p.rect(37 - stride, 79, 8, 1, '#686f66');
  // Fitted torso, belt, shoulder trim, and progressively heavier armor.
  p.poly([[27, top + 16], [41, top + 16], [45, top + 23], [41, 58], [27, 59], [24, top + 26]], dark);
  p.poly([[28, top + 19], [40, top + 19], [42, top + 25], [39, 56], [29, 56], [26, top + 26]], worn);
  p.rect(28, top + 23, 10, 3, metal);
  p.line(29, top + 27, 29, 50, mix(worn, '#e9cea0', 0.25), 2);
  p.line(39, top + 26, 38, 52, shade, 2);
  if (armor && armor.level >= 12) {
    for (let i = 0; i < 3; i++) {
      p.rect(28, top + 28 + i * 6, 12, 5, metal);
      p.rect(29, top + 28 + i * 6, 9, 1, mix(metal, '#ece2c5', 0.3));
      p.rect(37, top + 30 + i * 6, 3, 3, shade);
    }
  } else {
    p.line(27, top + 21, 39, 50, '#534637', 2);
    p.rect(30, top + 30, 3, 2, '#c0a575');
  }
  p.rect(27, 52, 15, 4, '#433d32');
  p.rect(32, 52, 4, 4, '#c7a96b'); p.rect(33, 53, 2, 2, '#635744');
  p.rect(25, 53, 4, 8, '#6a5740');
  if (phase >= 2) {
    p.line(28, top + 20, 39, 49, '#c1a16d', 2);
    p.line(28, top + 22, 38, 49, '#796346');
  }
  if (phase >= 4) {
    p.rect(19, top + 20, 10, 4, metal);
    p.rect(19, top + 19, 10, 1, '#d6c394');
    p.line(28, 55, 30, 61, '#bbaa7f');
    p.line(30, 61, 37, 56, '#bbaa7f');
  }
  // Neck, face and hair. Small asymmetries keep portraits human.
  p.rect(30, top + 11, 9, 10, dark);
  p.rect(31, top + 12, 7, 7, mix(palette.skin, '#695447', 0.22));
  p.rect(26, top - 1, 17, 15, dark);
  p.rect(28, top + 1, 13, 13, palette.skin);
  p.rect(39, top + 4, 3, 8, mix(palette.skin, '#675144', 0.25));
  p.rect(27, top + 5, 2, 5, palette.skin);
  p.rect(29, top + 11, 10, 4, mix(palette.skin, '#785b49', 0.18));
  p.rect(30, top + 13, 6, 2, mix(palette.skin, '#ece0bd', 0.15));
  p.rect(28, top - 2, 12, 4, hair);
  p.rect(26, top, 5, 5, hair); p.rect(27, top + 4, 2, 5, hair);
  p.rect(37, top, 6, 5, mix(hair, '#443c32', 0.22));
  p.rect(29, top - 3, 7, 2, mix(hair, '#efdbab', 0.25));
  p.rect(29, top + 1, 4, 2, hair); p.rect(34, top + 1, 3, 3, hair);
  p.rect(29, top + 7, 4, 1, '#554736'); p.rect(36, top + 7, 4, 1, '#554736');
  p.rect(30, top + 8, 2, 2, pose === 'rest' ? '#6b5946' : palette.eye);
  p.rect(37, top + 8, 2, 2, pose === 'rest' ? '#6b5946' : palette.eye);
  p.rect(33, top + 10, 2, 2, mix(palette.skin, '#855d46', 0.25));
  if (level >= 28) p.line(39, top + 6, 38, top + 11, '#9c735b');
  if (old) { p.rect(29, top + 13, 2, 2, hair); p.rect(36, top + 13, 3, 2, hair); }
  if (phase >= 5) p.rect(29, top + 13, 10, 1, mix(hair, palette.skin, .4));
  if (phase === 7) {
    p.line(29, top + 6, 32, top + 6, '#9b8269');
    p.line(36, top + 11, 39, top + 11, '#9b8269');
    p.rect(31, top + 14, 6, 2, hair);
  }
  if (color === 'obsidian') {
    p.rect(25, top + 18, 20, 3, '#b7b9a3');
    p.rect(23, top + 20, 24, 4, '#899990');
    p.rect(27, top + 19, 2, 5, '#e0d9bc');
    p.rect(40, top + 19, 2, 5, '#d3cfb7');
  } else {
    p.rect(29, top + 17, 11, 3, '#655749');
    p.rect(30, top + 18, 4, 2, '#c2a272');
  }
  // Front shoulder and sword arm.
  const armX = attack ? 46 : 42;
  p.line(42, top + 24, armX + 1, 48, dark, 7);
  p.line(43, top + 25, armX + 1, 47, worn, 5);
  p.rect(40, top + 20, 8, 6, metal); p.rect(40, top + 20, 7, 2, mix(metal, '#e9d5a1', 0.45));
  p.rect(armX - 1, 47, 5, 8, palette.skin);
  p.rect(armX - 1, 46, 6, 3, '#b49b6a');
  if (phase >= 3) p.rect(44, top + 22, 2, 4, '#dfca98');
  if (phase >= 6) { p.rect(40, top + 25, 7, 2, '#d6c394'); p.rect(41, top + 27, 5, 1, '#83939d'); }
  if (pose !== 'rest') weapon(p, armX + 6, 49, weaponItem?.shape ?? 'blade', weaponItem?.color ?? '#b8bab2', attack);
  const forged = weaponItem ? state.upgrades[weaponItem.id] ?? 0 : 0;
  if (forged && pose !== 'rest') {
    for (let i = 0; i < forged; i++) p.rect(armX + 6, 41 - i * 3, 2, 1, forged >= 4 ? '#b8d9df' : '#eee0ab');
  }
  if (state.equipment.relic) {
    const relic = ITEM_MAP[state.equipment.relic];
    p.line(31, top + 19, 35, top + 26, '#b39d70');
    p.line(39, top + 19, 35, top + 26, '#b39d70');
    p.rect(34, top + 25, 3, 4, relic?.color ?? '#dbc184');
    p.rect(35, top + 25, 1, 2, '#fff1c7');
  }
  p.ctx.resetTransform();
  return p.canvas;
}

export function companionSprite(origin: Origin): HTMLCanvasElement {
  return heroSprite({
    origin, carved: false, xp: xpForLevel(28),
    equipment: { weapon: origin === 'obsidian' ? 'ice-axe' : 'mining-blade', armor: origin === 'gold' ? 'academy-coat' : origin === 'obsidian' ? 'fur-mantle' : 'work-clothes', relic: null },
    upgrades: {},
  }, 'rest');
}

export function enemySprite(id: string): HTMLCanvasElement {
  const def = ENEMY_MAP[id];
  const p = new Pixel(112, 112);
  const main = def.color, dark = mix(main, '#18212b', 0.68), mid = mix(main, '#303b42', 0.3), light = mix(main, '#eeead1', 0.5);
  const eye = def.boss ? '#f0b779' : '#dec78a';
  const family = def.family;
  if (family === 'soldier' || family === 'knight' || family === 'oracle') {
    const cape = family === 'oracle';
    if (cape || def.boss) {
      p.poly([[44, 38], [66, 38], [78, 97], [55, 103], [30, 96]], dark);
      p.poly([[45, 40], [64, 40], [72, 95], [54, 100], [35, 94]], mid);
      p.line(43, 52, 37, 93, main, 2);
    }
    p.rect(42, 68, 10, 32, '#293138'); p.rect(58, 68, 10, 32, '#222d33');
    p.rect(39, 95, 15, 7, dark); p.rect(57, 95, 14, 7, dark);
    p.rect(43, 78, 8, 4, main); p.rect(59, 78, 8, 4, main);
    p.poly([[40, 38], [64, 37], [71, 49], [65, 73], [42, 73], [34, 50]], dark);
    p.poly([[43, 39], [63, 39], [66, 49], [63, 71], [44, 71], [39, 49]], main);
    p.rect(43, 42, 17, 4, light);
    for (let row = 0; row < 4; row++) {
      p.rect(43, 49 + row * 5, 21, 4, mid);
      p.rect(44, 49 + row * 5, 17, 1, main);
    }
    p.rect(42, 67, 23, 5, dark); p.rect(51, 67, 6, 4, '#cdb071');
    p.rect(31, 40, 13, 10, mid); p.rect(31, 40, 12, 3, light);
    p.rect(63, 40, 13, 10, mid); p.rect(64, 40, 10, 3, main);
    p.rect(31, 50, 8, 22, dark); p.rect(33, 50, 5, 16, main);
    p.rect(69, 50, 8, 22, dark); p.rect(70, 51, 4, 16, mid);
    p.rect(30, 68, 10, 6, '#bba084'); p.rect(69, 68, 10, 6, '#ac927a');
    p.rect(46, 32, 14, 8, dark);
    p.poly([[44, 18], [61, 16], [67, 22], [65, 35], [58, 41], [46, 36], [41, 28]], dark);
    p.poly([[45, 19], [59, 18], [64, 23], [63, 34], [56, 38], [46, 33], [44, 26]], main);
    p.line(47, 19, 60, 20, light, 2);
    p.rect(45, 28, 17, 4, '#263039'); p.rect(46, 29, 6, 1, eye); p.rect(56, 29, 5, 1, eye);
    p.rect(52, 31, 3, 8, mid);
    if (family === 'knight') {
      p.poly([[46, 19], [50, 4], [56, 12], [61, 2], [63, 19]], main);
      p.line(50, 7, 49, 17, light, 2);
      p.poly([[26, 54], [37, 49], [43, 54], [42, 75], [32, 83], [24, 74]], dark);
      p.poly([[27, 56], [36, 52], [40, 55], [39, 74], [32, 79], [27, 73]], main);
      p.line(32, 56, 32, 73, light); p.line(28, 63, 38, 63, light);
      weapon(p, 77, 64, 'razor', main, false);
    } else if (family === 'oracle') {
      p.poly([[40, 31], [44, 11], [56, 3], [68, 21], [69, 34], [62, 26], [54, 16], [47, 26]], mid);
      p.line(54, 6, 44, 22, light);
      p.line(82, 28, 78, 98, main, 3);
      p.poly([[82, 10], [91, 25], [83, 34], [73, 26]], main);
      p.poly([[82, 14], [87, 25], [82, 29], [78, 25]], '#d2b3d5');
      p.rect(82, 19, 2, 8, '#f3d9d9');
    } else {
      weapon(p, 76, 66, 'spear', main, false);
      p.rect(47, 14, 13, 4, main);
    }
  } else if (family === 'hound' || family === 'beast') {
    const beast = family === 'beast';
    p.poly([[29, 63], [41, 50], [75, 54], [83, 70], [75, 84], [39, 83], [25, 75]], dark);
    p.poly([[30, 63], [42, 53], [74, 56], [79, 70], [74, 79], [38, 79], [28, 73]], main);
    p.poly([[39, 58], [70, 58], [77, 71], [59, 69], [44, 75], [31, 68]], mid);
    p.line(42, 53, 70, 56, light, 3);
    for (const x of [35, 47, 68, 76]) {
      p.line(x, 75, x - (x < 50 ? 6 : -3), 96, dark, 6);
      p.rect(x - (x < 50 ? 12 : 1), 94, 12, 5, mid);
      for (let n = 0; n < 3; n++) p.rect(x - (x < 50 ? 12 : 1) + n * 4, 97, 2, 2, light);
    }
    p.poly([[34, 56], [27, 38], [13, 35], [10, 52], [3, 59], [6, 69], [22, 68], [33, 76], [40, 64]], dark);
    p.poly([[32, 57], [24, 42], [15, 39], [13, 56], [6, 60], [8, 66], [24, 64], [34, 70]], main);
    p.poly([[14, 43], [12, 23], [24, 40]], mid);
    p.poly([[25, 46], [29, 26], [32, 54]], main);
    p.rect(13, 53, 10, 3, dark); p.rect(14, 54, 6, 2, eye);
    p.rect(4, 60, 7, 4, '#20292f');
    p.line(10, 66, 25, 63, '#242b31', 2);
    p.rect(15, 65, 2, 4, '#eee0b7'); p.rect(23, 63, 2, 4, '#eee0b7');
    p.poly([[77, 57], [88, 45], [104, 42], [94, 51], [85, 65]], main);
    if (beast) {
      for (let i = 0; i < 5; i++) p.poly([[36 + i * 8, 59], [40 + i * 8, 44 - i % 2 * 6], [47 + i * 8, 59]], mid);
      p.rect(47, 60, 4, 3, light); p.rect(61, 64, 4, 3, light);
    } else {
      p.rect(32, 59, 5, 13, '#b1a16f'); p.rect(34, 58, 2, 2, '#e0cc91');
    }
  } else if (family === 'drone') {
    p.line(36, 48, 19, 30, dark, 5); p.line(75, 48, 92, 30, dark, 5);
    p.line(33, 69, 14, 80, dark, 4); p.line(78, 69, 96, 80, dark, 4);
    for (const x of [15, 81]) {
      p.poly([[x, 27], [x + 16, 27], [x + 23, 32], [x + 12, 36], [x - 9, 33]], main);
      p.rect(x, 26, 15, 2, light);
      p.rect(x + 2, 35, 8, 6, mid);
    }
    p.poly([[38, 37], [73, 37], [89, 54], [78, 73], [55, 84], [33, 73], [24, 56]], dark);
    p.poly([[40, 40], [70, 40], [84, 54], [75, 69], [54, 80], [36, 69], [29, 55]], main);
    p.poly([[38, 51], [72, 51], [77, 59], [68, 72], [44, 72], [33, 60]], mid);
    p.line(39, 42, 70, 42, light, 2);
    p.ellipse(55, 58, 11, 11, dark);
    p.ellipse(55, 58, 7, 7, eye);
    p.ellipse(55, 57, 3, 3, '#f4e7bc');
    p.rect(41, 79, 4, 11, '#789398'); p.rect(66, 78, 4, 12, '#789398');
    p.rect(41, 87, 4, 5, '#9dd3d1'); p.rect(66, 87, 4, 5, '#9dd3d1');
  } else {
    // Siege exoskeleton with a readable reactor core, articulated legs and fists.
    p.rect(28, 76, 19, 25, dark); p.rect(65, 76, 19, 25, dark);
    p.rect(29, 78, 13, 20, main); p.rect(67, 78, 12, 20, mid);
    p.rect(23, 96, 25, 9, mid); p.rect(65, 96, 25, 9, mid);
    p.rect(25, 96, 22, 2, light); p.rect(65, 96, 22, 2, main);
    p.poly([[27, 30], [83, 30], [92, 50], [81, 80], [31, 80], [21, 49]], dark);
    p.poly([[30, 33], [80, 33], [86, 50], [77, 75], [34, 75], [27, 49]], main);
    p.poly([[34, 41], [76, 41], [75, 66], [55, 73], [36, 65]], mid);
    p.rect(44, 46, 23, 20, dark);
    p.rect(48, 49, 15, 14, eye); p.rect(52, 52, 7, 8, '#f6dfb0');
    p.rect(24, 27, 65, 9, main); p.rect(24, 27, 65, 3, light);
    p.rect(10, 39, 17, 37, dark); p.rect(13, 42, 12, 29, main);
    p.rect(86, 39, 17, 37, dark); p.rect(87, 42, 12, 29, mid);
    p.rect(8, 69, 20, 17, mid); p.rect(85, 69, 20, 17, mid);
    p.rect(10, 70, 14, 3, light);
    p.rect(43, 10, 25, 20, dark); p.rect(46, 12, 19, 16, main);
    p.rect(46, 20, 20, 4, '#273138'); p.rect(48, 21, 6, 2, eye); p.rect(58, 21, 6, 2, eye);
    p.rect(28, 18, 7, 12, mid); p.rect(77, 14, 7, 15, mid);
    p.scatter(32, [31, 37, 46, 36], [light, dark], 2);
  }
  return p.canvas;
}

export function itemSprite(item: Item): HTMLCanvasElement {
  const p = new Pixel(40, 40);
  const color = item.color;
  if (item.kind === 'weapon') {
    p.ctx.translate(-4, -5);
    weapon(p, 23, 34, item.shape, color, false);
  } else if (item.kind === 'armor') {
    p.poly([[13, 8], [9, 6], [3, 13], [9, 20], [12, 17], [10, 33], [29, 33], [28, 17], [32, 20], [38, 13], [30, 6], [26, 8], [25, 12], [15, 12]], '#243037');
    p.poly([[13, 10], [9, 9], [6, 13], [10, 17], [15, 16], [13, 31], [27, 31], [26, 16], [31, 17], [34, 13], [29, 9], [25, 14], [15, 14]], color);
    p.rect(14, 19, 13, 2, mix(color, '#e5ddbc', 0.45));
    p.rect(14, 25, 13, 2, mix(color, '#23323b', 0.4));
    p.rect(13, 29, 15, 3, '#65573c'); p.rect(19, 28, 4, 4, '#d7bd7b');
  } else if (item.kind === 'relic') {
    for (let i = 0; i < 16; i++) {
      const angle = i / 16 * Math.PI * 2;
      p.rect(20 + Math.cos(angle) * 10, 16 + Math.sin(angle) * 10, 2, 2, '#b3a076');
    }
    p.poly([[20, 18], [28, 27], [20, 35], [12, 27]], color);
    p.poly([[20, 21], [24, 27], [20, 30], [16, 27]], mix(color, '#f9edc5', 0.5));
  } else if (item.kind === 'material') {
    p.poly([[7, 17], [17, 8], [32, 12], [33, 26], [22, 33], [8, 28]], color);
    p.poly([[8, 17], [17, 9], [31, 12], [22, 21]], mix(color, '#e5ddc9', 0.35));
    p.poly([[22, 22], [33, 13], [33, 26], [22, 33]], mix(color, '#1c2b35', 0.35));
  } else if (item.effect === 'food') {
    p.ellipse(20, 25, 15, 9, '#443c32');
    p.ellipse(20, 21, 15, 6, '#b29168');
    p.ellipse(20, 21, 12, 4, '#825f42');
    p.scatter(17, [11, 19, 18, 4], ['#d1ab6e', '#859165'], 3, 2);
    p.line(15, 11, 13, 7, '#b8b8a0'); p.line(25, 12, 23, 8, '#b8b8a0');
  } else if (item.effect === 'heal' || item.effect === 'cleanse') {
    p.rect(7, 12, 27, 20, '#30423e');
    p.rect(8, 13, 25, 17, color); p.rect(8, 13, 25, 3, mix(color, '#e4ddba', 0.3));
    p.rect(16, 9, 10, 4, '#b4a985');
    p.rect(18, 17, 5, 10, '#f0dfb8'); p.rect(15, 20, 11, 4, '#f0dfb8');
  } else {
    p.rect(16, 7, 9, 5, '#c8b07c');
    p.rect(17, 12, 7, 4, '#aac2bb');
    p.poly([[17, 15], [24, 15], [30, 21], [29, 33], [12, 33], [11, 21]], '#334b56');
    p.poly([[14, 22], [27, 22], [27, 31], [14, 31]], color);
    p.rect(14, 21, 2, 8, mix(color, '#eff0d2', 0.6));
  }
  return p.canvas;
}

const portraitCache = new Map<string, string>();
export function portraitUrl(state: GameState): string {
  const key = `${state.origin}:${state.carved}:${levelOf(state)}:${JSON.stringify(state.equipment)}:${JSON.stringify(state.upgrades)}`;
  if (!portraitCache.has(key)) {
    if (portraitCache.size >= 128) portraitCache.delete(portraitCache.keys().next().value!);
    portraitCache.set(key, heroSprite(state).toDataURL());
  }
  return portraitCache.get(key)!;
}
const itemCache = new Map<string, string>();
export function itemUrl(item: Item): string {
  if (!itemCache.has(item.id)) itemCache.set(item.id, itemSprite(item).toDataURL());
  return itemCache.get(item.id)!;
}
const enemyCache = new Map<string, string>();
export function enemyUrl(id: string): string {
  if (!enemyCache.has(id)) enemyCache.set(id, enemySprite(id).toDataURL());
  return enemyCache.get(id)!;
}
