import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_BY_CODE } from "@/data/products";

const DEFAULT_LINE = "ON AIR";

/** Live ticker line (sales / restocks) and real listener count via presence. */
export function useStation() {
  const [listeners, setListeners] = useState(1);
  const [line, setLine] = useState<string | null>(null);
  /** Last 5 sale/restock lines, newest first, with an id that bumps per event. */
  const [events, setEvents] = useState<{ id: number; text: string }[]>([]);

  useEffect(() => {
    const key = Math.random().toString(36).slice(2);
    const presence = supabase.channel("station", { config: { presence: { key } } });
    presence
      .on("presence", { event: "sync" }, () => {
        setListeners(Math.max(1, Object.keys(presence.presenceState()).length));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") presence.track({ at: Date.now() });
      });

    let clear: ReturnType<typeof setTimeout> | null = null;
    const events = supabase
      .channel(`station-events-${key}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "station_events" }, (payload) => {
        const e = payload.new as { kind: string; code: string; area: string | null };
        const p = PRODUCT_BY_CODE[e.code];
        if (!p) return;
        // stock update may land just after the event; read it a beat later
        setTimeout(() => {
          const n = PRODUCT_BY_CODE[e.code]?.stock ?? 0;
          const left = n <= 3 ? `${n} left` : `${n} in`;
          const t =
            e.kind === "sale"
              ? `Someone in ${e.area ?? "Doha"} just took ${e.code} ${p.name} · ${left}`
              : `Restock: ${e.code} ${p.name} is back · ${n} in`;
          setLine(t);
          setEvents((ev) => [{ id: Date.now(), text: t }, ...ev].slice(0, 5));
        }, 400);
        if (clear) clearTimeout(clear);
        clear = setTimeout(() => setLine(null), 12000);
      })
      .subscribe();

    return () => {
      if (clear) clearTimeout(clear);
      supabase.removeChannel(presence);
      supabase.removeChannel(events);
    };
  }, []);

  const text = line ?? `${DEFAULT_LINE} · ${listeners} ${listeners === 1 ? "listener" : "listeners"} tuned in`;
  return { listeners, text, events };
}
