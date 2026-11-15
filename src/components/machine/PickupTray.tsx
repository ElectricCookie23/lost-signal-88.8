import { AnimatePresence, motion } from "framer-motion";
import { TRAY } from "@/lib/machine-layout";

interface PickupTrayProps {
  items: string[]; // product codes, one entry per unit
  onOpen?: () => void;
}

/** The pickup tray at the bottom of the machine. */
export function PickupTray({ items, onOpen }: PickupTrayProps) {
  const shown = items.slice(-7);
  return (
    <button
      type="button"
      aria-label={items.length ? `Open your cart, ${items.length} items` : "Your cart is empty"}
      className="machine-tray"
      style={{ ...TRAY }}
      onClick={onOpen}
    >
      {shown.length === 0 && <span className="tray-hint">YOUR CART · EMPTY</span>}
      <AnimatePresence>
        {shown.map((code, i) => (
          <motion.img
            key={`${code}-${i}`}
            src={`/products/${code}.jpg`}
            alt=""
            draggable={false}
            className="tray-thumb"
            style={{ rotate: i % 2 ? 4 : -5 }}
            initial={{ opacity: 0, y: -18, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
          />
        ))}
      </AnimatePresence>
    </button>
  );
}
