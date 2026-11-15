import { Link } from "@tanstack/react-router";
import { StaticOverlay } from "@/components/intro/StaticOverlay";

/** 404 in the store's voice: the dark machine behind animated static. */
export function SignalLost404() {
  return (
    <section className="nf" role="alert">
      <img className="nf-bg" src="/machine/machine-empty.jpg" alt="" aria-hidden />
      <StaticOverlay opacity={0.22} />
      <div className="nf-in">
        <h1 className="gate-title lost-title">SIGNAL LOST.</h1>
        <p className="nf-copy">This frequency is empty. Either the page moved or the transmitter caught fire again.</p>
        <Link to="/" className="btn-primary gate-btn">Retune</Link>
      </div>
    </section>
  );
}
