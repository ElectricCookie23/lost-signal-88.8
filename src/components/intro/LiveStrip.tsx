import { PRODUCT_BY_CODE } from "@/data/products";
import type { StationEvent } from "@/hooks/use-station";
import { Button } from "@/components/ui/button";

export function LiveStrip({ hidden, listeners, events, notice, toast, onProduct }: { hidden:boolean; listeners:number; events:StationEvent[]; notice?:string | undefined; toast:StationEvent|null; onProduct:(code:string)=>void }) {
  const text = [`${listeners} LISTENERS TUNED IN`,...events.map((e)=>e.text.toUpperCase()),...(notice ? [notice] : [])].join("  ✦  ");
  return <>
    {!hidden && <div className="live-strip" aria-label="Live station activity"><div key={events[0]?.id} className="live-strip-track"><span>{text} ✦ </span><span aria-hidden>{text} ✦ </span></div></div>}
    {!hidden && toast && <Button variant="ghost" className="sale-toast" onClick={()=>onProduct(toast.code)}><img src={`/products/${toast.code}.jpg`} alt=""/><span><small>Someone in {toast.area} just took</small><b>{PRODUCT_BY_CODE[toast.code]?.name}</b><small>{toast.stock} left</small></span></Button>}
  </>;
}