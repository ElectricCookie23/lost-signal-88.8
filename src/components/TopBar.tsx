import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface TopBarProps {
  cartCount: number;
  savedCount: number;
  onCart?: () => void;
  onSaved?: () => void;
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

/** Slim transparent top bar: ☰ menu + logo + status dot on the left, saved and cart on the right. */
export function TopBar({ cartCount, savedCount, onCart, onSaved, userName, isAdmin, onSignIn, onSignOut, onOrders, hidden = false, onAir = true, onToggleAir, onExit, muted = false, onSound }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const run = (f?: () => void) => () => { setOpen(false); f?.(); };
  return (
    <header className={cn("topbar", hidden && "is-hidden")}>
      <div className="topbar-left" ref={ref}>
        <button type="button" className="icon-btn topbar-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          ☰
        </button>
        <div className="topbar-logo">
          LOST SIGNAL <b>88.8</b>
          <span className={cn("status-dot", !onAir && "is-off")} title={onAir ? "On air" : "Off air · back at 8pm"} aria-label={onAir ? "On air" : "Off air"} />
        </div>
        {open && (
          <div className="topbar-menu" role="menu">
            <button type="button" role="menuitem" onClick={run(onOrders)}>Orders</button>
            {userName ? (
              <>
                {isAdmin && <Link to="/booth" role="menuitem" onClick={() => setOpen(false)}>The Booth</Link>}
                <button type="button" role="menuitem" onClick={run(onSignOut)}>Sign out ({userName})</button>
              </>
            ) : (
              <button type="button" role="menuitem" onClick={run(onSignIn)}>Sign in</button>
            )}
            <button type="button" role="menuitem" onClick={run(onSound)}>{muted ? "Sound off" : "Sound on"}</button>
            <button type="button" role="menuitem" onClick={run(onToggleAir)}>{onAir ? "Back to daylight" : "Skip to tonight"}</button>
            <button type="button" role="menuitem" onClick={run(onExit)}>Exit</button>
          </div>
        )}
      </div>
      <div className="topbar-right">
        <button type="button" className="icon-btn" aria-label={`Saved, ${savedCount}`} onClick={onSaved}>♥ {savedCount}</button>
        <button type="button" className="icon-btn is-cart" aria-label={`Cart, ${cartCount}`} onClick={onCart}>CART {cartCount}</button>
      </div>
    </header>
  );
}
