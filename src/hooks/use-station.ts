import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_BY_CODE } from "@/data/products";
import { play } from "@/lib/audio";

export interface StationEvent { id: string; text: string; code: string; area: string; kind: string; stock: number; }
export function useStation() {
  const [real, setReal] = useState(1);
  const [ghost, setGhost] = useState(6);
  const [events, setEvents] = useState<StationEvent[]>([]);
  const [toast, setToast] = useState<StationEvent | null>(null);
  const lastToast = useRef(0);
  useEffect(() => {
    const key = crypto.randomUUID();
    const presence = supabase.channel("station", { config: { presence: { key } } });
    presence.on("presence", { event: "sync" }, () => setReal(Math.max(1, Object.keys(presence.presenceState()).length)))
      .subscribe((s) => { if (s === "SUBSCRIBED") void presence.track({ at: Date.now() }); });
    const audience = () => { void supabase.rpc("station_audience").then(({ data }) => { if (typeof data === "number") setGhost(data); }); };
    audience(); const poll = setInterval(audience, 60_000);
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms: number) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
    const convert = (e: { id: string; kind: string; code: string; area: string | null }): StationEvent => {
      const p = PRODUCT_BY_CODE[e.code]; const stock = p?.stock ?? 0;
      return { ...e, area: e.area ?? "Doha", stock, text: e.kind === "sale" ? `${e.area ?? "Doha"} · ${e.code} ${p?.name ?? ""} · ${stock} LEFT` : `RESTOCK · ${e.code} ${p?.name ?? ""} · ${stock} IN` };
    };
    void supabase.from("station_events").select("id,kind,code,area").gte("created_at", new Date(Date.now()-12*3600_000).toISOString()).order("created_at", { ascending:false }).limit(5).then(({data}) => { if (data) setEvents(data.map(convert)); });
    const channel = supabase.channel(`station-events-${key}`).on("postgres_changes", { event:"INSERT", schema:"public", table:"station_events" }, (payload) => {
      later(() => {
        const e = convert(payload.new as { id:string;kind:string;code:string;area:string|null });
        setEvents((old) => [e,...old.filter((x) => x.id !== e.id)].slice(0,5));
        if (e.kind === "sale") {
          play("coin", { vol:0.2 });
          if (Date.now()-lastToast.current >= 20_000) { lastToast.current=Date.now(); setToast(e); later(() => setToast(null),4000); }
        }
      },400);
    }).subscribe();
    return () => { clearInterval(poll); timers.forEach(clearTimeout); void supabase.removeChannel(presence); void supabase.removeChannel(channel); };
  }, []);
  const listeners = real + ghost;
  return { listeners, events, toast, text: events[0]?.text ?? `ON AIR · ${listeners} listeners tuned in` };
}