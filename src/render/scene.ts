import Phaser from 'phaser';
import { ENEMY_MAP } from '../data/enemies.ts';
import { COMPANIONS } from '../data/origins.ts';
import { colorOf, createGame, levelOf } from '../game/state.ts';
import type { CombatEvent, GameState, Region } from '../game/types.ts';
import { landscape, SCENE_HEIGHT, SCENE_WIDTH } from './landscape.ts';
import { companionSprite, enemySprite, heroSprite } from './sprites.ts';
import type { Pose } from './sprites.ts';
import { Pixel } from './pixel.ts';
import { elementalImpact } from './effects.ts';

export type SceneMode = 'camp' | 'battle' | 'travel' | 'cinematic';
export interface SceneOptions {
  state: GameState | null;
  mode: SceneMode;
  region: Region;
  cinematic?: number;
  reducedMotion?: boolean;
}

/** Phaser owns the render loop, textures, camera, input, and all effect tweens. */
class WolfScene extends Phaser.Scene {
  options: SceneOptions = { state: null, mode: 'cinematic', region: 'hollow' };
  ready = false;
  onReady: (() => void) | null = null;
  onInteract: ((action: string) => void) | null = null;
  private layers: Phaser.GameObjects.Container | null = null;
  private actors = new Map<string, Phaser.GameObjects.Image>();
  private shadows = new Map<string, Phaser.GameObjects.Ellipse>();
  private ambient: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private fire: Phaser.GameObjects.Graphics | null = null;
  private glowLights: Phaser.GameObjects.Image[] = [];
  private fireAt: { x: number; y: number } | null = null;
  private artKey = '';
  private actorKey = '';
  private heroBaseX = 333;
  private heroBaseY = 286;
  private moveTarget: { x: number; y: number } | null = null;
  private actionUntil = 0;
  private keys: Record<string, Phaser.Input.Keyboard.Key> | null = null;
  private animationToken = 0;

  constructor() { super('wolf-world'); }

  create(): void {
    const spark = new Pixel(5, 5);
    spark.rect(2, 0, 1, 5, '#ffffff'); spark.rect(0, 2, 5, 1, '#ffffff');
    this.textures.addCanvas('spark', spark.canvas);
    const dot = new Pixel(2, 2); dot.rect(0, 0, 2, 2, '#ffffff');
    this.textures.addCanvas('dot', dot.canvas);
    const glow = document.createElement('canvas');
    glow.width = 128; glow.height = 128;
    const ctx = glow.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 1, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,235,191,.65)');
    gradient.addColorStop(0.2, 'rgba(255,229,165,.25)');
    gradient.addColorStop(1, 'rgba(255,220,155,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
    this.textures.addCanvas('glow', glow);
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E') as Record<string, Phaser.Input.Keyboard.Key> ?? null;
    // DOM controls retain normal arrow-key and space-key behavior.
    this.input.keyboard?.clearCaptures();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.options.mode !== 'camp' || this.options.reducedMotion) return;
      if (pointer.y < 220) return;
      this.moveTarget = { x: Phaser.Math.Clamp(pointer.x, 170, 463), y: Phaser.Math.Clamp(pointer.y, 265, 306) };
    });
    this.ready = true;
    this.apply(this.options);
    this.onReady?.();
  }

  apply(options: SceneOptions): void {
    this.options = options;
    if (!this.ready) return;
    const sceneKey = `${options.region}:${options.mode === 'battle'}:${options.mode === 'camp'}:${options.cinematic ?? ''}`;
    const changedScene = sceneKey !== this.artKey;
    if (changedScene) {
      this.animationToken++;
      this.tweens.killAll();
      this.cameras.main.setZoom(1);
      for (const object of [...this.children.list]) {
        if ('depth' in object && typeof object.depth === 'number' && object.depth >= 230) object.destroy();
      }
      this.glowLights = [];
      this.layers?.destroy(true);
      this.layers = this.add.container(0, 0);
      this.ambient?.destroy(); this.ambient = null;
      this.fire?.destroy(); this.fire = null; this.fireAt = null;
      this.artKey = sceneKey;
      const art = landscape(options.region, options.mode !== 'camp');
      for (const [index, name] of ['sky', 'far', 'ground', 'front'].entries()) {
        const key = `${sceneKey}:${name}`;
        if (!this.textures.exists(key)) this.textures.addCanvas(key, art[name as 'sky' | 'far' | 'ground' | 'front']);
        const layer = this.add.image(0, 0, key).setOrigin(0, 0).setDepth(index === 3 ? 200 : index * 10);
        this.layers.add(layer);
        // Containers share depth, so keep the foreground as a separate object.
        if (name === 'front') { this.layers.remove(layer); layer.setDepth(200); this.layers.once('destroy', () => layer.destroy()); }
      }
      for (const light of art.lights) {
        const glow = this.add.image(light.x, light.y, 'glow').setTint(light.color).setDisplaySize(light.radius * 2, light.radius * 2).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.42).setDepth(120);
        this.glowLights.push(glow);
        this.layers.once('destroy', () => glow.destroy());
      }
      if (options.region === 'hollow' && (options.mode === 'camp' || options.cinematic === 3)) {
        this.fireAt = { x: 367, y: 276 };
        this.fire = this.add.graphics().setDepth(105);
        this.layers.once('destroy', () => this.fire?.destroy());
      }
      this.cameras.main.setBackgroundColor('#17252a');
      this.createAmbient();
      if (options.cinematic !== undefined && !options.reducedMotion) {
        this.tweens.add({ targets: this.cameras.main, zoom: 1.045, duration: 5100, ease: 'Sine.InOut' });
      }
    }
    const state = options.state;
    const key = state ? `${state.origin}:${state.carved}:${levelOf(state)}:${JSON.stringify(state.equipment)}:${JSON.stringify(state.upgrades)}:${options.mode}:${state.battle?.id}:${state.companion}` : `${options.mode}:empty:${options.cinematic ?? ''}`;
    if (key !== this.actorKey || changedScene) {
      this.actors.forEach(actor => actor.destroy()); this.actors.clear();
      this.shadows.forEach(shadow => shadow.destroy()); this.shadows.clear();
      this.actorKey = key;
      this.moveTarget = null;
      if (state && options.mode !== 'cinematic') {
        const poses: Pose[] = ['idle', 'walk1', 'walk2', 'attack', 'hurt', 'rest'];
        for (const pose of poses) {
          const texture = `hero-${pose}`;
          if (this.textures.exists(texture)) this.textures.remove(texture);
          this.textures.addCanvas(texture, heroSprite(state, pose));
        }
        this.heroBaseX = options.mode === 'battle' ? 177 : 333;
        this.heroBaseY = options.mode === 'battle' ? 288 : 286;
        this.addActor('hero', 'hero-idle', this.heroBaseX, this.heroBaseY, options.mode === 'battle' ? 1.3 : 1.13, false);
        const companion = COMPANIONS.find(value => value.id === state.companion)!;
        const companionKey = `companion-${companion.color}`;
        if (!this.textures.exists(companionKey)) this.textures.addCanvas(companionKey, companionSprite(companion.color));
        this.addActor('companion', companionKey, options.mode === 'battle' ? 99 : 419, options.mode === 'battle' ? 269 : 280, 0.91, options.mode !== 'battle');
        if (options.mode === 'battle' && state.battle) {
          const count = state.battle.enemies.length;
          for (const [index, enemy] of state.battle.enemies.entries()) {
            const texture = `enemy-${enemy.id}`;
            if (!this.textures.exists(texture)) this.textures.addCanvas(texture, enemySprite(enemy.id));
            const boss = ENEMY_MAP[enemy.id].boss;
            this.addActor(enemy.uid, texture, count === 1 ? 454 : 370 + index * 77, 280 + (index % 2 ? 15 : -5), boss ? 1.55 : 0.94, false);
          }
        }
      } else if (options.mode === 'cinematic' && options.cinematic !== undefined) {
        const origins = ['red', 'gold', 'obsidian'] as const;
        const cast = options.cinematic < 3 ? [origins[options.cinematic]] : [...origins];
        for (const [index, origin] of cast.entries()) {
          const texture = `prologue-${origin}`;
          if (!this.textures.exists(texture)) {
            this.textures.addCanvas(texture, heroSprite(createGame('A life', origin, 1, 1), 'rest'));
          }
          this.addActor(`prologue-${origin}`, texture, cast.length === 1 ? 355 : 304 + index * 53,
            283 + (index % 2 ? 3 : -3), 1.12, index === 2);
        }
      }
    }
    if (options.mode === 'battle' && state?.battle && this.time.now >= this.actionUntil) this.syncDefeated();
    if (options.reducedMotion) this.ambient?.stop(); else this.ambient?.start();
  }

  private addActor(id: string, texture: string, x: number, y: number, scale: number, flip: boolean): void {
    const shadow = this.add.ellipse(x, y + 1, id === 'hero' ? 31 : 43, 8, 0x131b20, 0.37).setDepth(80);
    const actor = this.add.image(x, y, texture).setOrigin(0.5, 0.91).setScale(scale).setFlipX(flip).setDepth(90 + y / 100);
    this.actors.set(id, actor); this.shadows.set(id, shadow);
    actor.setData('baseY', y); actor.setData('baseX', x); actor.setData('baseScale', scale);
  }

  private createAmbient(): void {
    const frost = this.options.region === 'tundra';
    const firefly = this.options.region === 'forest' || this.options.region === 'hollow';
    this.ambient = this.add.particles(0, 0, 'dot', {
      x: { min: 0, max: 640 }, y: { min: frost ? -15 : 80, max: frost ? 30 : 310 },
      lifespan: frost ? 9000 : 7000,
      speedX: { min: frost ? -15 : -3, max: frost ? -5 : 3 },
      speedY: { min: frost ? 17 : -7, max: frost ? 26 : -2 },
      scale: { start: frost ? 0.65 : 0.5, end: 0.2 },
      alpha: { start: firefly ? 0.6 : 0.24, end: 0 },
      tint: frost ? 0xe0e7db : firefly ? 0xdace9c : 0xd4baa0,
      frequency: frost ? 180 : 500,
      maxParticles: 80,
    }).setDepth(140);
  }

  update(time: number, delta: number): void {
    if (!this.ready) return;
    const reduced = this.options.reducedMotion;
    if (this.fire && this.fireAt) {
      const { x, y } = this.fireAt;
      this.fire.clear();
      this.fire.fillStyle(0x282e28); this.fire.fillEllipse(x, y + 3, 23, 7);
      this.fire.fillStyle(0x99917b);
      for (let i = 0; i < 7; i++) this.fire.fillRect(x - 12 + i * 4, y + (i % 2) * 3, 4, 3);
      this.fire.fillStyle(0x5c432d); this.fire.fillRect(x - 8, y - 1, 16, 3);
      const flicker = reduced ? 2 : Math.floor(time / 110) % 4;
      this.fire.fillStyle(0xcd773a); this.fire.fillRect(x - 7, y - 10, 14, 10);
      this.fire.fillStyle(0xf3b762); this.fire.fillRect(x - 4, y - 13 - flicker, 8, 13 + flicker);
      this.fire.fillStyle(0xf8d89b); this.fire.fillRect(x - 2, y - 8 - flicker, 4, 8 + flicker);
      this.fire.fillStyle(0xe99750, 0.7); this.fire.fillRect(x + 3, y - 23 - (reduced ? 0 : Math.floor(time / 90) % 12), 1, 2);
    }
    if (!reduced) for (const [index, light] of this.glowLights.entries()) light.setAlpha(0.36 + Math.sin(time / 310 + index) * 0.035);
    const hero = this.actors.get('hero');
    if (hero && this.options.mode === 'camp' && !reduced) {
      const inputTarget = document.activeElement;
      const typing = inputTarget instanceof HTMLInputElement || inputTarget instanceof HTMLTextAreaElement || inputTarget instanceof HTMLSelectElement;
      let dx = 0, dy = 0;
      if (!typing && !document.querySelector('dialog[open]') && this.keys) {
        if (time > this.actionUntil) {
          dx = Number(this.keys.D.isDown || this.keys.RIGHT.isDown) - Number(this.keys.A.isDown || this.keys.LEFT.isDown);
          dy = Number(this.keys.S.isDown || this.keys.DOWN.isDown) - Number(this.keys.W.isDown || this.keys.UP.isDown);
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.E)) this.onInteract?.(hero.x < 280 ? 'rest' : hero.x > 405 ? 'talk' : 'meal');
      }
      if (dx || dy) this.moveTarget = { x: Phaser.Math.Clamp(hero.x + dx * 10, 170, 463), y: Phaser.Math.Clamp(hero.y + dy * 8, 265, 306) };
      if (this.moveTarget && time > this.actionUntil) {
        const distance = Phaser.Math.Distance.Between(hero.x, hero.y, this.moveTarget.x, this.moveTarget.y);
        const step = Math.min(distance, delta * 0.08);
        if (distance > 1) {
          const angle = Phaser.Math.Angle.Between(hero.x, hero.y, this.moveTarget.x, this.moveTarget.y);
          hero.x += Math.cos(angle) * step; hero.y += Math.sin(angle) * step;
          hero.setFlipX(Math.cos(angle) < 0).setTexture(Math.floor(time / 170) % 2 ? 'hero-walk1' : 'hero-walk2');
          this.heroBaseX = hero.x; this.heroBaseY = hero.y;
          hero.setData('baseY', hero.y);
          const shadow = this.shadows.get('hero')!; shadow.setPosition(hero.x, hero.y + 1);
        } else {
          this.moveTarget = null; hero.setTexture('hero-idle');
        }
      }
    }
    if (time > this.actionUntil && !this.moveTarget) {
      for (const [id, actor] of this.actors.entries()) {
        if (actor.alpha <= 0) continue;
        const baseY = actor.getData('baseY') as number;
        const drone = id.startsWith('enemy') && this.options.state?.battle?.enemies.find(e => e.uid === id)?.id;
        const floating = drone ? ENEMY_MAP[drone]?.family === 'drone' : false;
        actor.y = baseY + (reduced ? 0 : Math.sin(time / (floating ? 490 : 890) + actor.x) * (floating ? 2.5 : 0.55));
      }
    }
  }

  private syncDefeated(): void {
    for (const enemy of this.options.state?.battle?.enemies ?? []) {
      this.actors.get(enemy.uid)?.setAlpha(enemy.hp > 0 ? 1 : 0.13);
      this.shadows.get(enemy.uid)?.setAlpha(enemy.hp > 0 ? 0.37 : 0.05);
    }
  }

  setTarget(uid: string): void {
    for (const [id, actor] of this.actors.entries()) {
      if (!id.startsWith('enemy')) continue;
      actor.setTint(id === uid ? 0xffffff : 0xcdd0ce);
    }
  }

  async present(events: CombatEvent[], speed: 1 | 2): Promise<void> {
    if (!this.ready || !this.scene.isActive()) return;
    const token = ++this.animationToken;
    const reduced = this.options.reducedMotion;
    const pause = reduced ? 25 : 235 / speed;
    this.actionUntil = this.time.now + events.length * pause + 350;
    for (const event of events) {
      if (token !== this.animationToken || !this.scene.isActive()) break;
      this.effect(event, reduced, speed);
      await new Promise<void>(resolve => setTimeout(resolve, event.kind === 'cast' && !reduced ? 460 / speed : pause));
    }
    if (token === this.animationToken) {
      this.actionUntil = this.time.now + 250;
      const hero = this.actors.get('hero');
      if (hero?.active) hero.setTexture('hero-idle').setPosition(this.heroBaseX, this.heroBaseY);
      this.syncDefeated();
    }
  }

  private effect(event: CombatEvent, reduced: boolean | undefined, speed: number): void {
    const target = this.actors.get(event.target);
    const source = this.actors.get(event.source);
    const x = target?.x ?? 390, y = (target?.y ?? 270) - 43;
    const colors = { kinetic: 0xe8ddba, solar: 0xf1ac59, frost: 0x9bd8e4, shock: 0xc7b6ed, void: 0xc18fd5 };
    const color = colors[event.element ?? 'kinetic'];
    if (event.kind === 'cast') {
      const plate = this.add.container(320, 89).setDepth(330);
      const back = this.add.graphics();
      back.fillStyle(0x15221c, .9); back.fillRoundedRect(-118, -18, 236, 36, 3);
      back.lineStyle(1, color, .55);
      back.lineBetween(-116, -18, 116, -18); back.lineBetween(-116, 18, 116, 18);
      back.fillStyle(color, .8); back.fillTriangle(-126, 0, -120, -4, -120, 4);
      back.fillTriangle(126, 0, 120, -4, 120, 4);
      const label = this.add.text(0, 0, event.text, {
        fontFamily: 'Cinzel, Georgia, serif', fontSize: '14px', color: '#ecdfbe',
        stroke: '#142219', strokeThickness: 2,
      }).setOrigin(.5);
      plate.add([back, label]);
      this.tweens.add({ targets: plate, alpha: 0, y: reduced ? 89 : 82,
        delay: reduced ? 120 : 720 / speed, duration: reduced ? 40 : 260 / speed,
        onComplete: () => plate.destroy(true) });
    }
    if (event.kind === 'hit') {
      if (source && event.source === 'hero' && !reduced) {
        source.setTexture('hero-attack');
        this.tweens.add({ targets: source, x: this.heroBaseX + 16, duration: 100 / speed, yoyo: true });
      } else if (source && !reduced && (event.source.startsWith('enemy') || event.source === 'companion')) {
        this.tweens.add({ targets: source, x: source.x + (event.source === 'companion' ? 15 : -17), duration: 100 / speed, yoyo: true });
      }
      if (target) {
        target.setTintFill(color);
        if (event.target === 'hero' && !reduced) target.setTexture('hero-hurt');
        this.time.delayedCall(90 / speed, () => {
          if (!target.active) return;
          target.clearTint();
          if (event.target === 'hero') target.setTexture('hero-idle');
        });
      }
      if (!reduced) {
        if (event.source === 'hero' || event.source === 'companion') elementalImpact(this, event, x, y, speed);
        const particles = this.add.particles(x, y, 'spark', {
          speed: { min: 18, max: event.element === 'shock' ? 155 : 110 },
          lifespan: 460 / speed, quantity: 14, emitting: false,
          scale: { start: event.element === 'void' ? 0.85 : 0.6, end: 0 },
          tint: color, blendMode: Phaser.BlendModes.ADD,
        }).setDepth(250);
        particles.explode(event.critical ? 28 : 14);
        this.time.delayedCall(700 / speed, () => particles.destroy());
        const line = this.add.graphics().setDepth(240);
        line.lineStyle(event.critical ? 4 : 2, color, 0.9);
        if (event.element === 'shock') {
          line.beginPath(); line.moveTo(x - 10, 20);
          for (let n = 0; n < 7; n++) line.lineTo(x + (n % 2 ? 9 : -9), 20 + n * (y - 20) / 6);
          line.strokePath();
        } else if (event.element === 'frost') {
          for (let n = 0; n < 3; n++) line.strokeTriangle(x - 25 + n * 20, y + 30, x - 15 + n * 20, y - 34, x - 7 + n * 20, y + 30);
        } else if (event.element === 'solar' || event.element === 'void') {
          line.strokeCircle(x, y, event.element === 'void' ? 31 : 19);
          line.lineStyle(1, color, 0.5); line.strokeCircle(x, y, 35);
          const glow = this.add.image(x, y, 'glow').setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDepth(239).setAlpha(0.8);
          this.tweens.add({ targets: glow, scale: 1.8, alpha: 0, duration: 450 / speed, onComplete: () => glow.destroy() });
        } else {
          line.lineBetween(x - 28, y + 22, x + 27, y - 27);
          line.lineStyle(1, 0xffffff, 0.9); line.lineBetween(x - 23, y + 24, x + 31, y - 25);
        }
        this.tweens.add({ targets: line, alpha: 0, duration: 300 / speed, onComplete: () => line.destroy() });
        if (event.critical || (event.amount ?? 0) > 400) this.cameras.main.shake(100 / speed, 0.002);
      }
    }
    if (event.kind === 'heal' || event.kind === 'focus') {
      const glow = this.add.image(x, y + 20, 'glow').setTint(event.kind === 'focus' ? 0x9ab7dc : 0xa4c58c).setBlendMode(Phaser.BlendModes.ADD).setDepth(240).setAlpha(0.6);
      this.tweens.add({ targets: glow, alpha: 0, duration: reduced ? 90 : 600 / speed, onComplete: () => glow.destroy() });
    }
    if (event.kind === 'guard') {
      const barrier = this.add.graphics({ x, y }).setDepth(238);
      barrier.lineStyle(2, 0xd3dca8, .8);
      barrier.strokeEllipse(0, 6, 44, 66);
      barrier.lineStyle(1, 0xa3c3d1, .7);
      barrier.strokeEllipse(0, 6, 53, 74);
      barrier.fillStyle(0xb8d3bb, .08); barrier.fillEllipse(0, 6, 42, 64);
      this.tweens.add({ targets: barrier, alpha: 0, scaleX: reduced ? 1 : 1.15, duration: reduced ? 160 : 850 / speed, onComplete: () => barrier.destroy() });
    }
    if (event.kind === 'status' || event.kind === 'guard') {
      const label = event.kind === 'guard' ? 'GUARD'
        : /charges/.test(event.text) ? 'CHARGING'
        : event.text.match(/burn|bleed|weaken|regen/i)?.[0].toUpperCase() ?? 'SUPPORT';
      const text = this.add.text(x, y - 28, label, {
        fontFamily: 'Barlow, sans-serif', fontSize: '11px', fontStyle: 'bold',
        color: event.kind === 'guard' ? '#d8e3b4' : '#e3c29d', stroke: '#20272d', strokeThickness: 3,
      }).setOrigin(.5).setDepth(300);
      this.tweens.add({ targets: text, y: reduced ? y - 28 : y - 43, alpha: 0, duration: reduced ? 150 : 950 / speed, onComplete: () => text.destroy() });
    }
    if (event.kind === 'defeat' && target) {
      if (event.target === 'hero') target.setTexture('hero-rest');
      else this.tweens.add({ targets: target, alpha: .13, duration: reduced ? 20 : 350 / speed });
    }
    if (event.amount !== undefined || event.kind === 'break') {
      const label = event.kind === 'break' ? 'BREAK' : `${event.kind === 'heal' || event.kind === 'focus' ? '+' : ''}${event.amount}${event.critical ? '!' : ''}`;
      const text = this.add.text(x, y - 9, label, {
        fontFamily: 'Barlow, sans-serif', fontSize: event.kind === 'break' ? '20px' : event.critical ? '25px' : '20px',
        fontStyle: 'bold', color: event.kind === 'heal' ? '#c5e4a9' : event.kind === 'break' ? '#f6ce7e' : '#fff1d4',
        stroke: '#20272d', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(300);
      this.tweens.add({ targets: text, y: reduced ? y - 9 : y - 35, alpha: 0, duration: reduced ? 150 : 820 / speed, onComplete: () => text.destroy() });
    }
  }

  careEffect(kind: string): void {
    if (!this.ready) return;
    const hero = this.actors.get('hero');
    if (!hero) return;
    const reduced = this.options.reducedMotion;
    this.actionUntil = this.time.now + (reduced ? 150 : 1300);
    if (kind === 'rest') {
      hero.setTexture('hero-rest');
      this.effect({ kind: 'heal', source: 'hero', target: 'hero', text: '' }, reduced, 1);
    } else if (kind === 'train') {
      hero.setTexture('hero-attack');
      this.effect({ kind: 'hit', source: 'hero', target: 'companion', element: 'kinetic', text: '' }, reduced, 1);
    } else {
      this.effect({ kind: 'heal', source: 'hero', target: 'hero', text: '', amount: kind === 'meal' ? 42 : 15 }, reduced, 1);
    }
    this.time.delayedCall(reduced ? 160 : 1300, () => { if (hero.active) hero.setTexture('hero-idle'); });
  }

  dispose(): void {
    this.animationToken++;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.input.removeAllListeners();
  }
}

export class GameRenderer {
  readonly host: HTMLDivElement;
  readonly game: Phaser.Game;
  private readonly scene: WolfScene;
  private readonly observer: ResizeObserver;
  private options: SceneOptions = { state: null, mode: 'cinematic', region: 'hollow' };
  constructor(onInteract: (action: string) => void) {
    this.host = document.createElement('div');
    this.host.className = 'phaser-host';
    this.host.setAttribute('aria-hidden', 'true');
    this.scene = new WolfScene();
    this.scene.onInteract = onInteract;
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.host,
      width: SCENE_WIDTH,
      height: SCENE_HEIGHT,
      transparent: false,
      backgroundColor: '#1d2a30',
      pixelArt: true,
      roundPixels: true,
      antialias: false,
      audio: { noAudio: true },
      render: { powerPreference: 'low-power', clearBeforeRender: true },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [this.scene],
      banner: false,
    });
    this.scene.onReady = () => this.scene.apply(this.options);
    this.observer = new ResizeObserver(() => { if (this.host.isConnected) this.game.scale.refresh(); });
    this.observer.observe(this.host);
  }
  set(options: SceneOptions): void {
    this.options = options;
    this.game.scale.scaleMode = options.mode === 'cinematic' ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT;
    this.scene.apply(options);
    if (this.scene.ready && this.scene.sys.isPaused()) this.scene.sys.resume();
    if (this.scene.ready) this.game.loop.wake();
    this.game.scale.refresh();
  }
  pause(): void {
    if (!this.scene.ready) return;
    // Queued scene commands cannot finish after the game loop goes to sleep.
    if (this.scene.sys.isActive()) this.scene.sys.pause();
    this.game.loop.sleep();
  }
  setTarget(uid: string): void { this.scene.setTarget(uid); }
  present(events: CombatEvent[], speed: 1 | 2): Promise<void> { return this.scene.present(events, speed); }
  care(kind: string): void { this.scene.careEffect(kind); }
  destroy(): void {
    this.observer.disconnect();
    this.scene.dispose();
    this.game.destroy(true);
    this.host.remove();
  }
  get origin(): OriginLike { return this.options.state ? colorOf(this.options.state) : 'red'; }
}
type OriginLike = 'red' | 'gold' | 'obsidian';
