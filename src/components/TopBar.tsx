import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { RadioPlayer } from "@/components/intro/RadioPlayer";
import { cn } from "@/lib/utils";

interface TopBarProps {
  cartCount: number;
  savedCount: number;
  onCart?: () => void;
  onSaved?: () => void;
  liveText: string;
  userName: string | null;
  isAdmin?: boolean;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onOrders?: () => void;
  hidden?: boolean;
  onAir?: boolean;
  onToggleAir?: () => void;
  onExit?: () => void;
  muted?: boolean;
  onSound?: () => void;
}

/** Fixed top bar: station logo, on-air ticker, and action buttons. */
export function TopBar({ cartCount, savedCount, onCart, onSaved, liveText, userName, isAdmin, onSignIn, onSignOut, onOrders, hidden = false, onAir = true, onToggleAir, onExit, muted = false, onSound }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  return (
    <motion.header
      className={cn("topbar", hidden && "is-hidden")}
      initial={{ opacity: 0 }}
      animate={{ opacity: hidden ? 0 : 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="topbar-logo">
        LOST SIGNAL <b>88.8</b>
      </div>
      <div className={cn("onair-badge topbar-desktop", !onAir && "is-off")}>
        {onAir ? "● ON AIR" : "○ OFF AIR · back at 8pm"}
      </div>
      <div className="topbar-desktop"><RadioPlayer /></div>
      <div className="topbar-live topbar-desktop">
        <span className="live-dot" aria-hidden />
        <span key={liveText} className="topbar-live-text">{liveText}</span>
      </div>
      <div className="topbar-actions topbar-desktop">
        <button type="button" className="btn-secondary" onClick={onSaved}>
          ♥ Saved {savedCount}
        </button>
        <button type="button" className="btn-secondary btn-cart" onClick={onCart}>
          Cart {cartCount}
        </button>
        <button type="button" className="btn-secondary" onClick={onOrders}>
          Orders
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={onToggleAir}>
          {onAir ? "Back to daylight" : "Skip to tonight"}
        </button>
        <button type="button" className="btn-secondary" aria-pressed={!muted} onClick={onSound}>
          {muted ? "Sound off" : "Sound on"}
        </button>
        <button type="button" className="btn-secondary" onClick={onExit}>
          Exit
        </button>
        {userName ? (
          <div className="topbar-user">
            <button
              type="button"
              className="btn-secondary is-user"
              aria-expanded={userOpen}
              onClick={() => setUserOpen((o) => !o)}
            >
              {userName} ▾
            </button>
            {userOpen && (
              <div className="topbar-user-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => { setUserOpen(false); onOrders?.(); }}>Orders</button>
                {isAdmin && (
                  <Link to="/booth" role="menuitem" onClick={() => setUserOpen(false)}>The Booth</Link>
                )}
                <button type="button" role="menuitem" onClick={() => { setUserOpen(false); onSignOut?.(); }}>Sign out</button>
              </div>
            )}
          </div>
        ) : (
          <button type="button" className="btn-secondary" onClick={onSignIn}>
            Sign in
          </button>
        )}
      </div>
      <div className="topbar-mobile">
        <button type="button" className="icon-btn" aria-label={`Saved, ${savedCount}`}>
          ♥ {savedCount}
        </button>
        <button type="button" className="icon-btn is-cart" aria-label={`Cart, ${cartCount}`}>
          🛒 {cartCount}
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          ☰
        </button>
        {menuOpen && (
          <div className="mobile-menu" role="menu">
            {([
              ["Orders", onOrders],
              [muted ? "Sound off" : "Sound on", onSound],
              ["Exit", onExit],
            ] as const).map(([l, f]) => (
              <button key={l} type="button" role="menuitem" onClick={() => { setMenuOpen(false); f?.(); }}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.header>
  );
}
