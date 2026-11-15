import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { SocialLinks } from "./Social";

/** Desktop bottom strip: copyright, page links, socials and the newsletter button. */
export function Footer({ hidden, onOrders, onJoin }: { hidden: boolean; onOrders: () => void; onJoin: () => void }) {
  return (
    <footer className={cn("site-footer", hidden && "is-hidden")} aria-hidden={hidden}>
      <span className="site-footer-copy">© Lost Signal 88.8. Unlicensed since day one.</span>
      <FooterLinks onOrders={onOrders} />
      <div className="site-footer-right">
        <SocialLinks />
        <button type="button" className="btn-secondary footer-join" onClick={onJoin}>Join the frequency</button>
      </div>
    </footer>
  );
}

export function FooterLinks({ onOrders, onPick }: { onOrders: () => void; onPick?: () => void }) {
  const L = (view: string, label: string) => (
    <Link to="/$view" params={{ view }} onClick={onPick}>{label}</Link>
  );
  return (
    <nav className="footer-links" aria-label="Footer">
      {L("station", "Station")}
      {L("night-log", "Night Log")}
      {L("request-line", "Request Line")}
      <button type="button" onClick={() => { onPick?.(); onOrders(); }}>Orders</button>
      {L("shipping", "Shipping & Returns")}
      {L("privacy", "Privacy")}
    </nav>
  );
}
