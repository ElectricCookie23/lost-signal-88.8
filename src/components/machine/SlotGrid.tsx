import { motion } from "framer-motion";
import { Fragment, useState } from "react";
import { PRODUCTS, type Product } from "@/data/products";
import { SLOT_COLS, SLOT_H, SLOT_ROWS, SLOT_W } from "@/lib/machine-layout";
import { cn } from "@/lib/utils";

interface SlotGridProps {
  selected: string | null;
  available: (code: string) => number;
  onSelect: (code: string) => void;
  onOpen: (code: string) => void;
  dimRow?: number | null;
  shake?: { code: string; tick: number } | null;
  ticks?: Record<string, number>;
  /** Products are in the slots (false hides them until the boot drop). */
  loaded?: boolean;
  /** Seconds between each product drop. */
  step?: number;
  /** Changes on every boot so the drop replays. */
  bootKey?: number;
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
  dim,
  shakeTick,
  tick,
  step,
}: {
  step: number;
  tick: number;
  dim: boolean;
  shakeTick: number;
  product: Product;
  index: number;
  selected: boolean;
  avail: number;
  onSelect: (code: string) => void;
  onOpen: (code: string) => void;
}) {
  const col = index % 4;
  const row = Math.floor(index / 4);
  const soldOut = product.stock === 0;
  const allInCart = !soldOut && avail === 0;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      type="button"
      aria-label={`${product.code} ${product.name}, QAR ${product.price.toFixed(2)}, ${soldOut ? "sold out" : allInCart ? "all in your cart" : stockLabel(avail).toLowerCase()}`}
      aria-pressed={selected}
      disabled={soldOut}
      onClick={() => (selected && isTouch() ? onOpen(product.code) : onSelect(product.code))}
      onMouseEnter={() => !isTouch() && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "machine-slot group",
        selected && "is-selected",
        soldOut && "is-soldout",
        dim && "is-dim",
      )}
      style={{
        left: SLOT_COLS[col],
        top: SLOT_ROWS[row],
        width: SLOT_W,
        height: SLOT_H,
      }}
      initial={{ opacity: 0, y: -26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * step,
        type: "spring",
        stiffness: 320,
        damping: 19,
      }}
    >
      <span key={shakeTick} className={cn("slot-shake", shakeTick > 0 && "is-shaking", dim && "is-dim")}>
      <span className="slot-photo">
        <img src={`/products/${product.code}.jpg`} alt="" draggable={false} />
        <img className="slot-hover-img" src={`/hover/${product.code}.jpg`} alt="" draggable={false} />
      </span>
      {soldOut && <span className="soldout-stamp">SOLD OUT</span>}
      <span key={`chip-${tick}`} className={cn("slot-chip", tick > 0 && "is-tick")}>
        <b>{product.code}</b>
        <i className={cn(avail <= 3 && "low")}>{allInCart ? "IN CART" : stockLabel(avail)}</i>
      </span>
      {hovered && !soldOut && (
        <span className="slot-tip">
          <span className="slot-tip-name">{product.name.toUpperCase()}</span>
          <span className="slot-tip-price">QAR {product.price.toFixed(2)}</span>
        </span>
      )}
      </span>
    </motion.button>
  );
}

export function SlotGrid({ selected, available, onSelect, onOpen, dimRow = null, shake = null, ticks = {}, loaded = true, step = 0.09, bootKey = 0 }: SlotGridProps) {
  if (!loaded) return null;

  return (
    <Fragment key={bootKey}>
      {PRODUCTS.map((p, i) => (
        <Slot
          key={p.code}
          product={p}
          index={i}
          selected={selected === p.code}
          avail={available(p.code)}
          onSelect={onSelect}
          onOpen={onOpen}
          dim={dimRow != null && i >= 0 && Math.floor(i / 4) !== dimRow}
          shakeTick={shake?.code === p.code ? shake.tick : 0}
          tick={ticks[p.code] ?? 0}
          step={step}
        />
      ))}
    </Fragment>
  );
}
