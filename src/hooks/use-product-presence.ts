import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { driftViewers } from "@/lib/live-rules";

export function useProductPresence(code: string) {
  const [real, setReal] = useState(0);
  const [ghost, setGhost] = useState(0);
  useEffect(() => {
    setReal(0); setGhost(Math.floor(Math.random() * 4));
    const key = crypto.randomUUID();
    const ch = supabase.channel(`product-${code}`, { config: { presence: { key } } });
    ch.on("presence", { event: "sync" }, () => setReal(Math.max(0, Object.keys(ch.presenceState()).length - 1)))
      .subscribe((s) => { if (s === "SUBSCRIBED") void ch.track({ viewing: code }); });
    const t = setInterval(() => setGhost((n) => driftViewers(n)), 60_000);
    return () => { clearInterval(t); void supabase.removeChannel(ch); };
  }, [code]);
  return real + ghost;
}