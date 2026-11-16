import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** Unlit copy of the sign (image coords) laid over the photo; shown by day and during glitches. */
export function SignDark({ visible }: { visible: boolean }) {
  return <div aria-hidden className={cn("sign-dark", visible && "is-on")} />;
}

/** The paper note taped to the glass. */
export function OutOfOrderNote({ fallen, active }: { fallen: boolean; active: boolean }) {
  const [replay, setReplay] = useState(0);
  const [centered, setCentered] = useState(false);
  useEffect(() => {
    if (!active) { setCentered(false); return; }
    setCentered(true);
    const timer = setTimeout(() => setCentered(false), 2500);
    return () => clearTimeout(timer);
  }, [active, replay]);
  return (
    <Button variant="ghost" disabled={fallen} aria-hidden={fallen} aria-label="Read out of order note" onClick={() => setReplay(n => n + 1)} className={cn("oo-note", fallen && "is-fallen", centered && "is-centered")}>
      <span>OUT OF ORDER</span><span>TILL 8PM.</span><small>Still takes coins though.</small>
    </Button>
  );
}
