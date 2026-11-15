import { useEffect, useRef } from "react";

/** Full-screen canvas TV static (teal/orange tinted noise + glitch lines). Runs only while visible. */
export function StaticOverlay({ opacity, fade = 0.5 }: { opacity: number; fade?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (opacity <= 0) return;
    const c = ref.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    let raf = 0;
    const loop = () => {
      const im = g.createImageData(320, 180);
      for (let i = 0; i < im.data.length; i += 4) {
        const v = Math.random() * 255;
        im.data[i] = v * 0.85;
        im.data[i + 1] = v;
        im.data[i + 2] = v * 0.95;
        im.data[i + 3] = 255;
      }
      g.putImageData(im, 0, 0);
      for (let k = 0; k < 4; k++) {
        g.fillStyle = `rgba(${Math.random() < 0.5 ? "91,176,165" : "232,105,60"},.35)`;
        g.fillRect(0, Math.random() * 180, 320, 1 + Math.random() * 3);
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [opacity > 0]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} width={320} height={180} aria-hidden className="static-overlay" style={{ opacity, transitionDuration: `${fade}s` }} />;
}
