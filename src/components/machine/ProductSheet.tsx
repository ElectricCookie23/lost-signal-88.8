import { useState } from "react";
import { PRODUCT_BY_CODE } from "@/data/products";

/** Placeholder product view (full version in phase 2). Shows both photos. */
export function ProductSheet({ code, onClose }: { code: string; onClose: () => void }) {
  const p = PRODUCT_BY_CODE[code];
  const [hasAlt, setHasAlt] = useState(true);
  if (!p) return null;
  return (
    <div className="product-sheet-backdrop" onClick={onClose}>
      <div className="product-sheet" role="dialog" aria-label={p.name} onClick={(e) => e.stopPropagation()}>
        <div className="product-sheet-photos">
          <img src={`/products/${code}.jpg`} alt={p.name} />
          {hasAlt && <img src={`/hover/${code}.jpg`} alt={`${p.name}, second view`} onError={() => setHasAlt(false)} />}
        </div>
        <p style={{ fontFamily: "VT323, monospace", fontSize: 26, marginTop: 10 }}>
          {code} · {p.name.toUpperCase()} · QAR {p.price}
        </p>
        <p style={{ fontSize: 14, opacity: 0.8 }}>{p.description}</p>
        <button type="button" className="btn-secondary" style={{ marginTop: 12 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
