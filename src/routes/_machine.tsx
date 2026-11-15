import { createFileRoute, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
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
  const panel = local ?? urlPanel;

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

  const handleAdd = () => {
    const code = store.selected;
    if (!code) {
      store.addToTray({ x: 0, y: 0 }); // flashes "PICK A SLOT FIRST"
      return;
    }
    store.addToTray(slotPos(code), code);
  };

  const cartItems = Object.entries(store.cart).flatMap(([code, qty]) =>
    Array.from({ length: qty }, () => code),
  );

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <MachineStage mode={mode} row={row} rattle={rattle}>
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
        />
        <Lcd text={store.lcdText} />
        <Keypad selected={store.selected} available={store.available} onSelect={pick} />
        <MachineButtons onAdd={handleAdd} onSave={store.toggleSave} onClear={close} />
        <PickupTray items={cartItems} onOpen={openCart} />
        <div className="mobile-ticker" style={{ ...MOBILE_TICKER }}>
          <span className="live-dot" aria-hidden />
          {station.text}
        </div>
        {receipt && <ReceiptPaper order={receipt.order} torn={receipt.torn} />}
        {store.faller && <Faller faller={store.faller} onDone={store.completeFall} />}
      </MachineStage>
      <Atmosphere />
      <Beam open={!!panel} />
      <HoloPanel
        panel={panel}
        store={store}
        onClose={close}
        onOpenProduct={openProduct}
        onOpenCart={openCart}
        onAdd={(code, qty) => store.addToTray(slotPos(code), code, qty)}
        email={auth.user?.email ?? null}
        signedIn={!!auth.user}
        onSignIn={() => openPanel("signin")}
        userName={auth.name}
        cartNote={cartNote}
        onCheckout={() => setLocal({ kind: "checkout" })}
        onRattle={() => setRattle((r) => r + 1)}
        onPrint={printOrder}
        onBuyAgain={buyAgain}
      />
      {receipt && (
        <ReceiptActions
          order={receipt.order}
          show={receipt.done}
          onKeep={() => tear(() => store.flashLcd("THANKS\nNIGHT OWL", 2000))}
          onLeave={() => tear(() => setReceipt(null))}
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
      />
      <Outlet />
    </div>
  );
}
