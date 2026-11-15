import { motion } from "framer-motion";
import { GLASS_MENU } from "@/lib/machine-layout";
import { cn } from "@/lib/utils";

const ROWS = ["TAPES", "WEAR", "GEAR", "PAPER"];
const STUBS = ["STATION", "NIGHT LOG", "REQUEST LINE"];

interface GlassMenuProps {
  activeRow: number | null;
  onRow: (row: number) => void;
}

/** The glowing menu printed on the machine glass. */
export function GlassMenu({ activeRow, onRow }: GlassMenuProps) {
  return (
    <motion.nav
      aria-label="Machine menu"
      className="absolute flex flex-col items-center justify-center gap-0.5"
      style={{ ...GLASS_MENU }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.25 }}
    >
      <div className="flex gap-[46px]">
        {ROWS.map((name, i) => (
          <button
            key={name}
            type="button"
            onClick={() => onRow(i)}
            className={cn("glass-menu-item", activeRow === i && "is-active")}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="glass-menu-sub">
        {STUBS.map((name, i) => (
          <span key={name} className="flex items-center gap-[18px]">
            {i > 0 && <span className="opacity-50">·</span>}
            <button type="button" className="glass-menu-sub-item" disabled>
              {name}
            </button>
          </span>
        ))}
      </div>
    </motion.nav>
  );
}
