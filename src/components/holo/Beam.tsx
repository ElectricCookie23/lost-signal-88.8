import { useEffect, useRef } from "react";
import { STAGE_W } from "@/lib/machine-layout";

/** Light beam from the machine keypad (image 1800,480) to the hologram's left edge. */
export function Beam({ open }: { open: boolean }) {
  const poly = useRef<SVGPolygonElement>(null);
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const tick = () => {
      const stage = document.getElementById("machine-stage");
      const holo = document.getElementById("holo");
      if (stage && holo && poly.current) {
        const s = stage.getBoundingClientRect();
        const k = s.width / STAGE_W;
        const px = s.left + 1950 * k;
        const py = s.top + 480 * k;
        const r = holo.getBoundingClientRect();
        // control panel off screen (e.g. row zoom): hide the beam
        const visible = px >= 0 && px < r.left && py >= 0 && py <= window.innerHeight;
        poly.current.style.opacity = visible ? "1" : "0";
        poly.current.setAttribute(
          "points",
          `${px},${py} ${r.left + 2},${r.top + 18} ${r.left + 2},${r.bottom - 2}`,
        );
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [open]);
  return (
    <svg className={open ? "holo-beam is-on" : "holo-beam"} aria-hidden>
      <defs>
        <linearGradient id="beam-g" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--ls-glow)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--ls-glow)" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <polygon ref={poly} style={{ transition: "opacity 0.25s" }} fill="url(#beam-g)" points="0,0 0,0 0,0" />
    </svg>
  );
}
