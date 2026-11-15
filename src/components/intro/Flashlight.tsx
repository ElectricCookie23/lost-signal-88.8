import { useEffect, useRef, useState } from "react";

const HINT_KEY = "ls888_flash_hint";

/** Off-air darkness with a ~260px warm beam following the cursor (or last tap). Clicks pass through. */
export function Flashlight({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState(false);
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    const move = (e: PointerEvent) => {
      el?.style.setProperty("--fx", `${e.clientX}px`);
      el?.style.setProperty("--fy", `${e.clientY}px`);
    };
    const onMove = (e: PointerEvent) => { if (e.pointerType === "mouse") move(e); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", move);
    let t: ReturnType<typeof setTimeout> | undefined;
    try {
      if (!localStorage.getItem(HINT_KEY)) {
        localStorage.setItem(HINT_KEY, "1");
        setHint(true);
        t = setTimeout(() => setHint(false), 4500);
      }
    } catch { /* blocked */ }
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", move);
      if (t) clearTimeout(t);
      setHint(false);
    };
  }, [active]);
  if (!active) return null;
  return (
    <>
      <div ref={ref} className="flashlight" aria-hidden />
      <div className="flash-hint" style={{ opacity: hint ? 1 : 0 }}>Lights are off. Use your flashlight.</div>
    </>
  );
}
