import { useState } from "react";
import { cn } from "@/lib/utils";

const TICKS = Array.from({ length: 41 }, (_, i) => 88 + i * 0.5);
const pct = (f: number) => ((f - 88) / 20) * 100;

/** TUNE IN screen: FM dial with the needle drifting from 101.4 to 88.8. */
export function Gate({
  hidden,
  welcome,
  onTune,
  onSkip,
}: {
  hidden: boolean;
  welcome: string | null;
  onTune: (slide: () => void) => void;
  onSkip: () => void;
}) {
  const [freq, setFreq] = useState(101.4);
  const [busy, setBusy] = useState(false);
  return (
    <section className={cn("gate", hidden && "is-hidden")} aria-hidden={hidden}>
      <h1 className="gate-title">LOST SIGNAL 88.8</h1>
      <div className="dial">
        <span className="dial-fm">FM</span>
        <div className="dial-ticks">
          {TICKS.map((f) => (
            <i key={f} style={{ left: `${pct(f)}%`, height: f % 2 === 0 ? 18 : 8 }} />
          ))}
          {TICKS.filter((f) => f % 2 === 0).map((f) => (
            <em key={`n${f}`} style={{ left: `${pct(f)}%` }}>{f}</em>
          ))}
          <div className="dial-needle" style={{ left: `${pct(freq)}%` }} />
        </div>
      </div>
      <div className="gate-welcome">{welcome ?? ""}</div>
      <div className="flex gap-3">
        <button
          type="button"
          className="btn-primary gate-btn"
          disabled={busy}
          onClick={() => { setBusy(true); onTune(() => setFreq(88.8)); }}
        >
          Tune in
        </button>
        {welcome && (
          <button type="button" className="btn-secondary gate-btn" disabled={busy} onClick={() => { setBusy(true); setFreq(88.8); onSkip(); }}>
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
