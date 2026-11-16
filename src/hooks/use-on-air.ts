import { useEffect, useState } from "react";

/** ON AIR 20:00–06:00 Asia/Qatar. */
export function qatarOnAir(d = new Date()) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Qatar" }).format(d)) % 24;
  return h >= 20 || h < 6;
}

/** Real-time on-air state with a manual override for the presentation. */
export function useOnAir() {
  const [real, setReal] = useState(true);
  const [override, setOverride] = useState<boolean | null>(null);
  useEffect(() => {
    try { const v = sessionStorage.getItem("ls888_lights"); if (v != null) setOverride(v === "on"); } catch { /* blocked */ }
    const tick = () => setReal(qatarOnAir());
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);
  const onAir = override ?? real;
  return { onAir, real, set: (v: boolean) => { setOverride(v); try { sessionStorage.setItem("ls888_lights", v ? "on" : "off"); } catch { /* blocked */ } } };
}
