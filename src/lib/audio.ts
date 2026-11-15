/**
 * Web Audio engine: every file decoded once into an AudioBuffer after the
 * first user gesture, routed through one master gain. Browser-only — every
 * function no-ops until unlock() runs from a click.
 */
const FILES = {
  coin: "/audio/sfx_coin.mp3",
  drop: "/audio/sfx_drop.mp3",
  beep: "/audio/sfx_keypad_beep.mp3",
  rattle: "/audio/sfx_kick_rattle.mp3",
  static: "/audio/sfx_static.mp3",
  flicker: "/audio/sfx_flicker_on.mp3",
  neon: "/audio/loop_neon_buzz.wav",
  music: "/audio/music_lofi_bed.mp3",
} as const;
export type Sfx = keyof typeof FILES;

/** DJ voice lines played over the radio every ~90s. Add file URLs here later. */
export const DJ_LINES: string[] = [];

const MUTE_KEY = "ls888_muted";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buf: Partial<Record<Sfx, AudioBuffer>> = {};
const djBuf: AudioBuffer[] = [];
let loading: Promise<void> | null = null;
let muted = false;
const listeners = new Set<() => void>();

export interface Voice { src: AudioBufferSourceNode; gain: GainNode }

export function initMute() {
  try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch { /* blocked */ }
  return muted;
}
export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch { /* blocked */ }
  if (ctx && master) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.05);
  listeners.forEach((f) => f());
}
export function onAudioChange(f: () => void) { listeners.add(f); return () => { listeners.delete(f); }; }

/** Create/resume the context and decode every file once. Call from a click. */
export function unlock(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!ctx) {
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
    } catch { return Promise.resolve(); }
  }
  if (ctx.state === "suspended") void ctx.resume();
  if (!loading) {
    const a = ctx;
    loading = Promise.all([
      ...Object.entries(FILES).map(async ([k, f]) => {
        try { buf[k as Sfx] = await a.decodeAudioData(await (await fetch(f)).arrayBuffer()); } catch { /* missing */ }
      }),
      ...DJ_LINES.map(async (f) => {
        try { djBuf.push(await a.decodeAudioData(await (await fetch(f)).arrayBuffer())); } catch { /* missing */ }
      }),
    ]).then(() => undefined);
  }
  return loading;
}

function start(b: AudioBuffer | undefined, o: { vol?: number; loop?: boolean; off?: number; dur?: number } = {}): Voice | null {
  if (!ctx || !master || !b) return null;
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = b;
  src.loop = !!o.loop;
  gain.gain.value = o.vol ?? 1;
  src.connect(gain).connect(master);
  if (o.dur) src.start(0, o.off ?? 0, o.dur);
  else src.start(0, o.off ?? 0);
  return { src, gain };
}

export const play = (k: Sfx, o?: { vol?: number; loop?: boolean; off?: number; dur?: number }) => start(buf[k], o);

export function fadeOut(v: Voice | null, t = 1) {
  if (!v || !ctx) return;
  const c = ctx.currentTime;
  v.gain.gain.cancelScheduledValues(c);
  v.gain.gain.setValueAtTime(v.gain.gain.value, c);
  v.gain.gain.linearRampToValueAtTime(0, c + t);
  try { v.src.stop(c + t + 0.05); } catch { /* already stopped */ }
}

/** Tiny 70ms static slice: printer clicks, flicker ticks. */
export const click = (vol = 0.35) => play("static", { vol, off: Math.random() * 0.6, dur: 0.07 });

/* ---------- neon hum ---------- */
let hum: Voice | null = null;
export function humOn(on: boolean) {
  if (on && !hum) hum = play("neon", { vol: 0.25, loop: true });
  else if (!on && hum) { fadeOut(hum, 0.6); hum = null; }
}

/* ---------- radio ---------- */
let radioOn = false;
let music: Voice | null = null;
let radioTimer: ReturnType<typeof setTimeout> | null = null;
let djTimer: ReturnType<typeof setInterval> | null = null;
export const isRadioOn = () => radioOn;

function playMusic() {
  if (!radioOn) return;
  music = play("music", { vol: 0.55 });
  if (!music) return;
  const me = music;
  me.src.onended = () => {
    if (!radioOn || music !== me) return;
    play("static", { vol: 0.35, off: Math.random() * 0.4, dur: 0.35 }); // burst at the loop point
    radioTimer = setTimeout(playMusic, 300);
  };
}

export async function radio(on: boolean) {
  if (on === radioOn) return;
  radioOn = on;
  listeners.forEach((f) => f());
  if (on) {
    await unlock();
    if (!radioOn) return;
    play("static", { vol: 0.4, dur: 1 });
    radioTimer = setTimeout(playMusic, 1000);
    djTimer = setInterval(() => {
      const b = djBuf[Math.floor(Math.random() * djBuf.length)];
      if (b && music) start(b, { vol: 0.9 });
    }, 90_000);
  } else {
    if (radioTimer) clearTimeout(radioTimer);
    if (djTimer) clearInterval(djTimer);
    fadeOut(music, 0.8);
    music = null;
  }
}
