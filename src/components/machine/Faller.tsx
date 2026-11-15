import { motion } from "framer-motion";
import { TRAY } from "@/lib/machine-layout";
import type { Faller as FallerState } from "@/hooks/use-machine-store";

interface FallerProps {
  faller: FallerState;
  onDone: () => void;
}

/**
 * A copy of the product photo that falls from its slot into the pickup
 * tray when an item is added to the cart.
 */
export function Faller({ faller, onDone }: FallerProps) {
  const targetX = TRAY.left + TRAY.width / 2 - 29;
  const targetY = TRAY.top + TRAY.height - 68;
  return (
    <motion.img
      key={faller.id}
      src={`/products/${faller.code}.jpg`}
      alt=""
      draggable={false}
      className="faller-img"
      initial={{
        x: faller.from.x,
        y: faller.from.y,
        width: 162,
        height: 124,
        rotate: 0,
        opacity: 1,
      }}
      animate={{
        x: targetX,
        y: targetY,
        width: 58,
        height: 58,
        rotate: 10,
        opacity: 0.9,
      }}
      transition={{ duration: 0.55, ease: [0.5, 0, 0.9, 0.6] }}
      onAnimationComplete={onDone}
    />
  );
}
