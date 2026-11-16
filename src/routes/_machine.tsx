import { createFileRoute, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMachineStore } from "@/hooks/use-machine-store";
import { useAuth } from "@/hooks/use-auth";
import { useStation } from "@/hooks/use-station";
import { supabase } from "@/integrations/supabase/client";
import { claimGuestOrders, placeOrder, type Order, type Shipping } from "@/lib/orders";
import { ReceiptPaper } from "@/components/receipt/ReceiptPaper";
import { ReceiptActions } from "@/components/receipt/ReceiptActions";
import { MachineStage } from "@/components/machine/MachineStage";
import { GlassMenu } from "@/components/machine/GlassMenu";
import { SlotGrid } from "@/components/machine/SlotGrid";
import { Keypad } from "@/components/machine/Keypad";
import { Lcd } from "@/components/machine/Lcd";
import { MachineButtons } from "@/components/machine/MachineButtons";
import { PickupTray } from "@/components/machine/PickupTray";
import { Faller } from "@/components/machine/Faller";
import { Atmosphere } from "@/components/machine/Atmosphere";
import { MobileDock } from "@/components/machine/MobileDock";
import { Navigator } from "@/components/nav/Navigator";
import { Footer } from "@/components/nav/Footer";
import { PAGE_SLUGS, type PageName } from "@/data/pages";
import { HoloPanel, type Panel } from "@/components/holo/HoloPanel";
import { Beam } from "@/components/holo/Beam";
import { TopBar } from "@/components/TopBar";
import { Gate, SignalLost } from "@/components/intro/Gate";
import { PocketRadio } from "@/components/intro/PocketRadio";
import { LiveStrip } from "@/components/intro/LiveStrip";
import { useClock } from "@/hooks/use-clock";
import { readLine,lineKey,SIZES } from "@/lib/shopping";
import { Button } from "@/components/ui/button";
import { useWeather } from "@/hooks/use-weather";
import { GlassWeather } from "@/components/machine/GlassWeather";
import { useListenerCard } from "@/hooks/use-listener-card";
import { fetchOrders } from "@/lib/orders";
import { StaticOverlay } from "@/components/intro/StaticOverlay";
import { OutOfOrderNote, SignDark } from "@/components/intro/MachineExtras";
import { useOnAir } from "@/hooks/use-on-air";
import { click, fadeOut, humOn, humSpatial, initMute, lockIn, play, radio, setMuted, tunerStop, unlock, type Voice } from "@/lib/audio";
import { Flashlight } from "@/components/intro/Flashlight";
import { BROWNOUT_KEY, Line2, PowerCut } from "@/components/intro/NightEvents";
import { secretMatch } from "@/lib/secret";
import { PRODUCT_BY_CODE, ROW_SLUGS } from "@/data/products";
import { MOBILE_TICKER, SLOT_COLS, SLOT_ROWS, type CameraMode } from "@/lib/machine-layout";

export const Route = createFileRoute("/_machine")({
  component: Machine,
});

/** Parse a URL segment (/tapes, /b1 …) into a hologram view. */
export function parseView(view: string | undefined): Panel | null {
  if (!view) return null;
  const v = view.toLowerCase();
  const row = (ROW_SLUGS as readonly string[]).indexOf(v);
  if (row >= 0) return { kind: "row", row };
  if ((PAGE_SLUGS as string[]).includes(v)) return { kind: "page", name: v as PageName };
  const code = v.toUpperCase();
  if (PRODUCT_BY_CODE[code]) return { kind: "product", code };
  return null;
}

function slotPos(code: string) {
  const r = "ABCD".indexOf(code[0] ?? "");
  const c = Number(code[1]) - 1;
  return { x: (SLOT_COLS[c] ?? 0) + 11, y: (SLOT_ROWS[r] ?? 0) + 9 };
}

const isMobile = () => typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches;

function Machine() {
  const auth = useAuth();
  const store = useMachineStore(auth.user?.id ?? null);
  const station = useStation();
  const clock=useClock();
  const weather=useWeather();
  const listenerCard=useListenerCard(!!auth.user,auth.user?.created_at);
  const [lastProduct,setLastProduct]=useState<string|null>(null);
  const [rememberGlow,setRememberGlow]=useState(false);
  const [idle,setIdle]=useState(0);
  const [roulette,setRoulette]=useState<string|null>(null);
  const [mysteryBusy,setMysteryBusy]=useState(false);
  const [mysteryDone,setMysteryDone]=useState(false);
  const mysteryDropPending = useRef(false);
  useEffect(()=>{setMysteryDone(sessionStorage.getItem("ls888_mystery_done")==="1");},[]);
  const navigate = useNavigate();
  const { view, no } = useParams({ strict: false }) as { view?: string; no?: string };
  const urlPanel: Panel | null = no ? { kind: "orders", highlight: no.toUpperCase() } : parseView(view);
  const [local, setLocal] = useState<Panel | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [kicks, setKicks] = useState(0);
  const [shake, setShake] = useState<{ code: string; tick: number } | null>(null);

  // a URL change (navigation / back button) wins over cart/saved panels
  useEffect(() => setLocal(null), [view, no]);

  /* ---------- show: intro, exit, night/day ---------- */
  const air = useOnAir();
  const onAir = air.onAir;
  const airRef = useRef(onAir);
  airRef.current = onAir;
  const [phase, setPhase] = useState<"gate" | "boot" | "on" | "leaving" | "lost">("gate");
  const [intro, setIntro] = useState(false);
  const [camDur, setCamDur] = useState(0.9);
  const [bright, setBright] = useState(0.08);
  const [lit, setLit] = useState(false);
  const [uiOn, setUiOn] = useState(false);
  const [noteFallen, setNoteFallen] = useState(false);
  const [slotsIn, setSlotsIn] = useState(false);
  const [dropStep, setDropStep] = useState(0.09);
  const [bootKey, setBootKey] = useState(0);
  const [barOn, setBarOn] = useState(false);
  const [hazeOn, setHazeOn] = useState(false);
  const [humming, setHumming] = useState(false);
  const [staticOp, setStaticOp] = useState(0);
  const [staticFade, setStaticFade] = useState(0.5);
  const [secret, setSecret] = useState(false);
  const [secretFlash, setSecretFlash] = useState(0);
  const presses = useRef<{ code: string; t: number }[]>([]);
  const [glitch, setGlitch] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [visits, setVisits] = useState(0);
  const reduced = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (f: () => void, ms: number) => { timers.current.push(setTimeout(f, ms)); };
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => {
    setMutedState(initMute());
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      setVisits(Number(localStorage.getItem("ls888_visits") ?? 0));
      setSecret(localStorage.getItem("ls888_secret") === "1");
    } catch { /* blocked */ }
    return clearTimers;
  }, []);
  useEffect(() => { humOn(humming && onAir); }, [humming, onAir]);

  const panel = phase === "on" ? (local ?? urlPanel) : null;
  useEffect(()=>{void fetchOrders(!!auth.user).then(o=>setLastProduct(o[0]?.items.find(i=>!i.bonus)?.code??null));},[auth.user]);
  useEffect(()=>{
    if(phase!=="on")return;
    if(lastProduct){setRememberGlow(true);store.flashLcd(`WELCOME BACK\n${lastProduct} AGAIN?`,3000);const t=setTimeout(()=>setRememberGlow(false),3000);return()=>clearTimeout(t);}
    return undefined;
  },[phase,lastProduct,store.flashLcd]);
  useEffect(()=>{
    if(phase!=="on")return;
    let t1:ReturnType<typeof setTimeout>,t2:ReturnType<typeof setTimeout>;
    const reset=()=>{clearTimeout(t1);clearTimeout(t2);setIdle(0);t1=setTimeout(()=>{setIdle(1);store.flashLcd("STILL THERE?",5000);if(!reduced.current){setGlitch(true);setTimeout(()=>setGlitch(false),150);}},45000);t2=setTimeout(()=>{if(!reduced.current)setIdle(2);},120000);};
    reset();const names=["pointermove","pointerdown","keydown"] as const;names.forEach(n=>window.addEventListener(n,reset));return()=>{clearTimeout(t1);clearTimeout(t2);names.forEach(n=>window.removeEventListener(n,reset));};
  },[phase,store.flashLcd]);

  const { setSelected } = store;
  useEffect(() => {
    if (urlPanel?.kind === "product") setSelected(urlPanel.code);
    else if (urlPanel?.kind === "row") setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const [receipt, setReceipt] = useState<{ order: Order; done: boolean; torn: boolean } | null>(null);
  const [rattle, setRattle] = useState(0);
  const [cartNote, setCartNote] = useState<string | null>(null);
  useEffect(() => {
    if (panel?.kind !== "cart") setCartNote(null);
  }, [panel?.kind]);
  // opening any panel drops a finished receipt
  const openKey = panel ? `${panel.kind}:${"code" in panel ? panel.code : "row" in panel ? panel.row : "name" in panel ? panel.name : ""}` : null;
  useEffect(() => {
    if (openKey) setReceipt(null);
  }, [openKey]);
  useEffect(() => {
    if (auth.user) void claimGuestOrders();
  }, [auth.user]);

  const mode: CameraMode = panel
    ? panel.kind === "row"
      ? "row"
      : "focus"
    : receipt && !receipt.torn
      ? "receipt"
      : "wide";
  const row = panel?.kind === "row" ? panel.row : null;

  const openProduct = useCallback(
    (code: string) => {
      setLocal(null);
      navigate({ to: "/$view", params: { view: code.toLowerCase() } });
    },
    [navigate],
  );

  const close = useCallback(() => {
    setLocal(null);
    setIdle(0);
    setIntro(false);
    setReceipt(null);
    setRoulette(null);
    setCamDur(0.9);
    store.clearSelection();
    if (view || no) navigate({ to: "/" });
  }, [navigate, view, no, store]);

  const openCart = () => {
    store.clearSelection();
    setLocal({ kind: "cart" });
  };
  const goHome = () => { setLocal(null); store.clearSelection(); setNavOpen(false); };
  const openPanel = (kind: "signin" | "orders" | "checkout") => {
    store.clearSelection();
    setLocal({ kind });
  };
  // close the sign-in panel once the magic link lands
  useEffect(() => {
    if (auth.user && local?.kind === "signin") setLocal(null);
  }, [auth.user, local]);
  const printOrder = async (ship: Shipping): Promise<string | null> => {
    // live stock may have already emptied the cart while paying
    if (!Object.keys(store.cart).length) {
      setLocal({ kind: "cart" });
      return null;
    }
    const r = await placeOrder(store.cart, ship, store.kicked, !!auth.user, secret);
    if (!r.ok) {
      if ("error" in r) return "The machine jammed. Try again.";
      for (const s of r.short) {
        for(const key of Object.keys(store.cart))if(readLine(key).code===s.code)store.setQty(key,Math.min(store.cart[key]??0,s.stock));
      }
      setCartNote(
        r.short.map((s) => `Someone beat you to it: ${s.code} only has ${s.stock} left.`).join(" "),
      );
      setLocal({ kind: "cart" });
      return null;
    }
    store.clearCart();
    store.setKicked(false);
    setKicks(0);
    setLocal(null);
    store.clearSelection();
    if (view) navigate({ to: "/" });
    // let the panel close before the camera dives to the slot
    setTimeout(() => {
      setReceipt({ order: r.order, done: false, torn: false });
      setTimeout(() => setReceipt((x) => (x && x.order.id === r.order.id ? { ...x, done: true } : x)), 4200);
    }, 60);
    return null;
  };
  const tear = (after: () => void) => {
    setReceipt((x) => (x ? { ...x, done: false, torn: true } : x));
    setTimeout(after, 700);
  };
  const buyAgain = (o: Order) => {
    const missing: string[] = [];
    for (const i of o.items) {
      if(i.bonus) continue;
      const key=lineKey(i.code,i.size??"");
      const k = Math.min(i.qty, store.available(key));
      if (k > 0) store.setQty(key, (store.cart[key] ?? 0) + k);
      if (k < i.qty) missing.push(i.code);
    }
    setLocal({ kind: "cart" });
    setTimeout(() => setCartNote(missing.length ? `Sold out now: ${missing.join(", ")}.` : null), 0);
  };
  /** Fluorescent-tube flicker: [wait, on, off, brightness] steps, then fully lit. */
  const flicker = (pat: number[][], done: () => void, dimTo = 0.08) => {
    if (reduced.current) { setBright(1); later(done, 600); return; }
    let t = 0;
    for (const [w = 0, on = 0, off = 0, b = 1] of pat) {
      t += w; later(() => { setBright(b); click(0.3 + b * 0.2); }, t);
      t += on; later(() => setBright(dimTo), t);
      t += off;
    }
    later(() => { setBright(1); click(0.6); done(); }, t);
  };
  // ~1.5s, seven uneven flashes
  const FULL = [[120, 50, 160, 0.55], [0, 30, 70, 0.35], [0, 80, 280, 0.8], [0, 40, 60, 0.5], [0, 45, 120, 0.7], [0, 110, 80, 0.9], [0, 30, 170, 0.6]];
  const FAST = [[100, 60, 120, 0.6], [0, 80, 200, 0.85]];

  const boot = (fast: boolean) => {
    clearTimers();
    const v = visits + 1;
    setVisits(v);
    try { localStorage.setItem("ls888_visits", String(v)); } catch { /* blocked */ }
    setPhase("boot"); setLocal(null); setReceipt(null); store.clearSelection();
    setNoteFallen(false); setUiOn(false); setSlotsIn(false); setBarOn(false); setLit(false);
    setBright(fast ? 0.08 : 0.25); setHazeOn(false);
    if (fast) setStaticOp(0);
    const glide = !fast && !reduced.current;
    if (glide) { setIntro(true); later(() => { setCamDur(1.8); setIntro(false); }, 60); }
    else setCamDur(reduced.current ? 0 : 0.9);
    later(() => {
      const tube: Voice | null = play("flicker", { vol: 0.9 });
      flicker(fast ? FAST : FULL, () => {
        fadeOut(tube, 1.4);
        setLit(true); setHumming(true); setHazeOn(true); setNoteFallen(true); click(0.4);
        {
          setUiOn(true);
          store.flashLcd(v > 1 ? "WELCOME\nBACK" : "HELLO\nNIGHT OWL", 1800);
          const step = fast ? 0.04 : 0.09;
          setDropStep(step); setBootKey((k) => k + 1); setSlotsIn(true);
          for (let i = 3; i < 16; i += 4) later(() => play("drop", { vol: 0.25 }), i * step * 1000 + 250);
          setBarOn(true);
          later(() => { setPhase("on"); setCamDur(0.9); }, 16 * step * 1000 + 300);
        }
      }, fast ? 0.08 : 0.25);
    }, glide ? 1900 : 300);
  };

  /** 88.8 locked (dial or button): snap, static floods to 100% for 0.4s, then the corridor fades in through it. */
  const tuneIn = async () => {
    await unlock();
    lockIn();
    setStaticFade(0.2); setStaticOp(1);
    later(() => { boot(false); setStaticFade(1.4); setStaticOp(0); }, 600);
  };
  const skipIntro = async () => { await unlock(); tunerStop(); boot(true); };

  const leave = () => {
    if (phase !== "on") return;
    clearTimers();
    setPhase("leaving"); setLocal(null); store.clearSelection(); setReceipt(null);
    if (view) navigate({ to: "/" });
    void radio(false); setHumming(false); setHazeOn(false); setBarOn(false); setLit(false);
    if (reduced.current) setBright(0.08);
    else {
      let t = 0;
      for (let k = 0; k < 5; k++) {
        const b = 0.25 + Math.random() * 0.45;
        later(() => setBright(b), t); t += 50 + k * 15;
        later(() => setBright(0.12), t); t += 60 + Math.random() * 60;
      }
      later(() => setBright(0.08), t);
    }
    later(() => { setNoteFallen(false); setUiOn(false); setSlotsIn(false); setStaticOp(0.45); play("static", { vol: 0.6 }); }, 1100);
    later(() => { setPhase("lost"); setStaticOp(0.18); }, 1600);
  };
  const again = async () => { await unlock(); boot(true); };

  const toggleAir = () => {
    const next = !onAir;
    if (reduced.current || phase !== "on") { air.set(next); return; }
    flicker(FAST, () => air.set(next));
  };
  const toggleSound = () => { void unlock(); const m = !muted; setMuted(m); setMutedState(m); };

  // sign glitch: every 3–8s on air, the glow drops out 1–3 times
  useEffect(() => {
    if (phase !== "on" || !onAir || reduced.current) return;
    let t: ReturnType<typeof setTimeout>;
    const sched = () => {
      t = setTimeout(() => {
        const n = 1 + Math.floor(Math.random() * 3);
        let at = 0;
        for (let k = 0; k < n; k++) {
          const d = 50 + Math.random() * 90;
          setTimeout(() => setGlitch(true), at); at += d;
          setTimeout(() => setGlitch(false), at); at += 40 + Math.random() * 120;
        }
        if (Math.random() < 0.4) play("neon", { vol: 0.15, off: Math.random(), dur: 0.12 });
        sched();
      }, 3000 + Math.random() * 5000);
    };
    sched();
    return () => clearTimeout(t);
  }, [phase, onAir]);

  // keypad beep on every UI click (gate buttons excluded)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const b = (e.target as HTMLElement | null)?.closest("button");
      if (b && !b.closest(".gate") && !b.disabled) play("beep", { vol: 0.55 });
    };
    document.addEventListener("click", h, true);
    return () => document.removeEventListener("click", h, true);
  }, []);
  // low static whenever a hologram view opens or changes
  const panelKey = panel ? `${panel.kind}:${"code" in panel ? panel.code : "row" in panel ? panel.row : ""}` : null;
  useEffect(() => {
    if (panelKey) play("static", { vol: 0.18, off: Math.random() * 0.5, dur: 0.35 });
  }, [panelKey]);
  // rattle on sold out
  useEffect(() => {
    if (store.lcdText.includes("SOLD OUT") && !store.selected) play("rattle", { vol: 0.6 });
  }, [store.lcdText]); // eslint-disable-line react-hooks/exhaustive-deps
  // printer clicks while the receipt feeds out
  const printing = receipt && !receipt.done && !receipt.torn ? receipt.order.id : null;
  useEffect(() => {
    if (!printing) return;
    let n = 0;
    const iv = setInterval(() => { click(0.3); if (++n > 28) clearInterval(iv); }, 115);
    return () => clearInterval(iv);
  }, [printing]);

  const addWithCoin = (code: string | null, qty = 1) => {
    if(code && SIZES[readLine(code).code] && !readLine(code).size){openProduct(readLine(code).code);return;}
    if (!code) { store.addToTray({ x: 0, y: 0 }); return; }
    if (store.available(code) > 0) play("coin", { vol: 0.9 });
    store.addToTray(slotPos(readLine(code).code === "KIT" ? "B1" : readLine(code).code), code, qty);
  };

  const openSaved = () => {
    store.clearSelection();
    setLocal({ kind: "saved" });
  };

  /** Slot click or keypad press. C4 is jammed until kicked three times. */
  const pick = (code: string) => {
    const p = PRODUCT_BY_CODE[code];
    if (code === "C4" && !store.kicked && p && p.stock > 0) {
      const k = kicks + 1;
      setKicks(k);
      setShake((s) => ({ code, tick: (s?.tick ?? 0) + 1 }));
      play("rattle", { vol: 0.8 });
      if (k < 3) {
        store.flashLcd(k === 1 ? "C4 IS\nJAMMED" : "KICK IT\nAGAIN", 1600);
        return;
      }
      store.setKicked(true);
      store.setSelected(code);
      store.flashLcd("FREED!\n10% OFF", 2600);
      if (!isMobile()) openProduct(code);
      return;
    }
    if (isMobile()) {
      store.select(code);
      return;
    }
    store.setSelected(code);
    openProduct(code);
  };

  /** Keypad presses: D4 · A1 · D4 within 6s unlocks a free D1 with every order. */
  const keypadPress = (code: string) => {
    const now = Date.now();
    presses.current = [...presses.current, { code, t: now }].slice(-3);
    if (secretMatch(presses.current)) {
      presses.current = [];
      setSecret(true);
      try { localStorage.setItem("ls888_secret", "1"); } catch { /* blocked */ }
      store.flashLcd("SIGNAL\nFOUND", 1500);
      later(() => { setSecretFlash((n) => n + 1); play("static", { vol: 0.6, off: Math.random() * 0.4, dur: 0.9 }); }, 250);
      later(() => store.flashLcd("FREE D1\nWITH ORDER", 3200), 1600);
      return;
    }
    pick(code);
  };

  // neon hum follows the cursor: panned by x, louder near the sign
  useEffect(() => {
    if (!humming) return;
    let last = 0;
    const h = (e: PointerEvent) => {
      const now = performance.now();
      if (now - last < 50) return;
      last = now;
      const r = document.querySelector(".sign-dark")?.getBoundingClientRect();
      let near = 0;
      if (r) {
        const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
        const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
        near = 1 - Math.min(1, Math.hypot(dx, dy) / (window.innerHeight * 0.5));
      }
      humSpatial(e.clientX / window.innerWidth, near);
    };
    window.addEventListener("pointermove", h);
    window.addEventListener("pointerdown", h);
    return () => { window.removeEventListener("pointermove", h); window.removeEventListener("pointerdown", h); };
  }, [humming]);

  const handleAdd = () => addWithCoin(store.selected);

  const lcdText = clock.alternate && clock.dead ? "DEAD HOURS\n15% OFF" : clock.alternate && !onAir ? `RESTOCK IN\n${clock.countdown}` : store.lcdText;
  const mysteryBuy=async()=>{
    if(mysteryBusy||mysteryDone)return;setMysteryBusy(true);play("coin",{vol:.9});
    try{let visit=sessionStorage.getItem("ls888_mystery_visit");if(!visit){visit=crypto.randomUUID();sessionStorage.setItem("ls888_mystery_visit",visit);}
      const {data,error}=await supabase.rpc("mystery_drop",{p_visit:visit});if(error)throw error;
      const m=data as {id:string;code:string;size:string|null;used:boolean};if(m.used){setMysteryDone(true);setMysteryBusy(false);store.flashLcd("ONE COIN\nPER VISIT");later(close,600);return;}
      for(let i=0;i<24;i++)later(()=>setRoulette(`${"ABCD"[Math.floor((i%16)/4)]}${i%4+1}`),Math.round(3000*(i/24)**1.6));
      later(()=>{setRoulette(null);const key=lineKey(m.code,m.size??"",m.id);if(store.available(key)<=0){setMysteryBusy(false);close();store.flashLcd("SOLD OUT\nTRY AGAIN");return;}mysteryDropPending.current=true;addWithCoin(key);sessionStorage.setItem("ls888_mystery_done","1");setMysteryDone(true);later(()=>{if(mysteryDropPending.current){mysteryDropPending.current=false;setMysteryBusy(false);close();}},2500);},3000);
    }catch{store.flashLcd("NO SIGNAL\nTRY AGAIN");setMysteryBusy(false);setRoulette(null);later(close,600);}
  };

  const cartItems = Object.entries(store.cart).flatMap(([code, qty]) =>
    Array.from({ length: qty }, () => readLine(code).code === "KIT" ? "B1" : readLine(code).code),
  );

  return (
    <div className={`min-h-screen overflow-hidden bg-background text-foreground${navOpen ? " nav-dim" : ""}${panel ? " has-panel" : ""}`}>
      <MachineStage mode={mode} row={row} rattle={rattle} intro={intro} duration={idle===2?0:camDur} idlePan={idle===2&&!panel} bright={bright * (onAir || phase === "on" || phase === "boot" ? 1 : 0.4)} uiOn={uiOn} offAir={!onAir}>
        <SignDark visible={!onAir || !lit || glitch} />
        <OutOfOrderNote fallen={noteFallen && onAir} active={phase === "on" && !onAir} />
        <GlassMenu
          activeRow={row}
          onRow={(r) => navigate({ to: "/$view", params: { view: ROW_SLUGS[r] ?? "tapes" } })}
          onPage={(v) => navigate({ to: "/$view", params: { view: v } })}
        />
        <SlotGrid
          selected={roulette??(rememberGlow?lastProduct:null)??store.selected}
          available={store.available}
          onSelect={pick}
          onOpen={openProduct}
          dimRow={row}
          shake={shake}
          ticks={store.ticks}
          loaded={slotsIn}
          step={dropStep}
          bootKey={bootKey}
          tipKey={`${mode}:${row}:${panel?.kind ?? ""}:${receipt ? 1 : 0}`}
        />
        <GlassWeather weather={weather}/>
        <Lcd text={lcdText} onClick={lastProduct?()=>openProduct(lastProduct):undefined}/>
        <Button variant="ghost" className="kit-strip" onClick={()=>navigate({to:"/$view",params:{view:"night-shift-kit"}})}><strong>NIGHT SHIFT KIT</strong><span>HOODIE + TAPE + RADIO · QAR 349 · SAVE 65</span></Button>
        <Button variant="ghost" className="kit-strip kit-mobile" onClick={()=>navigate({to:"/$view",params:{view:"night-shift-kit"}})}>NIGHT SHIFT KIT · 3 FOR QAR 349 · SAVE 65</Button>
        <Button variant="ghost" className="coin-slot" aria-label="Insert coin · Mystery drop" title="INSERT COIN · MYSTERY DROP" disabled={mysteryBusy||mysteryDone} onClick={()=>void mysteryBuy()}/>
        <Keypad selected={store.selected} available={store.available} onSelect={keypadPress} />
        <MachineButtons onAdd={handleAdd} onSave={store.toggleSave} onClear={close} />
        <PickupTray items={cartItems} onOpen={openCart} />
        <div className="mobile-ticker" style={{ ...MOBILE_TICKER }}>
          <span className="live-dot" aria-hidden />
          {station.text}
        </div>
        {receipt && <ReceiptPaper order={receipt.order} torn={receipt.torn} />}
        {store.faller && <Faller faller={store.faller} onDone={() => { play("drop", { vol: 0.9 }); store.completeFall(); if(mysteryDropPending.current){mysteryDropPending.current=false;setMysteryBusy(false);close();} }} />}
      </MachineStage>
      <Atmosphere haze={hazeOn && onAir} />
      <Flashlight active={!onAir && (phase === "on" || phase === "boot")} />
      <div key={secretFlash} className={`secret-flash${secretFlash ? " is-on" : ""}`} aria-hidden />
      <Beam open={!!panel} />
      <HoloPanel
        panel={panel}
        store={store}
        onClose={close}
        onOpenProduct={openProduct}
        onOpenCart={openCart}
        onAdd={(code, qty) => addWithCoin(code, qty)}
        email={auth.user?.email ?? null}
        signedIn={!!auth.user}
        onSignIn={() => openPanel("signin")}
        userName={auth.name}
        cartNote={cartNote}
        onCheckout={() => setLocal({ kind: "checkout" })}
        onRattle={() => { setRattle((r) => r + 1); play("rattle", { vol: 0.7 }); }}
        onPrint={printOrder}
        onBuyAgain={buyAgain}
        listenerSince={auth.user?.created_at}
      />
      {receipt && (
        <ReceiptActions
          order={receipt.order}
          show={receipt.done}
          onKeep={() => tear(() => store.flashLcd("THANKS\nNIGHT OWL", 2000))}
          onLeave={() => tear(() => { setReceipt(null); leave(); })}
        />
      )}
      <MobileDock
        lcdText={lcdText}
        selected={store.selected}
        isSaved={!!store.selected && store.saved.includes(store.selected)}
        available={store.available}
        onSelect={store.select}
        onAdd={handleAdd}
        onSave={store.toggleSave}
      />

      <TopBar
        cartCount={store.cartCount}
        savedCount={store.saved.length}
        onCart={openCart}
        onSaved={openSaved}
        onMenu={() => setNavOpen(true)}
        menuOpen={navOpen}
        onHome={goHome}
        hidden={!barOn}
        onAir={onAir}
        showLights={!air.real && !onAir}
        onLights={toggleAir}
      />
      <Footer hidden={!barOn} onOrders={() => openPanel("orders")} onJoin={() => { store.clearSelection(); setLocal({ kind: "page", name: "join" }); }} />
      <Navigator
        open={navOpen && phase === "on"}
        onClose={() => setNavOpen(false)}
        onHome={goHome}
        onCart={openCart}
        onSaved={openSaved}
        onOrders={() => openPanel("orders")}
        onSignIn={() => openPanel("signin")}
        onSignOut={() => void supabase.auth.signOut()}
        onSound={toggleSound}
        onToggleAir={toggleAir}
        onExit={leave}
        onJoin={() => { store.clearSelection(); setLocal({ kind: "page", name: "join" }); }}
        cartCount={store.cartCount}
        savedCount={store.saved.length}
        available={store.available}
        userName={auth.name}
        listenerCard={listenerCard}
        isAdmin={auth.isAdmin}
        muted={muted}
        onAir={onAir}
      />
      <PocketRadio hidden={!barOn} listeners={station.listeners} events={station.events} />
      <Line2
        active={barOn && onAir && phase === "on"}
        onReveal={() => store.flashLcd("D4 · A1 · D4\nTRY IT", 7000)}
        onMissed={() => store.flashLcd("MISSED CALL\nLINE 2", 3000)}
      />
      <PowerCut
        active={barOn && onAir && phase === "on"}
        onRestore={() => {
          // brownout prices ride on the existing 10% "kicked" discount for 60 seconds
          const already = store.kicked;
          store.flashLcd("BROWNOUT\n10% OFF · 60s", 5000);
          if (already) return;
          store.setKicked(true);
          try { localStorage.setItem(BROWNOUT_KEY, String(Date.now() + 60000)); } catch { /* blocked */ }
          later(() => {
            try { localStorage.removeItem(BROWNOUT_KEY); } catch { /* blocked */ }
            store.setKicked(false);
            store.flashLcd("POWER\nSTABLE", 2500);
          }, 60000);
        }}
        onExpire={() => { store.setKicked(false); store.flashLcd("POWER\nSTABLE", 2500); }}
      />
      <LiveStrip hidden={!barOn} listeners={station.listeners} events={station.events} toast={station.toast} onProduct={openProduct} notice={[weather==="rain"?"RAINING IN DOHA · RARE NIGHT":"",clock.dead?"DEAD HOURS · 15% OFF":!onAir?"OFF AIR · BACK AT 8PM":""].filter(Boolean).join(" ✦ ")} />
      <Gate
        hidden={phase !== "gate"}
        welcome={visits > 0 ? `Welcome back, night owl.${store.cartCount ? ` Your cart still has ${store.cartCount} item${store.cartCount > 1 ? "s" : ""}.` : ""}` : null}
        onLock={() => void tuneIn()}
        onSkip={() => void skipIntro()}
      />
      <StaticOverlay opacity={staticOp} fade={staticFade} />
      <SignalLost shown={phase === "lost"} onAgain={() => void again()} />
      <Outlet />
    </div>
  );
}
