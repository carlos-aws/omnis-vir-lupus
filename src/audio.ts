import type { Settings } from './game/types.ts';

const midi = (note: number) => 440 * 2 ** ((note - 69) / 12);
type Cue = 'tap' | 'care' | 'hit' | 'magic' | 'break' | 'win' | 'level' | 'buy' | 'back';

/** Original synthesized score and effects. No samples or network requests. */
export class Soundscape {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private delay: DelayNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private prefs: Pick<Settings, 'sound' | 'music' | 'volume'> = { sound: true, music: false, volume: 0.55 };
  private nextNote = 0;
  private step = 0;
  private mode: 'camp' | 'battle' | 'cinematic' = 'camp';

  async unlock(): Promise<void> {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = this.prefs.volume * 0.42;
        this.master.connect(this.context.destination);
        this.musicGain = this.context.createGain();
        this.musicGain.gain.value = this.prefs.music ? 0.2 : 0;
        this.musicGain.connect(this.master);
        this.effectsGain = this.context.createGain();
        this.effectsGain.gain.value = this.prefs.sound ? 0.45 : 0;
        this.effectsGain.connect(this.master);
        this.delay = this.context.createDelay(1);
        this.delay.delayTime.value = 0.29;
        const wet = this.context.createGain();
        wet.gain.value = 0.13;
        this.delay.connect(wet); wet.connect(this.musicGain);
      }
      if (this.context.state === 'suspended') await this.context.resume();
      this.schedule();
    } catch { /* Audio is optional; the game remains fully playable. */ }
  }

  configure(settings: Pick<Settings, 'sound' | 'music' | 'volume'>): void {
    this.prefs = { sound: settings.sound, music: settings.music, volume: settings.volume };
    if (this.master) this.master.gain.value = settings.volume * 0.42;
    if (this.effectsGain) this.effectsGain.gain.value = settings.sound ? 0.45 : 0;
    if (this.musicGain) this.musicGain.gain.value = settings.music ? 0.2 : 0;
    if (settings.music) this.schedule(); else this.stopTimer();
  }

  setMode(mode: 'camp' | 'battle' | 'cinematic'): void {
    if (mode === this.mode) return;
    this.mode = mode;
    this.step = 0;
    this.nextNote = this.context?.currentTime ?? 0;
  }

  private tone(note: number, start: number, length: number, volume: number, type: OscillatorType, music = false, slide = 0): void {
    const ctx = this.context;
    if (!ctx || !this.musicGain || !this.effectsGain) return;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(midi(note), start);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(midi(note + slide), start + length);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), start + Math.min(0.04, length * 0.2));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);
    oscillator.connect(envelope);
    envelope.connect(music ? this.musicGain : this.effectsGain);
    if (music && this.delay) envelope.connect(this.delay);
    oscillator.start(start); oscillator.stop(start + length + 0.01);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }

  cue(cue: Cue): void {
    if (!this.context || !this.prefs.sound) return;
    const t = this.context.currentTime;
    const play = (notes: number[], duration: number, type: OscillatorType = 'triangle') => notes.forEach((note, index) => this.tone(note, t + index * duration * 0.65, duration, 0.2, type));
    if (cue === 'tap') this.tone(70, t, 0.045, 0.12, 'sine', false, 2);
    else if (cue === 'back') this.tone(58, t, 0.1, 0.12, 'triangle', false, -4);
    else if (cue === 'care') play([62, 69, 74], 0.23, 'sine');
    else if (cue === 'hit') { this.tone(40, t, 0.12, 0.28, 'sawtooth', false, -13); this.tone(69, t, 0.035, 0.12, 'triangle', false, -22); }
    else if (cue === 'magic') play([62, 65, 69, 74, 77], 0.085);
    else if (cue === 'break') play([43, 55, 67], 0.095, 'sawtooth');
    else if (cue === 'win') play([62, 65, 69, 74, 72, 77, 74], 0.17);
    else if (cue === 'level') play([50, 57, 62, 65, 69, 74, 81], 0.15);
    else if (cue === 'buy') play([69, 74, 77], 0.09, 'sine');
  }

  private schedule(): void {
    if (!this.context || !this.prefs.music || this.context.state !== 'running' || this.timer) return;
    this.nextNote = this.context.currentTime + 0.05;
    const tick = () => {
      const ctx = this.context;
      if (!ctx || !this.prefs.music) return;
      const tempo = this.mode === 'battle' ? 0.17 : this.mode === 'cinematic' ? 0.4 : 0.31;
      const theme = this.mode === 'battle'
        ? [62, 62, 69, 65, 62, 74, 72, 69, 58, 58, 65, 62, 57, 64, 69, 67]
        : [74, 0, 69, 72, 65, 0, 62, 0, 70, 0, 65, 69, 62, 0, 57, 0, 74, 77, 76, 0, 72, 69, 0, 65, 67, 0, 69, 65, 62, 0, 0, 0];
      while (this.nextNote < ctx.currentTime + 0.25) {
        const note = theme[this.step % theme.length];
        if (note) this.tone(note, this.nextNote, tempo * 2.3, 0.22, 'triangle', true);
        if (this.step % 8 === 0) {
          const bass = [38, 34, 41, 36][Math.floor(this.step / 8) % 4];
          this.tone(bass, this.nextNote, tempo * 7.5, 0.29, 'sine', true);
          this.tone(bass + 19, this.nextNote, tempo * 7, 0.1, 'triangle', true);
        }
        if (this.mode === 'battle' && this.step % 2 === 0) this.tone(31, this.nextNote, 0.09, 0.17, 'triangle', true, -8);
        this.nextNote += tempo;
        this.step++;
      }
    };
    tick();
    this.timer = setInterval(tick, 100);
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  pause(): void { this.stopTimer(); void this.context?.suspend(); }
  resume(): void { if (this.context) void this.unlock(); }
  destroy(): void { this.stopTimer(); void this.context?.close(); }
}
