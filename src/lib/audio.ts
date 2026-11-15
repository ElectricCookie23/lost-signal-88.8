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
  weather: "/audio/stations/weather.mp3",
  song: "/audio/stations/song.mp3",
  news: "/audio/stations/news.mp3",
} as const;
export type Sfx = keyof typeof FILES;

const MUTE_KEY = "ls888_muted";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buf: Partial<Record<Sfx, AudioBuffer>> = {};
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
let humPan: StereoPannerNode | null = null;
let humSpace: GainNode | null = null;
export function humOn(on: boolean) {
  if (on && !hum && ctx && master && buf.neon) {
    const src = ctx.createBufferSource();
    src.buffer = buf.neon; src.loop = true;
    const gain = ctx.createGain(); gain.gain.value = 0.25;
    humSpace = ctx.createGain(); humSpace.gain.value = 1;
    humPan = ctx.createStereoPanner();
    src.connect(gain).connect(humSpace).connect(humPan).connect(master);
    src.start();
    hum = { src, gain };
  } else if (!on && hum) { fadeOut(hum, 0.6); hum = null; }
}
/** Spatial neon: pan −0.6…0.6 by cursor x (0…1); gain 1…1.5 by closeness to the sign (0…1). Smoothed ~0.3s. */
export function humSpatial(x: number, near: number) {
  if (!ctx || !humPan || !humSpace) return;
  const t = ctx.currentTime;
  humPan.pan.setTargetAtTime(Math.max(-0.6, Math.min(0.6, (x * 2 - 1) * 0.6)), t, 0.1);
  humSpace.gain.setTargetAtTime(1 + 0.5 * Math.max(0, Math.min(1, near)), t, 0.1);
}

/* ---------- FM tuner on the Tune In screen ---------- */
export const STATIONS: { f: number; k: Sfx }[] = [
  { f: 92.4, k: "weather" },
  { f: 97.1, k: "song" },
  { f: 101.4, k: "news" },
];
export const HOME = 88.8;
/** Pure mixing rule, exported for tests: static + per-station volumes at a frequency. */
export function tunerMix(f: number) {
  const d = Math.abs(f - HOME);
  const homeFade = d >= 1 ? 1 : d <= 0.15 ? 0 : (d - 0.15) / 0.85;
  const st = STATIONS.map((s) => {
    const e = Math.abs(f - s.f);
    return e >= 0.4 ? 0 : 1 - e / 0.4;
  });
  return { static: homeFade * (1 - Math.max(0, ...st) * 0.6), stations: st };
}
let tuner: { stat: Voice | null; st: (Voice | null)[] } | null = null;
export function tunerStart(f: number) {
  if (tuner || !ctx) return;
  tuner = {
    stat: play("static", { vol: 0, loop: true }),
    st: STATIONS.map((s) => play(s.k, { vol: 0, loop: true })),
  };
  tunerSet(f);
}
export function tunerSet(f: number) {
  if (!tuner || !ctx) return;
  const m = tunerMix(f);
  const t = ctx.currentTime;
  tuner.stat?.gain.gain.setTargetAtTime(0.35 * m.static, t, 0.04);
  tuner.st.forEach((v, i) => v?.gain.gain.setTargetAtTime(0.22 * (m.stations[i] ?? 0), t, 0.06));
}
export function tunerStop(t = 0.05) {
  if (!tuner) return;
  fadeOut(tuner.stat, t);
  tuner.st.forEach((v) => fadeOut(v, t));
  tuner = null;
}
/** 88.8 locks: snap, static cuts, 2s of the lofi bed swells and fades back out. */
export function lockIn() {
  tunerStop(0.03);
  click(0.7);
  if (!ctx) return;
  const v = play("music", { vol: 0, dur: 2.2 });
  if (!v) return;
  const t = ctx.currentTime;
  v.gain.gain.setValueAtTime(0, t);
  v.gain.gain.linearRampToValueAtTime(0.5, t + 0.6);
  v.gain.gain.linearRampToValueAtTime(0.5, t + 1.3);
  v.gain.gain.linearRampToValueAtTime(0, t + 2.1);
}

/* ---------- radio ---------- */
let radioOn = false;
let music: Voice | null = null;
let radioTimer: ReturnType<typeof setTimeout> | null = null;
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
  } else {
    if (radioTimer) clearTimeout(radioTimer);
    fadeOut(music, 0.8);
    music = null;
  }
}
