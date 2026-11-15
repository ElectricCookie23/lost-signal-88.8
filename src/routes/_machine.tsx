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
import { ProductSheet } from "@/components/machine/ProductSheet";
import { HoloPanel, type Panel } from "@/components/holo/HoloPanel";
import { Beam } from "@/components/holo/Beam";
import { TopBar } from "@/components/TopBar";
import { Gate, SignalLost } from "@/components/intro/Gate";
import { StaticOverlay } from "@/components/intro/StaticOverlay";
import { OutOfOrderNote, SignDark } from "@/components/intro/MachineExtras";
import { useOnAir } from "@/hooks/use-on-air";
import { click, fadeOut, humOn, initMute, play, radio, setMuted, unlock, type Voice } from "@/lib/audio";
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
  const navigate = useNavigate();
  const { view } = useParams({ strict: false });
  const urlPanel = parseView(view);
  const [local, setLocal] = useState<Panel | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [kicks, setKicks] = useState(0);
  const [shake, setShake] = useState<{ code: string; tick: number } | null>(null);

  // a URL change (navigation / back button) wins over cart/saved panels
  useEffect(() => setLocal(null), [view]);

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
    try { setVisits(Number(localStorage.getItem("ls888_visits") ?? 0)); } catch { /* blocked */ }
    return clearTimers;
  }, []);
  useEffect(() => { humOn(humming && onAir); }, [humming, onAir]);

  const panel = phase === "on" ? (local ?? urlPanel) : null;

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
  useEffect(() => {
    if (panel) setReceipt(null);
  }, [panel]);
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
    store.clearSelection();
    if (view) navigate({ to: "/" });
  }, [navigate, view, store]);

  const openCart = () => {
    store.clearSelection();
    setLocal({ kind: "cart" });
  };
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
    const r = await placeOrder(store.cart, ship, store.kicked, !!auth.user);
    if (!r.ok) {
      if ("error" in r) return "The machine jammed. Try again.";
      for (const s of r.short) {
        const p = PRODUCT_BY_CODE[s.code];
        if (p) p.stock = s.stock;
        store.setQty(s.code, s.stock);
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
      const k = Math.min(i.qty, store.available(i.code));
      if (k > 0) store.setQty(i.code, (store.cart[i.code] ?? 0) + k);
      if (k < i.qty) missing.push(i.code);
    }
    setLocal({ kind: "cart" });
    setTimeout(() => setCartNote(missing.length ? `Sold out now: ${missing.join(", ")}.` : null), 0);
  };
  /** Fluorescent-tube flicker: [wait, on, off, brightness] steps, then fully lit. */
  const flicker = (pat: number[][], done: () => void) => {
    if (reduced.current) { setBright(1); later(done, 600); return; }
    let t = 0;
    for (const [w = 0, on = 0, off = 0, b = 1] of pat) {
      t += w; later(() => { setBright(b); click(0.3 + b * 0.2); }, t);
      t += on; later(() => setBright(0.08), t);
      t += off;
    }
    later(() => { setBright(1); click(0.6); done(); }, t);
  };
  const FULL = [[400, 70, 380, 0.55], [0, 40, 140, 0.35], [0, 110, 650, 0.8], [0, 50, 90, 0.5], [0, 60, 250, 0.7], [0, 170, 140, 0.9], [0, 40, 420, 0.6]];
  const FAST = [[100, 60, 120, 0.6], [0, 80, 200, 0.85]];

  const boot = (fast: boolean) => {
    clearTimers();
    const v = visits + 1;
    setVisits(v);
    try { localStorage.setItem("ls888_visits", String(v)); } catch { /* blocked */ }
    setPhase("boot"); setLocal(null); setReceipt(null); store.clearSelection();
    setNoteFallen(false); setUiOn(false); setSlotsIn(false); setBarOn(false); setLit(false);
    setBright(0.08); setStaticOp(0); setHazeOn(false);
    const glide = !fast && !reduced.current;
    if (glide) { setIntro(true); later(() => { setCamDur(2.6); setIntro(false); }, 60); }
    else setCamDur(reduced.current ? 0 : 0.9);
    later(() => {
      const tube: Voice | null = play("flicker", { vol: 0.9 });
      flicker(fast ? FAST : FULL, () => {
        fadeOut(tube, 1.4);
        setLit(true); setHumming(true); setHazeOn(true); setNoteFallen(true); click(0.4);
        later(() => {
          setUiOn(true);
          store.flashLcd(v > 1 ? "WELCOME\nBACK" : "HELLO\nNIGHT OWL", 1800);
          const step = fast ? 0.04 : 0.09;
          setDropStep(step); setBootKey((k) => k + 1); setSlotsIn(true);
          for (let i = 3; i < 16; i += 4) later(() => play("drop", { vol: 0.25 }), i * step * 1000 + 250);
          later(() => { setBarOn(true); setPhase("on"); setCamDur(0.9); }, 16 * step * 1000 + 300);
        }, fast ? 200 : 700);
      });
    }, glide ? 2700 : 300);
  };

  const tuneIn = async (slide: () => void) => {
    await unlock();
    setStaticOp(0.35);
    let i = 0;
    const iv = setInterval(() => {
      play("static", { vol: 0.35 + Math.random() * 0.2, off: Math.random() * 0.5, dur: 0.25 });
      if (++i > 6) clearInterval(iv);
    }, 230);
    slide();
    later(() => { setStaticOp(0); boot(false); }, 1800);
  };
  const skipIntro = async () => { await unlock(); boot(true); };

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
    if (!code) { store.addToTray({ x: 0, y: 0 }); return; }
    if (store.available(code) > 0) play("coin", { vol: 0.9 });
    store.addToTray(slotPos(code), code, qty);
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

  const handleAdd = () => addWithCoin(store.selected);

  const lcdText = !onAir && store.lcdText.startsWith("CART ") ? "OFF AIR\nTILL 8PM" : store.lcdText;

  const cartItems = Object.entries(store.cart).flatMap(([code, qty]) =>
    Array.from({ length: qty }, () => code),
  );

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <MachineStage mode={mode} row={row} rattle={rattle} intro={intro} duration={camDur} bright={bright * (onAir ? 1 : 0.4)} uiOn={uiOn} offAir={!onAir}>
        <SignDark visible={!onAir || !lit || glitch} />
        <OutOfOrderNote fallen={noteFallen && onAir} />
        <GlassMenu
          activeRow={row}
          onRow={(r) => navigate({ to: "/$view", params: { view: ROW_SLUGS[r] ?? "tapes" } })}
        />
        <SlotGrid
          selected={store.selected}
          available={store.available}
          onSelect={pick}
          onOpen={setViewing}
          dimRow={row}
          shake={shake}
          ticks={store.ticks}
          loaded={slotsIn}
          step={dropStep}
          bootKey={bootKey}
        />
        <Lcd text={lcdText} />
        <Keypad selected={store.selected} available={store.available} onSelect={pick} />
        <MachineButtons onAdd={handleAdd} onSave={store.toggleSave} onClear={close} />
        <PickupTray items={cartItems} onOpen={openCart} />
        <div className="mobile-ticker" style={{ ...MOBILE_TICKER }}>
          <span className="live-dot" aria-hidden />
          {station.text}
        </div>
        {receipt && <ReceiptPaper order={receipt.order} torn={receipt.torn} />}
        {store.faller && <Faller faller={store.faller} onDone={() => { play("drop", { vol: 0.9 }); store.completeFall(); }} />}
      </MachineStage>
      <Atmosphere haze={hazeOn && onAir} />
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
        lcdText={store.lcdText}
        selected={store.selected}
        isSaved={!!store.selected && store.saved.includes(store.selected)}
        available={store.available}
        onSelect={store.select}
        onAdd={handleAdd}
        onSave={store.toggleSave}
      />
      {viewing && <ProductSheet code={viewing} onClose={() => setViewing(null)} />}
      <TopBar
        cartCount={store.cartCount}
        savedCount={store.saved.length}
        onCart={openCart}
        onSaved={openSaved}
        liveText={station.text}
        userName={auth.name}
        isAdmin={auth.isAdmin}
        onSignIn={() => openPanel("signin")}
        onOrders={() => openPanel("orders")}
        onSignOut={() => void supabase.auth.signOut()}
        hidden={!barOn}
        onAir={onAir}
        onToggleAir={toggleAir}
        onExit={leave}
        muted={muted}
        onSound={toggleSound}
      />
      <Gate
        hidden={phase !== "gate"}
        welcome={visits > 0 ? `Welcome back, night owl.${store.cartCount ? ` Your cart still has ${store.cartCount} item${store.cartCount > 1 ? "s" : ""}.` : ""}` : null}
        onTune={(slide) => void tuneIn(slide)}
        onSkip={() => void skipIntro()}
      />
      <StaticOverlay opacity={staticOp} />
      <SignalLost shown={phase === "lost"} onAgain={() => void again()} />
      <Outlet />
    </div>
  );
}
