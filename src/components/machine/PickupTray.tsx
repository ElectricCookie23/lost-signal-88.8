import { AnimatePresence, motion } from "framer-motion";
import { TRAY } from "@/lib/machine-layout";
import { readLine } from "@/lib/shopping";

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
      // drag a tape from the tray onto the pocket radio to play it
      onDragStart={(e) => {
        const code = (e.target as HTMLElement).dataset?.code;
        if (!code) return;
        e.dataTransfer.setData("text/plain", `ls888:${code}`);
        e.dataTransfer.effectAllowed = "copy";
      }}
    >
      {shown.length === 0 && <span className="tray-hint">YOUR CART · EMPTY</span>}
      <AnimatePresence>
        {shown.map((code, i) => (
          <motion.img
            key={`${code}-${i}`}
            src={`/products/${readLine(code).code==="KIT"?"B1":readLine(code).code}.jpg`}
            alt=""
            draggable
            data-code={readLine(code).code}
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
