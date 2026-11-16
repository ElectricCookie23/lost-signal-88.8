import { useEffect, useRef, useState } from "react";
import { beeps, blackout, fadeOut, play, type Voice } from "@/lib/audio";
import { cn } from "@/lib/utils";

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Demo hook: ?event=line2 or ?event=powercut fires the event seconds after the machine is up. */
function demoEvent() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("event");
}

// D4 . A1 . D4 as morse: D -..  4 ....-  A .-  1 .----
const CODE_BEEPS = "-.. ....-   .- .----   -.. ....-";

/**
 * Line 2: at night the request line rings a few times per visit. Answer it and
 * the caller taps out a slot code in beeps, which the LCD decodes (the secret
 * D4 A1 D4 code). Ignore it and it rings out as a missed call.
 */
export function Line2({ active, onReveal, onMissed }: { active: boolean; onReveal: () => void; onMissed: () => void }) {
  const [state, setState] = useState<"idle" | "ringing" | "talking" | "ended">("idle");
  const calls = useRef(0);
  const ring = useRef<Voice | null>(null);
  const cb = useRef({ onReveal, onMissed });
  cb.current = { onReveal, onMissed };
  const stopRing = () => { fadeOut(ring.current, 0.15); ring.current = null; };

  useEffect(() => {
    if (!active || state !== "idle" || calls.current >= 3) return;
    const demo = demoEvent() === "line2" && calls.current === 0;
    const wait = demo ? 4000 : (calls.current === 0 ? rand(60, 120) : rand(360, 600)) * 1000;
    const t = setTimeout(() => {
      calls.current += 1;
      ring.current = play("ring", { vol: 0.45, loop: true });
      setState("ringing");
    }, wait);
    return () => clearTimeout(t);
  }, [active, state]);

  // unanswered for 14s: missed call
  useEffect(() => {
    if (state !== "ringing") return;
    const t = setTimeout(() => { stopRing(); setState("idle"); cb.current.onMissed(); }, 14000);
    return () => clearTimeout(t);
  }, [state]);

  // station goes off air mid-ring
  useEffect(() => {
    if (!active && ring.current) { stopRing(); setState("idle"); }
  }, [active]);

  const answer = () => {
    stopRing();
    setState("talking");
    play("static", { vol: 0.45, off: Math.random() * 0.4, dur: 1.1 });
    setTimeout(() => {
      const len = beeps(CODE_BEEPS);
      setTimeout(() => {
        play("static", { vol: 0.35, dur: 0.4 });
        cb.current.onReveal();
        setState("ended");
        setTimeout(() => setState("idle"), 4000);
      }, (len || 4) * 1000 + 300);
    }, 1200);
  };

  if (state === "idle") return null;
  return (
    <button
      type="button"
      className={cn("line2", `is-${state}`)}
      onClick={state === "ringing" ? answer : undefined}
      aria-live="polite"
      aria-label={state === "ringing" ? "Line 2 is ringing. Answer" : "Line 2"}
    >
      <span className="line2-dot" aria-hidden />
      {state === "ringing" && <>LINE 2 · INCOMING <b>ANSWER</b></>}
      {state === "talking" && <>LINE 2 · LISTENING…</>}
      {state === "ended" && <>LINE 2 · CALL ENDED</>}
    </button>
  );
}

/**
 * Power cut: once per visit, at night, the power drops for 6 seconds. Thud,
 * dark, red emergency light, flicker back on, then brownout prices.
 */
export function PowerCut({ active, onRestore }: { active: boolean; onRestore: () => void }) {
  const [phase, setPhase] = useState<"off" | "dark" | "back">("off");
  const done = useRef(false);
  const cb = useRef(onRestore);
  cb.current = onRestore;

  useEffect(() => {
    if (!active || done.current) return;
    const demo = demoEvent() === "powercut";
    try { if (!demo && sessionStorage.getItem("ls888_powercut") === "1") { done.current = true; return; } } catch { /* blocked */ }
    const t = setTimeout(() => {
      done.current = true;
      try { sessionStorage.setItem("ls888_powercut", "1"); } catch { /* blocked */ }
      blackout(6);
      setPhase("dark");
      setTimeout(() => { setPhase("back"); play("flicker", { vol: 0.7 }); }, 6000);
      setTimeout(() => { setPhase("off"); cb.current(); }, 7600);
    }, demo ? 5000 : rand(150, 420) * 1000);
    return () => clearTimeout(t);
  }, [active]);

  if (phase === "off") return null;
  return (
    <div className={cn("powercut", phase === "back" && "is-back")} aria-hidden>
      <div className="powercut-emergency" />
    </div>
  );
}
