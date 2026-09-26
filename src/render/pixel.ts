import { seeded } from '../game/math.ts';

export function canvas(width: number, height: number): HTMLCanvasElement {
  const result = document.createElement('canvas');
  result.width = width;
  result.height = height;
  return result;
}

export function mix(a: string, b: string, amount: number): string {
  const aa = parseInt(a.replace('#', ''), 16);
  const bb = parseInt(b.replace('#', ''), 16);
  const channel = (shift: number) => Math.round(((aa >> shift) & 255) * (1 - amount) + ((bb >> shift) & 255) * amount);
  return `#${[channel(16), channel(8), channel(0)].map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

export class Pixel {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly random: () => number;
  constructor(width: number, height: number, seed = 7331) {
    this.canvas = canvas(width, height);
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.random = seeded(seed);
  }
  rect(x: number, y: number, width: number, height: number, color: string, alpha = 1): void {
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
    this.ctx.globalAlpha = 1;
  }
  line(x0: number, y0: number, x1: number, y1: number, color: string, thickness = 1): void {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let count = 0; count < 5000; count++) {
      this.rect(x0, y0, thickness, thickness, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  poly(points: [number, number][], color: string): void {
    const min = Math.max(0, Math.floor(Math.min(...points.map(point => point[1]))));
    const max = Math.min(this.canvas.height, Math.ceil(Math.max(...points.map(point => point[1]))));
    for (let y = min; y <= max; y++) {
      const hits: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        if (a[1] <= y && b[1] > y || b[1] <= y && a[1] > y) hits.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      hits.sort((a, b) => a - b);
      for (let i = 0; i < hits.length - 1; i += 2) this.rect(Math.ceil(hits[i]), y, Math.floor(hits[i + 1]) - Math.ceil(hits[i]) + 1, 1, color);
    }
  }
  ellipse(x: number, y: number, rx: number, ry: number, color: string, alpha = 1): void {
    for (let yy = -Math.ceil(ry); yy <= ry; yy++) {
      const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - yy * yy / (ry * ry))));
      this.rect(x - half, y + yy, half * 2 + 1, 1, color, alpha);
    }
  }
  gradient(top: string, bottom: string, height = this.canvas.height): void {
    for (let y = 0; y < height; y += 2) {
      this.rect(0, y, this.canvas.width, 2, mix(top, bottom, y / height));
    }
  }
  scatter(count: number, box: [number, number, number, number], colors: string[], width = 2, height = 1): void {
    for (let i = 0; i < count; i++) {
      const [x, y, w, h] = box;
      this.rect(x + this.random() * w, y + this.random() * h, Math.ceil(this.random() * width), height, colors[Math.floor(this.random() * colors.length)]);
    }
  }
}
