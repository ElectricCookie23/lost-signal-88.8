import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NIGHT_LOG, REQUEST_TOPICS, type PageName } from "@/data/pages";
import { play } from "@/lib/audio";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

/** 16:9 hero image across the top of a hologram panel. */
export function HoloHero({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="holo-hero">
      <img src={src} alt={alt} loading="lazy" />
    </div>
  );
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function Station() {
  return (
    <>
      <h2 className="holo-h1 text-[26px]">Nobody&apos;s supposed to know where we are.</h2>
      <p className="holo-copy mt-3">88.8 started on a rooftop with a borrowed transmitter, a car battery and one rule: we only broadcast after dark.</p>
      <p className="holo-copy mt-2.5">The building has a corridor nobody uses after 8pm. In it was a vending machine that stopped selling soda years ago. We cleaned it out, rewired the lights and filled it with things the station makes.</p>
      <p className="holo-copy mt-2.5">Stock is small and it doesn&apos;t come back often. Every purchase keeps the transmitter running for another night. You either catch the signal or you don&apos;t.</p>
      <p className="holo-lcd mt-3.5 text-[24px] text-[var(--ls-orange)]">SEE YOU AT 8. BRING COINS.</p>
      <Link to="/$view" params={{view:"rooftop-session"}} className="holo-link">Watch Rooftop Session 004 →</Link>
    </>
  );
}

function NightLog() {
  const [big, setBig] = useState<number | null>(null);
  const cur = big == null ? null : NIGHT_LOG[big];
  // Escape closes only the photo, not the whole panel
  useEffect(() => {
    if (big == null) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopImmediatePropagation(); setBig(null); } };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [big]);
  return (
    <>
      <div className="holo-lcd text-[20px]">20:00 — 06:00</div>
      <h2 className="holo-h1">Night Log</h2>
      <div className="night-log">
        {NIGHT_LOG.map(([f, t, c], i) => (
          <figure key={f}>
            <button type="button" onClick={() => setBig(i)} aria-label={`Open photo: ${t}`}>
              <img src={`/nightlog/${f}.jpg`} alt={`${t} ${c}`} loading="lazy" />
            </button>
            <figcaption><b>{t}</b> {c}</figcaption>
          </figure>
        ))}
      </div>
      {cur && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={cur[1]} onClick={() => setBig(null)}>
          <img src={`/nightlog/${cur[0]}.jpg`} alt={`${cur[1]} ${cur[2]}`} />
          <p><b>{cur[1]}</b> {cur[2]}</p>
          <button type="button" className="holo-x" aria-label="Close photo" autoFocus onClick={() => setBig(null)}>[X]</button>
        </div>
      )}
    </>
  );
}

function RequestLine() {
  const [f, setF] = useState({ name: "", email: "", topic: REQUEST_TOPICS[0] as string, message: "" });
  const [state, setState] = useState<"idle" | "busy" | "done" | "err">("idle");
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <>
      <h2 className="holo-h1">Request Line</h2>
      <p className="holo-copy mt-1.5 mb-1">Open 8PM to 6AM. Lines are always busy. Leave a message.</p>
      {state === "done" ? (
        <p className="holo-toast mt-4">Got it. If DJ Static reads it on air, you&apos;ll know.</p>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!f.name.trim()) { setErr("Give us a name or call sign."); return; }
            if (!EMAIL.test(f.email.trim())) { setErr("That email doesn't look right."); return; }
            setErr(""); setState("busy");
            const { error } = await supabase.from("requests").insert({
              name: f.name.trim().slice(0, 100), email: f.email.trim().toLowerCase(), topic: f.topic, message: f.message.slice(0, 2000),
            });
            if (error) { setState("err"); setErr("The line dropped. Try again."); return; }
            play("static", { vol: 0.4, dur: 0.3 });
            setState("done");
          }}
        >
          <label className="holo-field"><span>YOUR NAME (OR CALL SIGN)</span><input className="holo-input" value={f.name} onChange={set("name")} maxLength={100} required /></label>
          <label className="holo-field"><span>EMAIL</span><input className="holo-input" type="email" value={f.email} onChange={set("email")} maxLength={254} required /></label>
          <label className="holo-field"><span>WHAT&apos;S THIS ABOUT?</span>
            <select className="holo-input" value={f.topic} onChange={set("topic")}>
              {REQUEST_TOPICS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="holo-field"><span>MESSAGE</span><textarea className="holo-input" rows={4} value={f.message} onChange={set("message")} maxLength={2000} /></label>
          {err && <div className="holo-toast">{err}</div>}
          <div className="holo-acts"><button type="submit" className="btn-primary holo-add flex-1" disabled={state === "busy"}>Send to the booth</button></div>
        </form>
      )}
    </>
  );
}

function Join() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");
  return (
    <>
      <h2 className="holo-h1">Join the frequency</h2>
      <p className="holo-copy mt-2">One email when something new drops in the machine. No spam. We don&apos;t have time, we&apos;re busy broadcasting.</p>
      {state === "done" ? (
        <p className="holo-toast mt-4">You&apos;re on the list. Keep your radio close.</p>
      ) : (
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const v = email.trim().toLowerCase();
            if (!EMAIL.test(v)) { setErr("That email doesn't look right."); return; }
            setErr(""); setState("busy");
            const { error } = await supabase.from("subscribers").insert({ email: v });
            // already on the list counts as success
            if (error && error.code !== "23505") { setState("idle"); setErr("No signal. Try again."); return; }
            setState("done");
          }}
        >
          <input className="holo-input" type="email" aria-label="Email" placeholder="you@frequency.fm" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} required />
          <button type="submit" className="btn-primary holo-add" disabled={state === "busy"}>Tune in</button>
        </form>
      )}
      {err && <div className="holo-toast">{err}</div>}
    </>
  );
}

function Shipping() {
  return (
    <>
      <h2 className="holo-h1">Shipping &amp; Returns</h2>
      <p className="holo-copy mt-3"><b>Shipping.</b> Free within Qatar. Orders leave the stairwell within a day and arrive in 3–5 days. Outside Qatar, we&apos;ll email you a quote before anything ships.</p>
      <p className="holo-copy mt-2.5"><b>Returns.</b> Changed your mind? Send it back within 14 days if it&apos;s unused and in its original packaging, and we&apos;ll refund you in full. Write to us on the Request Line with your order number.</p>
      <p className="holo-copy mt-2.5"><b>Damaged or wrong item?</b> Tell us within 7 days and we&apos;ll replace it at our cost.</p>
    </>
  );
}

function Privacy() {
  return (
    <>
      <h2 className="holo-h1">Privacy</h2>
      <p className="holo-copy mt-3">We only store what we need to get your order to you: your email, your shipping address and your orders. If you join the frequency, we store your email to tell you about new drops.</p>
      <p className="holo-copy mt-2.5">We never see or store card details. We don&apos;t sell or share your data, and we don&apos;t use ad trackers.</p>
      <p className="holo-copy mt-2.5">Want your data removed? Leave a message on the Request Line and we&apos;ll delete it within 7 days.</p>
    </>
  );
}

function RooftopSession(){const [video,setVideo]=useState(false);const [sound,setSound]=useState(false);useEffect(()=>{const c=new AbortController();void fetch("/video/rooftop-session.mp4",{method:"HEAD",signal:c.signal}).then(r=>setVideo(r.ok&&!!r.headers.get("content-type")?.startsWith("video/"))).catch(()=>{});return()=>c.abort();},[]);return <><h2 className="holo-h1">Rooftop Session 004</h2>{video?<><video className="rooftop-video" src="/video/rooftop-session.mp4" loop muted={!sound} autoPlay playsInline controls/><Button variant="ghost" onClick={()=>setSound(!sound)}>{sound?"Mute session":"Play sound"}</Button></>:<div className="rooftop-still"><img src="/nightlog/2000.jpg" alt="The rooftop at lights-on"/></div>}<p className="holo-copy">Rooftop Session 004. One night, one band, one antenna. The building manager still doesn&apos;t know.</p><Link to="/$view" params={{view:"d2"}} className="holo-link">D2 · Get the poster →</Link></>;}
export function PageView({ name }: { name: PageName }) {
  if(name==="rooftop-session")return <RooftopSession/>;
  if (name === "station") return <Station />;
  if (name === "night-log") return <NightLog />;
  if (name === "request-line") return <RequestLine />;
  if (name === "join") return <Join />;
  if (name === "shipping") return <Shipping />;
  return <Privacy />;
}
