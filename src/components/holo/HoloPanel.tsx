import { useEffect, useState } from "react";
import { CALLS, PRODUCT_BY_CODE, ROW_NAMES, cartTotals, type RowLetter } from "@/data/products";
import type { MachineStore } from "@/hooks/use-machine-store";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export type Panel =
  | { kind: "product"; code: string }
  | { kind: "row"; row: number }
  | { kind: "cart" }
  | { kind: "saved" }
  | { kind: "signin" }
  | { kind: "orders" };

interface HoloPanelProps {
  panel: Panel | null;
  store: MachineStore;
  onClose: () => void;
  onOpenProduct: (code: string) => void;
  onOpenCart: () => void;
  onAdd: (code: string, qty: number) => void;
  email?: string | null | undefined;
  signedIn?: boolean;
  onSignIn?: (() => void) | undefined;
}

function NotifyMe({ code, email }: { code: string; email?: string | null | undefined }) {
  const [value, setValue] = useState(email ?? "");
  const [state, setState] = useState<"idle" | "busy" | "done" | "err">("idle");
  useEffect(() => {
    setValue(email ?? "");
    setState("idle");
  }, [code, email]);
  if (state === "done") return <div className="holo-stock ok">● You're on the list for {code}.</div>;
  return (
    <form
      className="holo-acts holo-notify"
      onSubmit={async (e) => {
        e.preventDefault();
        const v = value.trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) || v.length > 254) {
          setState("err");
          return;
        }
        setState("busy");
        const { error } = await supabase.from("restock_alerts").insert({ email: v, code });
        setState(error ? "err" : "done");
      }}
    >
      <input
        className="holo-input"
        type="email"
        placeholder="you@email.com"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Email for restock alert"
      />
      <button type="submit" className="btn-primary holo-add" disabled={state === "busy"}>
        Notify me<span className="holo-sub">when it's back</span>
      </button>
      {state === "err" && <div className="holo-toast w-full">Check that email and try again.</div>}
    </form>
  );
}

function SignInView() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "err">("idle");
  const [msg, setMsg] = useState("");
  return (
    <>
      <div className="holo-lcd text-[20px]">LISTENER LIST</div>
      <h2 className="holo-h1">Get on the list.</h2>
      <div className="holo-dash" />
      {state === "sent" ? (
        <p className="holo-copy mt-3.5">Link sent to {email}. Open it on this device to tune in.</p>
      ) : (
        <form
          className="holo-signin"
          onSubmit={async (e) => {
            e.preventDefault();
            const v = email.trim();
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
              setState("err");
              setMsg("That doesn't look like an email.");
              return;
            }
            setState("busy");
            const { error } = await supabase.auth.signInWithOtp({
              email: v,
              options: { emailRedirectTo: window.location.origin },
            });
            if (error) {
              setState("err");
              setMsg(error.message);
            } else setState("sent");
          }}
        >
          <input
            className="holo-input"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
            autoFocus
          />
          <button type="submit" className="btn-primary holo-add" disabled={state === "busy"}>
            {state === "busy" ? "Sending…" : "Send magic link"}
          </button>
          <p className="holo-copy">We'll email you a link. No passwords, no spam.</p>
          {state === "err" && <div className="holo-toast">{msg}</div>}
        </form>
      )}
    </>
  );
}

interface OrderRow {
  order_no: string;
  total: number;
  status: string;
  created_at: string;
}

function OrdersView({ signedIn, onSignIn }: { signedIn: boolean; onSignIn?: (() => void) | undefined }) {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  useEffect(() => {
    if (!signedIn) return;
    supabase
      .from("orders")
      .select("order_no, total, status, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders(data ?? []));
  }, [signedIn]);
  return (
    <>
      <h2 className="holo-h1">Orders</h2>
      <div className="holo-dash" />
      {!signedIn ? (
        <>
          <p className="holo-copy my-3.5">Sign in to see your orders.</p>
          <button type="button" className="btn-secondary holo-big" onClick={onSignIn}>Sign in</button>
        </>
      ) : orders == null ? (
        <p className="holo-lcd mt-3.5">LOADING…</p>
      ) : orders.length === 0 ? (
        <p className="holo-copy mt-3.5">No orders yet. The tray is waiting.</p>
      ) : (
        orders.map((o) => (
          <div key={o.order_no} className="holo-line">
            <div className="holo-line-name">
              {o.order_no}
              <small>{new Date(o.created_at).toLocaleDateString()} · {o.status.toUpperCase()}</small>
            </div>
            <span className="holo-line-total">QAR {o.total}</span>
          </div>
        ))
      )}
    </>
  );
}

function StockLine({ code, store }: { code: string; store: MachineStore }) {
  const p = PRODUCT_BY_CODE[code];
  const n = store.available(code);
  const inCart = store.cart[code] ?? 0;
  if (!p || p.stock === 0) return <div className="holo-stock none">● Sold out. Back when the DJ finds more.</div>;
  if (n === 0) return <div className="holo-stock low">● Every last one is in your cart.</div>;
  return (
    <div className={cn("holo-stock", n <= 3 ? "low" : "ok")}>
      ● {n <= 3 ? `Only ${n} left` : `${n} in stock`}
      {inCart ? ` · ${inCart} in your cart` : ""}
    </div>
  );
}

function ProductList({ codes, store, onOpen }: { codes: string[]; store: MachineStore; onOpen: (c: string) => void }) {
  return (
    <div className="holo-list">
      {codes.map((c) => {
        const p = PRODUCT_BY_CODE[c];
        if (!p) return null;
        const n = store.available(c);
        return (
          <button key={c} type="button" className="holo-list-item" onClick={() => onOpen(c)}>
            <img src={`/products/${c}.jpg`} alt="" />
            <span className="holo-list-text">
              <span className="holo-lcd">
                {c} · {n === 0 ? (p.stock > 0 ? "IN CART" : "SOLD OUT") : n <= 3 ? `${n} LEFT` : `${n} IN`}
              </span>
              <span className="holo-list-name">{p.name}</span>
            </span>
            <span className="holo-price sm">QAR {p.price}</span>
          </button>
        );
      })}
    </div>
  );
}

function ProductView({ code, store, onAdd, onOpenCart, email }: { code: string; store: MachineStore; onAdd: HoloPanelProps["onAdd"]; onOpenCart: () => void; email?: string | null | undefined }) {
  const p = PRODUCT_BY_CODE[code];
  const [qty, setQty] = useState(1);
  const [photo, setPhoto] = useState<"main" | "hover">("main");
  const [added, setAdded] = useState(false);
  useEffect(() => {
    setQty(1);
    setPhoto("main");
    setAdded(false);
  }, [code]);
  if (!p) return null;
  const avail = store.available(code);
  const saved = store.saved.includes(code);
  const calls = CALLS[code] ?? [];
  const src = photo === "main" ? `/products/${code}.jpg` : `/hover/${code}.jpg`;
  return (
    <>
      <div className="holo-lcd holo-code">{code}</div>
      <h2 className="holo-h1">{p.name}</h2>
      <div className="holo-price-row">
        <span className="holo-price">QAR {p.price}</span>
        {p.tag && <span className="holo-pill">{p.tag.toUpperCase()}</span>}
      </div>
      <StockLine code={code} store={store} />
      <div className="holo-gal">
        <img className="holo-gal-main" src={src} alt={p.name} />
        <div className="holo-gal-th">
          {(["main", "hover"] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={cn(photo === k && "is-on")}
              aria-label={k === "main" ? "Product photo" : "In the wild"}
              onClick={() => setPhoto(k)}
            >
              <img src={k === "main" ? `/products/${code}.jpg` : `/hover/${code}.jpg`} alt="" />
            </button>
          ))}
        </div>
      </div>
      <p className="holo-copy">{p.description}</p>
      {p.stock === 0 ? (
        <>
          <NotifyMe code={code} email={email} />
          <div className="holo-acts">
            <button type="button" className="btn-secondary holo-save" onClick={() => store.toggleSave(code)}>
              {saved ? "♥ SAVED" : "♡ SAVE"}
            </button>
          </div>
        </>
      ) : (
      <div className="holo-acts">
        <div className="holo-qty">
          <button type="button" aria-label="Less" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
          <span>{Math.min(qty, Math.max(1, avail))}</span>
          <button type="button" aria-label="More" disabled={qty >= avail} onClick={() => setQty((q) => Math.min(avail, q + 1))}>+</button>
        </div>
        <button
          type="button"
          className="btn-primary holo-add"
          disabled={avail === 0}
          onClick={() => {
            onAdd(code, Math.min(qty, avail));
            setAdded(true);
            setQty(1);
          }}
        >
          {avail || p.stock > 0 ? "Add to cart" : "Sold out"}
          <span className="holo-sub">drops into the tray</span>
        </button>
        <button type="button" className="btn-secondary holo-save" onClick={() => store.toggleSave(code)}>
          {saved ? "♥ SAVED" : "♡ SAVE"}
        </button>
      </div>
      )}
      <div className="holo-toast">
        {added && !store.faller && (
          <>
            Added to cart.{" "}
            <button type="button" className="holo-link" onClick={onOpenCart}>
              View cart ({store.cartCount}) →
            </button>
          </>
        )}
      </div>
      {calls.length > 0 && (
        <div className="holo-calls">
          {calls.map(([t, q]) => (
            <p key={t}>
              <b>CALLER FROM {t.toUpperCase()}</b>
              <br />"{q}"
            </p>
          ))}
        </div>
      )}
    </>
  );
}

function CartView({ store, onClose }: { store: MachineStore; onClose: () => void }) {
  const [toast, setToast] = useState("");
  const lines = Object.entries(store.cart);
  if (!lines.length) {
    return (
      <>
        <h2 className="holo-h1">Your cart</h2>
        <div className="holo-dash" />
        <p className="holo-copy my-3.5">Your cart is empty. The machine is full. Do something about it.</p>
        <button type="button" className="btn-secondary holo-big" onClick={onClose}>
          Back to the machine
        </button>
      </>
    );
  }
  const { subtotal, discount, total } = cartTotals(store.cart, store.kicked);
  const goneBeaten = Object.keys(store.beaten).filter((c) => !store.cart[c]);
  return (
    <>
      <h2 className="holo-h1">Your cart</h2>
      <div className="holo-lcd text-[18px]">LOST SIGNAL 88.8 · STAIRWELL MACHINE #2</div>
      <div className="holo-dash" />
      {goneBeaten.map((c) => (
        <div key={c} className="holo-beaten">{c} {PRODUCT_BY_CODE[c]?.name}: someone beat you to it. Only 0 left.</div>
      ))}
      {lines.map(([c, n]) => {
        const p = PRODUCT_BY_CODE[c];
        if (!p) return null;
        const more = store.available(c);
        return (
          <div key={c} className="holo-line">
            <img src={`/products/${c}.jpg`} alt="" />
            <div className="holo-line-name">
              {c} {p.name.toUpperCase()}
              <small>
                QAR {p.price} each · {more ? `${more} more available` : "no more in stock"}
              </small>
            </div>
            <div className="holo-qty">
              <button type="button" aria-label="Remove one" onClick={() => store.setQty(c, n - 1)}>−</button>
              <span>{n}</span>
              <button type="button" aria-label="Add one" disabled={!more} onClick={() => store.setQty(c, n + 1)}>+</button>
            </div>
            <span className="holo-line-total">{(p.price * n).toFixed(2)}</span>
            {store.beaten[c] != null && (
              <div className="holo-beaten">Someone beat you to it. Only {store.beaten[c]} left.</div>
            )}
          </div>
        );
      })}
      <div className="holo-sum">
        <div><span>SUBTOTAL</span><span>{subtotal.toFixed(2)}</span></div>
        {store.kicked && (
          <div className="text-[var(--ls-orange)]"><span>KICKIT · 10% OFF</span><span>−{discount.toFixed(2)}</span></div>
        )}
        <div><span>SHIPPING (QATAR)</span><span>FREE</span></div>
        <div className="holo-dash" />
        <div className="holo-total"><span>TOTAL</span><span>QAR {total.toFixed(2)}</span></div>
      </div>
      <div className="holo-acts">
        <button type="button" className="btn-primary holo-add flex-1" onClick={() => setToast("Checkout comes in the next update")}>
          Checkout<span className="holo-sub">insert coins</span>
        </button>
        <button type="button" className="btn-secondary holo-big" onClick={onClose}>Keep shopping</button>
      </div>
      <div className="holo-toast">{toast}</div>
    </>
  );
}

/** The floating hologram panel on the right (desktop). */
export function HoloPanel({ panel, store, onClose, onOpenProduct, onOpenCart, onAdd, email, signedIn = false, onSignIn }: HoloPanelProps) {
  // keep last content while closing so it fades out instead of blanking
  const [shown, setShown] = useState<Panel | null>(panel);
  const [flick, setFlick] = useState(0);
  const key = panel ? JSON.stringify(panel) : "";
  useEffect(() => {
    if (panel) {
      setShown(panel);
      setFlick((f) => f + 1);
      document.getElementById("holo")?.scrollTo(0, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, onClose]);

  const p = shown;
  return (
    <aside
      id="holo"
      key={flick}
      className={cn("holo", panel && "is-on")}
      aria-hidden={!panel}
      aria-label="Product hologram"
    >
      <button type="button" className="holo-x" onClick={onClose} aria-label="Close">
        [X]
      </button>
      {p?.kind === "product" && (
        <ProductView code={p.code} store={store} onAdd={onAdd} onOpenCart={onOpenCart} email={email} />
      )}
      {p?.kind === "row" && (
        <>
          <div className="holo-lcd text-[20px]">ROW {"ABCD"[p.row]}</div>
          <h2 className="holo-h1">{ROW_NAMES[("ABCD"[p.row] ?? "A") as RowLetter]}</h2>
          <ProductList codes={[1, 2, 3, 4].map((i) => `${"ABCD"[p.row]}${i}`)} store={store} onOpen={onOpenProduct} />
        </>
      )}
      {p?.kind === "saved" && (
        <>
          <h2 className="holo-h1">Saved</h2>
          {store.saved.length ? (
            <ProductList codes={store.saved} store={store} onOpen={onOpenProduct} />
          ) : (
            <p className="holo-copy mt-3.5">Nothing saved yet. Pick a slot and hit SAVE on the machine.</p>
          )}
        </>
      )}
      {p?.kind === "cart" && <CartView store={store} onClose={onClose} />}
      {p?.kind === "signin" && <SignInView />}
      {p?.kind === "orders" && <OrdersView signedIn={signedIn} onSignIn={onSignIn} />}
    </aside>
  );
}
