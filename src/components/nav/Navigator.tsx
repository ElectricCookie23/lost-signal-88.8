import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PRODUCT_BY_CODE, ROW_SLUGS } from "@/data/products";
import { cn } from "@/lib/utils";
import { FooterLinks } from "./Footer";
import { SocialLinks } from "./Social";

const ROWS = ["Tapes", "Wear", "Gear", "Paper"];

interface Props {
  open: boolean;
  onClose: () => void;
  onHome: () => void;
  onCart: () => void;
  onSaved: () => void;
  onOrders: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onSound: () => void;
  onToggleAir: () => void;
  onExit: () => void;
  onJoin: () => void;
  cartCount: number;
  savedCount: number;
  available: (code: string) => number;
  userName: string | null;
  isAdmin: boolean;
  muted: boolean;
  onAir: boolean;
  listenerCard?: string | null;
}

/** Left sidebar navigator, styled like the hologram. The only menu on desktop and mobile. */
export function Navigator(p: Props) {
  const [row, setRow] = useState<number | null>(null);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!p.open) return;
    ref.current?.querySelector<HTMLElement>(".nav-x")?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); p.onClose(); } };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [p.open]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (f: () => void) => () => { p.onClose(); f(); };
  return (
    <>
      <div className={cn("nav-scrim", p.open && "is-on")} onClick={p.onClose} aria-hidden />
      <aside id="navigator" ref={ref} role="dialog" aria-modal="true" aria-label="Navigator" aria-hidden={!p.open} className={cn("navigator", p.open && "is-on")} inert={!p.open}>
        <button type="button" className="holo-x nav-x" onClick={p.onClose} aria-label="Close navigator">[X]</button>
        <Link to="/" className="nav-sec" onClick={go(p.onHome)}>The machine</Link>
        <div className="nav-sec">Shop</div>
        <ul className="nav-rows">
          {ROWS.map((name, r) => (
            <li key={name}>
              <div className="nav-row">
                <Link to="/$view" params={{ view: ROW_SLUGS[r] ?? "tapes" }} onClick={p.onClose}>{name}</Link>
                <button type="button" aria-expanded={row === r} aria-label={`Show ${name} products`} onClick={() => setRow(row === r ? null : r)}>{row === r ? "−" : "+"}</button>
              </div>
              {row === r && (
                <ul className="nav-prods">
                  {[1, 2, 3, 4].map((i) => {
                    const code = `${"ABCD"[r]}${i}`;
                    const pr = PRODUCT_BY_CODE[code];
                    return (
                      <li key={code}>
                        <Link to="/$view" params={{ view: code.toLowerCase() }} onClick={p.onClose}>
                          {code} · {pr?.name} · {pr?.stock === 0 ? "SOLD OUT" : p.available(code)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <Link to="/$view" params={{view:"night-shift-kit"}} className="nav-sec" onClick={p.onClose}>Night Shift Kit · QAR 349</Link>
        <button type="button" className="nav-sec" onClick={go(p.onCart)}>Cart <span className="nav-count">{p.cartCount}</span></button>
        <button type="button" className="nav-sec" onClick={go(p.onSaved)}>♥ Saved <span className="nav-count">{p.savedCount}</span></button>
        <button type="button" className="nav-sec" onClick={go(p.onOrders)}>Orders &amp; receipts</button>
        <hr />
        <div className="nav-pages">
          <Link to="/$view" params={{ view: "station" }} onClick={p.onClose}>Station</Link>
          <span aria-hidden>·</span>
          <Link to="/$view" params={{ view: "night-log" }} onClick={p.onClose}>Night Log</Link>
          <span aria-hidden>·</span>
          <Link to="/$view" params={{ view: "request-line" }} onClick={p.onClose}>Request Line</Link>
        </div>
        <hr />
        <div className="nav-small">
          {p.userName ? (
            <>
              <span>{p.userName}</span>
              {p.listenerCard&&<div className="listener-card">◉ 88.8 · {p.listenerCard}</div>}
              {p.isAdmin && <Link to="/booth" onClick={p.onClose}>The Booth</Link>}
              <button type="button" onClick={go(p.onSignOut)}>Sign out</button>
            </>
          ) : (
            <button type="button" onClick={go(p.onSignIn)}>Sign in</button>
          )}
          <button type="button" onClick={p.onSound}>{p.muted ? "Sound off" : "Sound on"}</button>
          <button type="button" onClick={go(p.onToggleAir)}>{p.onAir ? "Back to daylight" : "Turn the lights on"}</button>
          <button type="button" onClick={go(p.onExit)}>Exit</button>
        </div>
        <div className="nav-mobile-foot">
          <FooterLinks onOrders={p.onOrders} onPick={p.onClose} />
          <SocialLinks />
          <button type="button" className="btn-secondary footer-join" onClick={go(p.onJoin)}>Join the frequency</button>
          <span className="site-footer-copy">© Lost Signal 88.8. Unlicensed since day one.</span>
        </div>
      </aside>
    </>
  );
}
