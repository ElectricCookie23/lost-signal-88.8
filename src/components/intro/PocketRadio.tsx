import { useEffect, useState } from "react";
import { currentTrack, currentTrackIndex, isRadioOn, onAudioChange, play, playTrack, radio, skipTrack, TRACKS } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { fetchOrders } from "@/lib/orders";
import { orderStep, TRACKING } from "@/lib/shopping";

/**
 * Bottom-left pocket transistor radio: play/pause for the station music,
 * a rotating ticker line (now playing / listeners / latest event) and,
 * expanded, the last 5 events.
 */
export function PocketRadio({
  hidden,
  listeners,
  events,
}: {
  hidden: boolean;
  listeners: number;
  events: { id: string | number; text: string }[];
}) {
  const [on, setOn] = useState(false);
  const [track, setTrack] = useState(currentTrack().title);
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState(false);
  const [i, setI] = useState(0);
  const [flash, setFlash] = useState(false);
  const [orderLine,setOrderLine]=useState<string|null>(null);
  useEffect(()=>{
    const check=async()=>{const {data}=await supabase.auth.getUser();if(!data.user)return;const orders=await fetchOrders(true);for(const o of orders){const step=orderStep(o.created_at);const key=`ls888_tracking_${o.id}`;const prev=localStorage.getItem(key);localStorage.setItem(key,String(step));if(step>0&&prev!==String(step)){setOrderLine(`YOUR ORDER ${o.order_no} · ${TRACKING[step-1]?.toUpperCase()}`);setTimeout(()=>setOrderLine(null),12000);break;}}};
    void check();const t=setInterval(()=>void check(),60000);return()=>clearInterval(t);
  },[]);
  useEffect(() => onAudioChange(() => { setOn(isRadioOn()); setTrack(currentTrack().title); setIdx(currentTrackIndex()); }), []);

  const [over, setOver] = useState(false);
  const say = (line: string, ms = 5000) => { setOrderLine(line); setTimeout(() => setOrderLine(null), ms); };
  /** A tape dragged from the tray onto the radio. */
  const insertTape = (code: string) => {
    play("static", { vol: 0.3, dur: 0.15 }); // the tape clunks in
    if (code === "A1" || code === "KIT") { playTrack(0); setI(0); say("TAPE IN · DEAD AIR VOL. 1, SIDE B"); return; }
    if (code === "A2") { play("static", { vol: 0.25, dur: 3 }); say("BLANK TAPE. NOTHING ON IT. YET."); return; }
    if (code === "C1") { say("IT'S ALREADY A RADIO."); return; }
    if (code === "D2") { say("PIN IT UP. DON'T PLAY IT."); return; }
    if (code === "C3") { say("PLUG THEM IN SOMEWHERE ELSE."); return; }
    say("THAT'S NOT A TAPE.");
  };

  const latest = events[0];
  const lines = [
    `NOW PLAYING: ${track.toUpperCase()}`,
    `${listeners} ${listeners === 1 ? "LISTENER" : "LISTENERS"} TUNED IN`,
    ...(latest ? [latest.text.toUpperCase()] : []),
  ];
  useEffect(() => {
    const t = setInterval(() => setI((n) => n + 1), 8000);
    return () => clearInterval(t);
  }, []);
  // a new event shows immediately with an orange flash
  useEffect(() => {
    if (!latest) return;
    setI(2);
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1400);
    return () => clearTimeout(t);
  }, [latest?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const text = orderLine ?? lines[i % lines.length] ?? lines[0];

  return (
    <div
      className={cn("pocket", hidden && "is-hidden", on && "is-on", open && "is-open", card && "is-card", over && "is-drop")}
      aria-hidden={hidden}
      onDragOver={(e) => { if (e.dataTransfer.types.includes("text/plain")) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const data = e.dataTransfer.getData("text/plain");
        if (!data.startsWith("ls888:")) return;
        e.preventDefault();
        insertTape(data.slice(6));
      }}
    >
      <button type="button" className="pocket-fab" aria-label={card ? "Hide radio" : "Show radio"} aria-expanded={card} onClick={() => setCard((c) => !c)}>88.8</button>
      {open && (
        <ul className="pocket-log" aria-label="Tracks">
          <li className="pocket-tracks-head">TAPES IN THE DECK</li>
          <li className="pocket-tracks-tip">Got Dead Air in your tray? Drag it onto the radio.</li>
          {TRACKS.map((t, k) => (
            <li key={t.file}>
              <button type="button" className={cn("pocket-track", k === idx && "is-current")} aria-current={k === idx ? "true" : undefined} onClick={() => { playTrack(k); setI(0); }}>
                <span>{String(k + 1).padStart(2, "0")}</span>{t.title}{k === idx && on ? " ▶" : ""}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="pocket-body">
        <div className="pocket-grille" aria-hidden />
        <button type="button" className="pocket-play" aria-label={on ? "Pause station music" : "Play station music"} onClick={() => void radio(!on)}>
          {on ? "❚❚" : "▶"}
        </button>
        <button type="button" className="pocket-play pocket-skip" aria-label="Next track" title="Next track" onClick={() => { skipTrack(1); setI(0); }}>
          ⏭
        </button>
        <button type="button" className="pocket-read" aria-expanded={open} aria-label="Show tracks" onClick={() => setOpen((o) => !o)}>
          <span className="pocket-dial">88.8</span>
          <span className={cn("pocket-line", flash && "is-flash")}>
            <span key={text}>{text}</span>
          </span>
        </button>
        <div className="pocket-meter" aria-hidden>{[0, 1, 2, 3, 4].map((k) => <i key={k} />)}</div>
      </div>
    </div>
  );
}
