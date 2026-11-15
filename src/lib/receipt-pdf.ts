import type { Order } from "@/lib/orders";
import { fmtDate, receiptUrl } from "@/lib/orders";

/** 80mm thermal receipt, following receiptPDF() in the reference prototype. */
export async function receiptPDF(o: Order) {
  const { jsPDF } = await import("jspdf");
  const h = 186 + o.items.length * 10;
  const d = new jsPDF({ unit: "mm", format: [80, h] });
  let y = 12;
  const L = 6, R = 74, Q = 52;
  const tx = (t: string | number, x: number, al: "left" | "center" | "right" = "left") =>
    d.text(String(t), x, y, { align: al });
  const rule = () => {
    d.setLineDashPattern([1, 1], 0);
    d.line(L, y, R, y);
    y += 5;
  };
  d.setFont("courier", "bold"); d.setFontSize(15); tx("LOST SIGNAL 88.8", 40, "center"); y += 5;
  d.setFont("courier", "normal"); d.setFontSize(8.5);
  tx("STAIRWELL MACHINE #2", 40, "center"); y += 4;
  tx("Pirate radio merch · Doha, Qatar", 40, "center"); y += 4;
  tx("signal@lostsignal888.fm", 40, "center"); y += 5;
  rule();
  d.setFontSize(9);
  tx("RECEIPT", L); tx(o.order_no, R, "right"); y += 4.5;
  tx("Date", L); tx(fmtDate(o.created_at), R, "right"); y += 4.5;
  if (o.shipping?.name) {
    tx("Ship to", L); tx(o.shipping.name.slice(0, 26), R, "right"); y += 4.5;
    tx(`${o.shipping.city ?? ""}, ${o.shipping.country ?? ""}`.slice(0, 34), R, "right"); y += 4.5;
  }
  rule();
  d.setFont("courier", "bold"); tx("ITEM", L); tx("QTY", Q, "right"); tx("QAR", R, "right"); y += 5;
  d.setFont("courier", "normal");
  for (const i of o.items) {
    // courier 9pt ≈ 1.9mm/char; keep names clear of the QTY column
    let name = `${i.code} ${i.name}`;
    const maxW = Q - 8 - L;
    while (d.getTextWidth(name) > maxW && name.length > 4) name = name.slice(0, -1);
    if (name !== `${i.code} ${i.name}`) name = name.slice(0, -1) + "…";
    tx(name, L); tx(i.qty, Q, "right"); tx((i.price * i.qty).toFixed(2), R, "right"); y += 4;
    d.setFontSize(7.5); tx(i.bonus ? `   ${i.bonus}` : `   @ ${i.price.toFixed(2)} each`, L); d.setFontSize(9); y += 5.5;
  }
  rule();
  tx("Subtotal", L); tx(o.subtotal.toFixed(2), R, "right"); y += 4.5;
  if (o.discount) { tx("KICKIT discount (10%)", L); tx("-" + o.discount.toFixed(2), R, "right"); y += 4.5; }
  tx("Shipping", L); tx("FREE", R, "right"); y += 4.5;
  tx("VAT", L); tx("0.00", R, "right"); y += 6;
  d.setFont("courier", "bold"); d.setFontSize(12); tx("TOTAL QAR", L); tx(o.total.toFixed(2), R, "right"); y += 6;
  d.setFont("courier", "normal"); d.setFontSize(7.8); tx("Payment: held, not charged (demo store)", L); y += 6;
  rule();
  let bx = 12;
  d.setFillColor(0, 0, 0);
  for (let i = 0; i < 46; i++) {
    const w = [0.4, 0.8, 1.2][(i * 7 + o.order_no.charCodeAt(i % o.order_no.length)) % 3] ?? 0.8;
    d.rect(bx, y, w, 12, "F");
    bx += w + 0.55;
    if (bx > 68) break;
  }
  y += 16;
  tx(o.order_no, 40, "center"); y += 3;
  const { toDataURL } = await import("qrcode");
  d.addImage(await toDataURL(receiptUrl(o.order_no), { margin: 0, width: 240 }), "PNG", 25, y, 30, 30);
  y += 34;
  tx("KEEP THIS RECEIPT.", 40, "center"); y += 4;
  tx("OR DON'T. WE'RE PIRATES.", 40, "center"); y += 5;
  tx("See you at 8.", 40, "center");
  return d;
}

export async function downloadReceipt(o: Order): Promise<string> {
  try {
    const doc = await receiptPDF(o);
    doc.save(`LostSignal888-${o.order_no}.pdf`);
    return "Receipt downloaded.";
  } catch {
    return "Couldn't build the receipt. Try again.";
  }
}
