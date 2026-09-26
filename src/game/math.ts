export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** A saved PRNG state makes a battle reproducible across reloads. */
export function random(holder: { rng: number }): number {
  let value = holder.rng || 0x6d2b79f5;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  holder.rng = value >>> 0;
  return holder.rng / 4294967296;
}

export function pick<T>(values: readonly T[], holder: { rng: number }): T {
  if (!values.length) throw new Error('Cannot choose from an empty pool.');
  return values[Math.floor(random(holder) * values.length)];
}

export function seeded(seed: number): () => number {
  const holder = { rng: seed || 1 };
  return () => random(holder);
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}
