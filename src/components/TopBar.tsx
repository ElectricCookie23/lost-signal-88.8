import { motion } from "framer-motion";

interface TopBarProps {
  cartCount: number;
  savedCount: number;
}

/** Fixed top bar: station logo, on-air ticker, and action buttons. */
export function TopBar({ cartCount, savedCount }: TopBarProps) {
  return (
    <motion.header
      className="topbar"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      <div className="topbar-logo">
        LOST SIGNAL <b>88.8</b>
      </div>
      <div className="topbar-live">
        <span className="live-dot" aria-hidden />
        ON AIR · 11 listeners tuned in
      </div>
      <div className="topbar-actions">
        <button type="button" className="btn-secondary">
          ♥ Saved {savedCount}
        </button>
        <button type="button" className="btn-secondary btn-cart">
          Cart {cartCount}
        </button>
        <button type="button" className="btn-secondary">
          Orders
        </button>
        <button type="button" className="btn-secondary">
          Sound on
        </button>
        <button type="button" className="btn-secondary">
          Exit
        </button>
      </div>
    </motion.header>
  );
}
