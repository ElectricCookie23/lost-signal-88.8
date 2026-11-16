import { useEffect, useState } from "react";
import { isRadioOn, onAudioChange, radio } from "@/lib/audio";
import { cn } from "@/lib/utils";

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
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState(false);
  const [i, setI] = useState(0);
  const [flash, setFlash] = useState(false);
  useEffect(() => onAudioChange(() => setOn(isRadioOn())), []);

  const latest = events[0];
  const lines = [
    "NOW PLAYING: Dead Air Vol. 1, Side B",
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
  const text = lines[i % lines.length] ?? lines[0];

  return (
    <div className={cn("pocket", hidden && "is-hidden", on && "is-on", open && "is-open", card && "is-card")} aria-hidden={hidden}>
      <button type="button" className="pocket-fab" aria-label={card ? "Hide radio" : "Show radio"} aria-expanded={card} onClick={() => setCard((c) => !c)}>88.8</button>
      {open && (
        <ul className="pocket-log" aria-label="Last events">
          {events.length ? events.map((e) => <li key={e.id}>{e.text}</li>) : <li>No sales yet tonight.</li>}
        </ul>
      )}
      <div className="pocket-body">
        <div className="pocket-grille" aria-hidden />
        <button type="button" className="pocket-play" aria-label={on ? "Pause station music" : "Play station music"} onClick={() => void radio(!on)}>
          {on ? "❚❚" : "▶"}
        </button>
        <button type="button" className="pocket-read" aria-expanded={open} aria-label="Show last events" onClick={() => setOpen((o) => !o)}>
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
