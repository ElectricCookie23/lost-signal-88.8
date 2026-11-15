import { useEffect, useRef, useState } from "react";
import { HOME, tunerSet, tunerStart, unlock } from "@/lib/audio";
import { cn } from "@/lib/utils";

const TICKS = Array.from({ length: 41 }, (_, i) => 88 + i * 0.5);
const MIN = 88, MAX = 108;
const pct = (f: number) => ((f - MIN) / (MAX - MIN)) * 100;
const clamp = (f: number) => Math.max(MIN, Math.min(MAX, f));
/** Within ±0.15 of 88.8 the needle snaps home. */
export const snaps = (f: number) => Math.abs(f - HOME) <= 0.15 + 1e-9;

/** TUNE IN screen: a draggable FM dial (mouse, touch, arrow keys) that locks at 88.8. */
export function Gate({
  hidden,
  welcome,
  onLock,
  onSkip,
}: {
  hidden: boolean;
  welcome: string | null;
  onLock: () => void;
  onSkip: () => void;
}) {
  const [freq, setFreq] = useState(101.4);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  useEffect(() => {
    if (!hidden) { setLocked(false); setBusy(false); }
  }, [hidden]);

  const lock = () => {
    if (locked) return;
    setLocked(true); setBusy(true); setFreq(HOME);
    onLock();
  };
  const tuneTo = (f: number) => {
    if (busy) return;
    const v = Math.round(clamp(f) * 100) / 100;
    if (snaps(v)) { tunerSet(HOME); lock(); return; }
    setFreq(v); tunerSet(v);
  };
  const wake = () => { void unlock().then(() => tunerStart(freq)); };
  const fromX = (x: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r) return freq;
    return MIN + ((x - r.left) / r.width) * (MAX - MIN);
  };

  return (
    <section className={cn("gate", hidden && "is-hidden")} aria-hidden={hidden}>
      <h1 className="gate-title">LOST SIGNAL 88.8</h1>
      <div
        className={cn("dial", locked && "is-locked")}
        role="slider"
        tabIndex={0}
        aria-label="FM dial"
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={freq}
        aria-valuetext={`${freq.toFixed(1)} FM`}
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault(); wake();
          tuneTo(freq + (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 1 : 0.1));
        }}
        onPointerDown={(e) => {
          if (busy) return;
          drag.current = true; wake();
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          tuneTo(fromX(e.clientX));
        }}
        onPointerMove={(e) => { if (drag.current) tuneTo(fromX(e.clientX)); }}
        onPointerUp={() => { drag.current = false; }}
        onPointerCancel={() => { drag.current = false; }}
      >
        <span className="dial-fm">FM</span>
        <div className="dial-ticks" ref={track}>
          {TICKS.map((f) => (
            <i key={f} style={{ left: `${pct(f)}%`, height: f % 2 === 0 ? 18 : 8 }} />
          ))}
          {TICKS.filter((f) => f % 2 === 0).map((f) => (
            <em key={`n${f}`} style={{ left: `${pct(f)}%` }}>{f}</em>
          ))}
          <div className="dial-needle" style={{ left: `${pct(freq)}%` }} />
        </div>
        <span className="dial-read">{freq.toFixed(1)}</span>
      </div>
      <div className="dial-hint">drag to tune · or just hit TUNE IN</div>
      <div className="gate-welcome">{welcome ?? ""}</div>
      <div className="flex gap-3">
        <button
          type="button"
          className="btn-primary gate-btn"
          disabled={busy}
          onClick={() => {
            setBusy(true); wake();
            const from = freq, t0 = performance.now();
            const step = (now: number) => {
              const k = Math.min(1, (now - t0) / 1600);
              const f = from + (HOME - from) * (1 - Math.pow(1 - k, 3));
              setFreq(f); tunerSet(f);
              if (k < 1) requestAnimationFrame(step);
              else { setFreq(HOME); setLocked(true); onLock(); }
            };
            requestAnimationFrame(step);
          }}
        >
          Tune in
        </button>
        {welcome && (
          <button type="button" className="btn-secondary gate-btn" disabled={busy} onClick={() => { setBusy(true); setFreq(HOME); onSkip(); }}>
            Skip intro
          </button>
        )}
      </div>
      <div className="gate-sub">BROADCASTING 8PM–6AM</div>
    </section>
  );
}

/** SIGNAL LOST screen shown after leaving. */
export function SignalLost({ shown, onAgain }: { shown: boolean; onAgain: () => void }) {
  return (
    <section className={cn("gate gate-lost", !shown && "is-hidden")} aria-hidden={!shown}>
      <h1 className="gate-title lost-title">SIGNAL LOST.</h1>
      <div className="lost-see">SEE YOU AT 8.</div>
      <button type="button" className="btn-secondary gate-btn" onClick={onAgain}>Tune in again</button>
    </section>
  );
}
