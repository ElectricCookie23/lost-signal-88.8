import { useEffect, useRef, useState } from "react";
import { fmtDate, type Order } from "@/lib/orders";
import { cn } from "@/lib/utils";

/** Thermal paper strip feeding out of the receipt slot (image coords x1763 y762, w104). */
export function ReceiptPaper({ order, torn }: { order: Order; torn: boolean }) {
  const inner = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  useEffect(() => {
    setH(0);
    const t = setTimeout(() => setH((inner.current?.scrollHeight ?? 200) + 6), 900);
    return () => clearTimeout(t);
  }, [order.id]);
  return (
    <div className={cn("receipt-paper", torn && "is-torn")} style={{ height: h }} aria-label={`Receipt ${order.order_no}`}>
      <div ref={inner} className="receipt-in">
        <div className="big text-center">LOST SIGNAL 88.8</div>
        <div className="text-center">STAIRWELL MACHINE #2</div>
        <hr />
        <div>ORDER {order.order_no}</div>
        <div>{fmtDate(order.created_at)}</div>
        <hr />
        {order.items.map((i) => (
          <div key={i.code} className="row">
            <span>
              {i.code} {i.name.toUpperCase()}
              {i.qty > 1 ? ` x${i.qty}` : ""}
            </span>
            <span>{(i.price * i.qty).toFixed(2)}</span>
          </div>
        ))}
        {order.discount > 0 && (
          <div className="row">
            <span>KICKIT -10%</span>
            <span>-{order.discount.toFixed(2)}</span>
          </div>
        )}
        <hr />
        <div className="row big">
          <span>TOTAL QAR</span>
          <span>{order.total.toFixed(2)}</span>
        </div>
        <div>PAYMENT: HELD (NOT CHARGED)</div>
        <hr />
        <div>
          KEEP THIS RECEIPT.
          <br />
          OR DON&apos;T. WE&apos;RE PIRATES.
        </div>
      </div>
    </div>
  );
}
