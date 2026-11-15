import { motion } from "framer-motion";
import { LCD } from "@/lib/machine-layout";

/** The machine's little glowing display. Text uses \n for its two lines. */
export function Lcd({ text }: { text: string }) {
  return (
    <motion.div
      aria-live="polite"
      className="machine-lcd"
      style={{ ...LCD }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.5 }}
    >
      {text.split("\n").map((line, i) => (
        <span key={i}>{line}</span>
      ))}
    </motion.div>
  );
}
