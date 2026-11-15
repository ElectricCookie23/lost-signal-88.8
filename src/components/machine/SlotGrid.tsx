import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { PRODUCTS, type Product } from "@/data/products";
import { SLOT_COLS, SLOT_H, SLOT_ROWS, SLOT_W } from "@/lib/machine-layout";
import { cn } from "@/lib/utils";

interface SlotGridProps {
  selected: string | null;
  available: (code: string) => number;
  onSelect: (code: string) => void;
  onOpen: (code: string) => void;
}

function isTouch() {
  return typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
}

function stockLabel(n: number) {
  return n === 0 ? "OUT" : n <= 3 ? `${n} LEFT` : `${n} IN`;
}

function Slot({
  product,
  index,
  selected,
  avail,
  onSelect,
  onOpen,
}: {
  product: Product;
  index: number;
  selected: boolean;
  avail: number;
  onSelect: (code: string) => void;
  onOpen: (code: string) => void;
}) {
  const col = index % 4;
  const row = Math.floor(index / 4);
  const soldOut = product.stock === 0 || avail === 0;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      type="button"
      aria-label={`${product.code} ${product.name}, QAR ${product.price}, ${soldOut ? "sold out" : stockLabel(avail).toLowerCase()}`}
      aria-pressed={selected}
      disabled={soldOut}
      onClick={() => (selected && isTouch() ? onOpen(product.code) : onSelect(product.code))}
      onMouseEnter={() => !isTouch() && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn("machine-slot group", selected && "is-selected", soldOut && "is-soldout")}
      style={{
        left: SLOT_COLS[col],
        top: SLOT_ROWS[row],
        width: SLOT_W,
        height: SLOT_H,
      }}
      initial={{ opacity: 0, y: -26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.35 + index * 0.09,
        type: "spring",
        stiffness: 320,
        damping: 19,
      }}
    >
      <span className="slot-photo">
        <img src={`/products/${product.code}.jpg`} alt="" draggable={false} />
        <img className="slot-hover-img" src={`/hover/${product.code}.jpg`} alt="" draggable={false} />
      </span>
      {soldOut && <span className="soldout-stamp">SOLD OUT</span>}
      <span className="slot-chip">
        <b>{product.code}</b>
        <i className={cn(avail <= 3 && "low")}>{stockLabel(avail)}</i>
      </span>
      {hovered && !soldOut && (
        <span className="slot-tip">
          {product.name.toUpperCase()} · QAR {product.price}
        </span>
      )}
    </motion.button>
  );
}

export function SlotGrid({ selected, available, onSelect, onOpen }: SlotGridProps) {
  // Remount the grid once on first paint so the drop-in stagger plays after
  // the stage image has had a chance to load.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;

  return (
    <>
      {PRODUCTS.map((p, i) => (
        <Slot
          key={p.code}
          product={p}
          index={i}
          selected={selected === p.code}
          avail={available(p.code)}
          onSelect={onSelect}
          onOpen={onOpen}
        />
      ))}
    </>
  );
}
