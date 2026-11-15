import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { PRODUCTS } from "@/data/products";
import { MOBILE_DOCK_H } from "@/lib/machine-layout";
import { cn } from "@/lib/utils";

interface MobileDockProps {
  lcdText: string;
  selected: string | null;
  isSaved: boolean;
  available: (code: string) => number;
  onSelect: (code: string) => void;
  onAdd: () => void;
  onSave: () => void;
}

/** Phone-only control panel fixed to the bottom of the screen. */
export function MobileDock({ lcdText, selected, isSaved, available, onSelect, onAdd, onSave }: MobileDockProps) {
  const [keypad, setKeypad] = useState(false);
  return (
    <>
      <AnimatePresence>
        {keypad && (
          <motion.div
            className="mobile-keypad"
            style={{ bottom: MOBILE_DOCK_H - 12 }}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {PRODUCTS.map((p) => (
              <button
                key={p.code}
                type="button"
                disabled={available(p.code) === 0}
                className={cn(selected === p.code && "is-on")}
                onClick={() => onSelect(p.code)}
              >
                {p.code}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mobile-dock">
        <div className="dock-lcd" aria-live="polite">
          {lcdText.split("\n").map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <div className="dock-actions">
          <button type="button" className="btn-primary" onClick={onAdd}>
            Add to cart
          </button>
          <button
            type="button"
            className={cn("icon-btn", isSaved && "is-on")}
            aria-label="Save selected item"
            onClick={onSave}
          >
            ♥
          </button>
          <button
            type="button"
            className={cn("icon-btn", keypad && "is-on")}
            aria-expanded={keypad}
            onClick={() => setKeypad((k) => !k)}
          >
            KEYPAD
          </button>
        </div>
      </div>
    </>
  );
}
