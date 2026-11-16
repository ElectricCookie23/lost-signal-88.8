import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NIGHT_LOG, REQUEST_TOPICS, SHOWS, type PageName } from "@/data/pages";
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

/** Minutes past midnight in Qatar (UTC+3, no DST); null until mounted so SSR matches. */
function useQatarMinute() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => { const d = new Date(); setNow(((d.getUTCHours() + 3) % 24) * 60 + d.getUTCMinutes()); };
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}
/** Minutes since 20:00, so the 20:00 to 06:00 night counts up 0 to 599. */
const sinceEight = (min: number) => (min - 1200 + 1440) % 1440;
const hhmm = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(2));
const label = (s: string) => `${s.slice(0, 2)}:${s.slice(2)}`;

function Station() {
  const now = useQatarMinute();
  const onAir = now != null && sinceEight(now) < 600;
  const cur = onAir ? SHOWS.reduce((c, sh, i) => (sinceEight(hhmm(sh[0])) <= sinceEight(now ?? 0) ? i : c), 0) : -1;
  return (
    <>
      <div className={`log-status${onAir ? " is-live" : ""}`}>{onAir ? `ON AIR · ${(SHOWS[cur]?.[1] ?? "").toUpperCase()}` : "OFF AIR · BACK AT 8"}</div>
      <h2 className="holo-h1 text-[26px] mt-1">You weren&apos;t supposed to find this.</h2>
      <p className="holo-copy mt-3">88.8 is a pirate station. No licence, no office, no faces. Just a borrowed transmitter on the roof of a tower nobody finished, and a crew of three who only work after dark.</p>
      <p className="holo-copy mt-2.5"><b>The Host</b> talks, on air as DJ Static. <b>The Engineer</b> keeps the transmitter from catching fire. <b>The Runner</b> does everything else: batteries, tea, deliveries, and the vending machine in the corridor.</p>
      <p className="holo-copy mt-2.5">The machine stopped selling soda years ago. We rewired it and filled it with things the station makes. Every sale keeps us on air for one more night. When something sells out, it&apos;s gone until we make more.</p>
      <div className="station-rules">
        <b>HOUSE RULES</b><br />
        1. We only broadcast 8pm to 6am.<br />
        2. Don&apos;t tell anyone which building.<br />
        3. Pay the machine. It remembers.<br />
        4. If line 2 rings, don&apos;t pick up.
      </div>
      <div className="holo-lcd mt-5 text-[20px]">TONIGHT ON 88.8</div>
      <div className="sched">
        {SHOWS.map(([t, name, line], i) => (
          <div key={t} className={`sched-row${i === cur ? " is-now" : ""}`}>
            <time>{label(t)}</time>
            <div><strong>{name}</strong><p>{line}</p></div>
          </div>
        ))}
      </div>
      <p className="holo-copy mt-4">Something strange happened on the request line last night. <Link to="/$view" params={{ view: "night-log" }} className="holo-link">Read the Night Log →</Link></p>
      <Link to="/$view" params={{view:"rooftop-session"}} className="holo-link">Watch Rooftop Session 004 →</Link>
    </>
  );
}

function NightLog() {
  const [big, setBig] = useState<number | null>(null);
  const [archive, setArchive] = useState(false);
  const now = useQatarMinute();
  const night = now != null && sinceEight(now) < 600;
  const live = night && !archive;
  const open = (f: string) => !live || sinceEight(hhmm(f)) <= sinceEight(now ?? 0);
  const count = NIGHT_LOG.filter(([f]) => open(f)).length;
  const prev = useRef(count);
  const [fresh, setFresh] = useState<string | null>(null);
  // a new entry unlocking while the page is open: static burst and a flash
  useEffect(() => {
    if (live && count > prev.current) {
      play("static", { vol: 0.35, dur: 0.4 });
      setFresh(NIGHT_LOG[count - 1]?.[0] ?? null);
    }
    prev.current = count;
  }, [count, live]);
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
      <div className={`log-status${live ? " is-live" : ""}`}>{live ? `LIVE · ${count} OF ${NIGHT_LOG.length} LOGGED` : "ARCHIVED · LAST NIGHT"}</div>
      <h2 className="holo-h1 mt-1">Night Log</h2>
      <p className="holo-copy mt-1.5">{live ? "Tonight, written as it happens. The rest isn't logged yet. Come back later." : "One night, ten photos, and a caller on line 2 who knew more than we did."}</p>
      {night && <button type="button" className="log-toggle" onClick={() => setArchive((a) => !a)}>{archive ? "Back to tonight's log →" : "Read last night's full log →"}</button>}
      <div className="night-log">
        {NIGHT_LOG.map(([f, t, c], i) =>
          open(f) ? (
            <figure key={f} className={fresh === f ? "is-new" : undefined}>
              <div className="log-photo">
                <button type="button" onClick={() => setBig(i)} aria-label={`Open photo: ${t}`}>
                  <img src={`/nightlog/${f}.jpg`} alt={`${t} ${c}`} loading="lazy" />
                </button>
                {f === "0247" && (
                  <Link to="/$view" params={{ view: "fourth-floor" }} className="log-window" aria-label="A lit window on the fourth floor" title="4F" />
                )}
              </div>
              <figcaption><b>{t}</b> {c}</figcaption>
            </figure>
          ) : (
            <figure key={f} aria-label={`Not logged yet: ${label(f)}`}>
              <div className="log-locked"><b>{label(f)}</b><span>NOT LOGGED YET</span></div>
            </figure>
          ),
        )}
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
const TRANSMISSIONS: [string, string][] = [
  ["TX 001 · 03:15", "A calm voice reading slot codes. D4. A1. D4. Then: try it on the machine."],
  ["TX 002 · 03:15", "Same voice, same time, a different night. The tape is dated before we went on air."],
  ["TX 003 · 04:44", "Twenty minutes of 88.8, recorded off the air, a few seconds late. Nobody on the crew has a recorder."],
  ["TX 004 · 05:59", "Rain, a door closing, and one line: same time tomorrow."],
];

function FourthFloor() {
  useEffect(() => { play("static", { vol: 0.45, dur: 1.2 }); }, []);
  return (
    <>
      <div className="log-status ff-status">SIGNAL UNSTABLE · 4F</div>
      <h2 className="holo-h1 ff-glitch mt-1" data-text="You're not supposed to be on this floor.">You&apos;re not supposed to be on this floor.</h2>
      <p className="holo-copy mt-3">The fourth floor was meant to be offices. The money ran out before anyone moved in. There&apos;s no power up here, but the lights work anyway.</p>
      <p className="holo-copy mt-2.5">There&apos;s a desk. A reel-to-reel that shouldn&apos;t run. And a box of tapes that nobody on the crew recorded.</p>
      <div className="holo-lcd mt-5 text-[20px]">RECOVERED FROM THE DESK</div>
      <ul className="ff-tx">
        {TRANSMISSIONS.map(([id, line]) => (
          <li key={id}><b>{id}</b><span>{line}</span></li>
        ))}
      </ul>
      <div className="ff-item">
        <div className="holo-lcd text-[22px] text-[var(--ls-orange)]">E1 · FOURTH FLOOR TAPE</div>
        <p className="holo-copy mt-1.5">Four copies in the box. Unlabelled, except for a frequency nobody broadcasts on. Not in the machine. Not yet.</p>
        <Link to="/$view" params={{ view: "join" }} className="holo-link">Tell me when it surfaces →</Link>
      </div>
      <p className="holo-copy mt-5 ff-out">Leave the way you came. Don&apos;t tell the crew. <Link to="/$view" params={{ view: "night-log" }} className="holo-link">Back to the Night Log →</Link></p>
    </>
  );
}

export function PageView({ name }: { name: PageName }) {
  if (name === "fourth-floor") return <FourthFloor />;
  if(name==="rooftop-session")return <RooftopSession/>;
  if (name === "station") return <Station />;
  if (name === "night-log") return <NightLog />;
  if (name === "request-line") return <RequestLine />;
  if (name === "join") return <Join />;
  if (name === "shipping") return <Shipping />;
  return <Privacy />;
}
