import { useEffect, useState } from "react";
import { STAGE_W } from "@/lib/machine-layout";
import { downloadReceipt } from "@/lib/receipt-pdf";
import type { Order } from "@/lib/orders";
import { cn } from "@/lib/utils";

/** Buttons beside the printed paper (anchored to image point 1905,770). */
export function ReceiptActions({
  order,
  show,
  onKeep,
  onLeave,
}: {
  order: Order;
  show: boolean;
  onKeep: () => void;
  onLeave: () => void;
}) {
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const [msg, setMsg] = useState("Saved under ORDERS for next time.");
  useEffect(() => {
    if (!show) return;
    const s = document.getElementById("machine-stage")?.getBoundingClientRect();
    if (!s) return;
    const k = s.width / STAGE_W;
    setPos({
      left: Math.min(s.left + 1905 * k + 20, window.innerWidth - 240),
      top: s.top + 770 * k,
    });
    setMsg("Saved under ORDERS for next time.");
  }, [show]);
  return (
    <div className={cn("receipt-after", show && "is-on")} style={pos} aria-hidden={!show}>
      <button type="button" className="btn-primary holo-add" onClick={async () => setMsg(await downloadReceipt(order))}>
        Download receipt
      </button>
      <button type="button" className="btn-secondary holo-big" onClick={onKeep}>
        Keep shopping
      </button>
      <button type="button" className="btn-secondary holo-big" onClick={onLeave}>
        Tear &amp; leave
      </button>
      <div className="receipt-note">{msg}</div>
    </div>
  );
}
