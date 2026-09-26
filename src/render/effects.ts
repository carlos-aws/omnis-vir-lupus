import type Phaser from 'phaser';
import type { CombatEvent } from '../game/types.ts';

/** Element-specific geometry uses the same small, hard-edged shapes as the art. */
export function elementalImpact(scene: Phaser.Scene, event: CombatEvent, x: number, y: number, speed: number): void {
  const element = event.element;
  if (!element || element === 'kinetic') return;
  const colors = { solar: 0xf4be70, frost: 0xb3e0e7, shock: 0xcbbceb, void: 0xc398d5 };
  const color = colors[element];
  const ring = scene.add.graphics({ x, y: y + 35 }).setDepth(231);
  ring.lineStyle(2, color, .75);
  ring.strokeEllipse(0, 0, 90, 25);
  ring.lineStyle(1, color, .4);
  ring.strokeEllipse(0, 0, 110, 32);
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * Math.PI * 2;
    ring.lineBetween(Math.cos(angle) * 36, Math.sin(angle) * 10,
      Math.cos(angle) * 50, Math.sin(angle) * 14);
  }
  scene.tweens.add({ targets: ring, scaleX: 1.6, scaleY: 1.3, alpha: 0, duration: 720 / speed, onComplete: () => ring.destroy() });
  const pieces = element === 'shock' ? 4 : element === 'void' ? 9 : 6;
  for (let i = 0; i < pieces; i++) {
    const fx = scene.add.graphics().setDepth(242);
    const offset = (i - (pieces - 1) / 2) * 15;
    if (element === 'frost') {
      fx.fillStyle(0x508897, .8);
      fx.fillTriangle(-8, 0, 0, -48 - i % 3 * 12, 9, 0);
      fx.fillStyle(color, .88);
      fx.fillTriangle(-6, 0, 0, -43 - i % 3 * 12, 2, -5);
      fx.lineStyle(1, 0xe9f6eb, .8);
      fx.lineBetween(0, -45 - i % 3 * 12, 2, -8);
      fx.setPosition(x + offset, y + 48).setScale(1, .05);
      scene.tweens.add({ targets: fx, scaleY: 1, y: y + 30, duration: 260 / speed, delay: i * 32 / speed, ease: 'Back.Out' });
    } else if (element === 'solar') {
      fx.fillStyle(0xdd7839, .65); fx.fillEllipse(0, 0, 14, 47);
      fx.fillStyle(color, .85); fx.fillEllipse(0, 0, 6, 36);
      fx.setPosition(x + offset, y + 28 + i % 2 * 8);
      scene.tweens.add({ targets: fx, y: y - 58 - i % 3 * 14, x: x + offset * .5, scaleX: .3, duration: 600 / speed, delay: i * 25 / speed });
    } else if (element === 'shock') {
      fx.lineStyle(3, 0x8f7ab4, .4);
      fx.beginPath(); fx.moveTo(0, -120);
      for (let n = 1; n <= 6; n++) fx.lineTo((n % 2 ? 10 : -10), -120 + n * 23);
      fx.strokePath();
      fx.lineStyle(1, color, .95);
      fx.beginPath(); fx.moveTo(0, -120);
      for (let n = 1; n <= 6; n++) fx.lineTo((n % 2 ? 10 : -10), -120 + n * 23);
      fx.strokePath(); fx.setPosition(x + offset, y);
    } else {
      const angle = i / pieces * Math.PI * 2;
      fx.lineStyle(2, color, .85);
      fx.strokeTriangle(-5, 0, 0, -10, 5, 0);
      fx.setPosition(x + Math.cos(angle) * 58, y + Math.sin(angle) * 40);
      scene.tweens.add({ targets: fx, x, y, angle: 180, scale: .2, duration: 580 / speed, ease: 'Cubic.In' });
    }
    scene.tweens.add({ targets: fx, alpha: 0, delay: 330 / speed, duration: 430 / speed, onComplete: () => fx.destroy() });
  }
}
