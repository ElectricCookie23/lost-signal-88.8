import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  cartCount: number;
  savedCount: number;
  onCart?: () => void;
  onSaved?: () => void;
  onMenu?: () => void;
  onHome?: () => void;
  menuOpen?: boolean;
  hidden?: boolean;
  onAir?: boolean;
  showLights?: boolean;
  onLights?: () => void;
}

/** Slim transparent top bar: ☰ navigator + logo (home) + status dot on the left, saved and cart on the right. */
export function TopBar({ cartCount, savedCount, onCart, onSaved, onMenu, onHome, menuOpen = false, hidden = false, onAir = true, showLights, onLights }: TopBarProps) {
  return (
    <header className={cn("topbar", hidden && "is-hidden")}>
      <div className="topbar-left">
        <button type="button" className="icon-btn topbar-burger" aria-label="Open navigator" aria-expanded={menuOpen} aria-controls="navigator" onClick={onMenu}>
          ☰
        </button>
        <Link to="/" className="topbar-logo" aria-label="Lost Signal 88.8, back to the machine" onClick={onHome}>
          LOST SIGNAL <b>88.8</b>
          <span className={cn("status-dot", !onAir && "is-off")} title={onAir ? "On air" : "Off air · back at 8pm"} aria-label={onAir ? "On air" : "Off air"} />
        </Link>
      </div>
      <div className="topbar-right">
        {showLights && <Button variant="ghost" className="lights-switch" aria-label="Turn the lights on" onClick={onLights}>☾ <span>TURN THE LIGHTS ON</span></Button>}
        <button type="button" className="icon-btn" aria-label={`Saved, ${savedCount}`} onClick={onSaved}>♥ {savedCount}</button>
        <button type="button" className="icon-btn is-cart" aria-label={`Cart, ${cartCount}`} onClick={onCart}>CART {cartCount}</button>
      </div>
    </header>
  );
}
