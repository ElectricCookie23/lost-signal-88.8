import { useEffect, useState } from "react";
import { isRadioOn, onAudioChange, radio } from "@/lib/audio";
import { cn } from "@/lib/utils";

/** Top-bar radio: play/pause, scrolling now-playing line and a 5-bar level meter. */
export function RadioPlayer() {
  const [on, setOn] = useState(false);
  useEffect(() => onAudioChange(() => setOn(isRadioOn())), []);
  return (
    <div className={cn("radio", on && "is-on")}>
      <button type="button" className="radio-btn" aria-label={on ? "Pause radio" : "Play radio"} onClick={() => void radio(!on)}>
        {on ? "❚❚" : "▶"}
      </button>
      <div className="radio-np"><span>NOW PLAYING: Dead Air Vol. 1, Side B · NOW PLAYING: Dead Air Vol. 1, Side B ·&nbsp;</span></div>
      <div className="radio-meter" aria-hidden>{[0, 1, 2, 3, 4].map((i) => <i key={i} />)}</div>
    </div>
  );
}
