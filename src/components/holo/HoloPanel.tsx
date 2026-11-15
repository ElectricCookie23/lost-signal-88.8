import { useEffect, useState } from "react";
import { CALLS, PRODUCT_BY_CODE, ROW_NAMES, cartTotals, type RowLetter } from "@/data/products";
import type { MachineStore } from "@/hooks/use-machine-store";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { fetchOrders, fmtDate, lastShipping, rememberShipping, type Order, type Shipping } from "@/lib/orders";
import { downloadReceipt } from "@/lib/receipt-pdf";

export type Panel =
  | { kind: "product"; code: string }
  | { kind: "row"; row: number }
  | { kind: "cart" }
  | { kind: "saved" }
  | { kind: "signin" }
  | { kind: "orders" }
  | { kind: "checkout" };

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
  userName?: string | null | undefined;
  cartNote?: string | null | undefined;
  onCheckout?: (() => void) | undefined;
  onRattle?: (() => void) | undefined;
  onPrint?: ((ship: Shipping) => Promise<string | null>) | undefined;
  onBuyAgain?: ((o: Order) => void) | undefined;
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

function OrdersView({ signedIn, onBuyAgain }: { signedIn: boolean; onBuyAgain?: ((o: Order) => void) | undefined }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  useEffect(() => {
    fetchOrders(signedIn).then(setOrders);
  }, [signedIn]);
  return (
    <>
      <h2 className="holo-h1">Your orders</h2>
      <p className="holo-copy mt-1.5 mb-1">Every receipt the machine has printed for you.</p>
      {orders == null ? (
        <p className="holo-lcd mt-3.5">LOADING…</p>
      ) : orders.length === 0 ? (
        <p className="holo-copy mt-3">No orders yet. The machine is waiting.</p>
      ) : (
        orders.map((o) => (
          <div key={o.id} className="holo-order">
            <div className="holo-order-top">
              <span className="holo-lcd">{o.order_no}</span>
              <span>QAR {o.total.toFixed(2)}</span>
            </div>
            <div className="holo-order-meta">
              {fmtDate(o.created_at)} · {(() => { const n = o.items.reduce((a, i) => a + i.qty, 0); return `${n} ${n === 1 ? "item" : "items"}`; })()}
            </div>
            <div className="holo-order-thumbs">
              {o.items.map((i) => (
                <img key={i.code} src={`/products/${i.code}.jpg`} alt={i.name} title={`${i.code} ${i.name}`} />
              ))}
            </div>
            <div className="holo-acts mt-1.5">
              <button type="button" className="btn-secondary holo-big" onClick={() => onBuyAgain?.(o)}>
                Buy again
              </button>
              <button
                type="button"
                className="btn-secondary holo-big"
                onClick={async () => {
                  const m = await downloadReceipt(o);
                  setMsg((x) => ({ ...x, [o.id]: m }));
                }}
              >
                Download receipt
              </button>
              <span className="holo-toast m-0">{msg[o.id] ?? ""}</span>
            </div>
          </div>
        ))
      )}
    </>
  );
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function CheckoutView({
  store,
  email,
  userName,
  onRattle,
  onPrint,
}: {
  store: MachineStore;
  email?: string | null | undefined;
  userName?: string | null | undefined;
  onRattle?: (() => void) | undefined;
  onPrint?: ((ship: Shipping) => Promise<string | null>) | undefined;
}) {
  const [prefill] = useState(() => {
    const last = lastShipping();
    const base: Shipping = { name: "", email: "", address: "", city: "Doha", country: "Qatar" };
    const s = { ...base, ...(last ?? {}) };
    if (email && !last) s.email = email;
    if (userName && !s.name) s.name = userName;
    return { ship: s, welcome: !!last || !!email };
  });
  const [ship, setShip] = useState<Shipping>(prefill.ship);
  const [step, setStep] = useState<1 | 2>(1);
  const [errs, setErrs] = useState<Partial<Record<keyof Shipping, string>>>({});
  const [card, setCard] = useState({ num: "", exp: "", cvc: "" });
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { total } = cartTotals(store.cart, store.kicked);

  const field = (k: keyof Shipping, label: string, type = "text", auto?: string) => (
    <label className="holo-field">
      <span>{label}</span>
      <input
        type={type}
        autoComplete={auto}
        value={ship[k]}
        maxLength={k === "address" ? 200 : 100}
        onChange={(e) => setShip((s) => ({ ...s, [k]: e.target.value }))}
        aria-invalid={!!errs[k]}
      />
      {errs[k] && <em>{errs[k]}</em>}
    </label>
  );

  if (step === 1)
    return (
      <>
        <div className="holo-steps"><b>1 SHIPPING</b> — 2 PAYMENT</div>
        <h2 className="holo-h1 text-[24px]">Where should it go?</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = Object.fromEntries(Object.entries(ship).map(([k, v]) => [k, v.trim()])) as unknown as Shipping;
            const er: typeof errs = {};
            if (t.name.length < 2) er.name = "Who's it for?";
            if (!EMAIL_RE.test(t.email)) er.email = "That email doesn't look right.";
            if (t.address.length < 5) er.address = "We need a street address.";
            if (!t.city) er.city = "City, please.";
            if (!t.country) er.country = "Country, please.";
            setErrs(er);
            if (Object.keys(er).length) return;
            setShip(t);
            rememberShipping(t);
            setStep(2);
          }}
        >
          {field("name", "NAME", "text", "name")}
          {field("email", "EMAIL", "email", "email")}
          {field("address", "ADDRESS", "text", "street-address")}
          <div className="holo-two">
            {field("city", "CITY")}
            {field("country", "COUNTRY")}
          </div>
          <div className="holo-acts">
            <button type="submit" className="btn-primary holo-add flex-1">Continue to payment</button>
          </div>
          {prefill.welcome && (
            <div className="holo-toast text-[var(--ls-glow)]">Welcome back. We kept your details from last time.</div>
          )}
        </form>
      </>
    );

  const fmtNum = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const fmtExp = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };
  return (
    <>
      <div className="holo-steps">1 SHIPPING — <b>2 PAYMENT</b></div>
      <h2 className="holo-h1 text-[24px]">Payment</h2>
      <div className="holo-sum holo-lcd text-[24px] my-1.5">
        <div><span>ORDER TOTAL</span><span>QAR {total.toFixed(2)}</span></div>
      </div>
      <form
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          onRattle?.();
          setPaid(true);
          setCard({ num: "", exp: "", cvc: "" }); // never kept
        }}
      >
        <label className="holo-field">
          <span>CARD NUMBER</span>
          <input inputMode="numeric" placeholder="•••• •••• •••• 4417" required minLength={19} value={card.num}
            onChange={(e) => setCard((c) => ({ ...c, num: fmtNum(e.target.value) }))} />
        </label>
        <div className="holo-two">
          <label className="holo-field">
            <span>EXPIRY (MM/YY)</span>
            <input inputMode="numeric" placeholder="08/28" required pattern="(0[1-9]|1[0-2])/[0-9]{2}" value={card.exp}
              onChange={(e) => setCard((c) => ({ ...c, exp: fmtExp(e.target.value) }))} />
          </label>
          <label className="holo-field">
            <span>CVC</span>
            <input inputMode="numeric" placeholder="•••" required minLength={3} value={card.cvc}
              onChange={(e) => setCard((c) => ({ ...c, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) }))} />
          </label>
        </div>
        <div className="holo-acts">
          <button type="submit" className="btn-primary holo-add flex-1" disabled={paid}>Pay QAR {total.toFixed(2)}</button>
        </div>
        {paid && (
          <div className="holo-toast">
            Payments are off air for now, so nothing was charged. Your items are reserved at the machine.
            <br />
            <br />
            <button
              type="button"
              className="btn-secondary holo-big"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setErr("");
                const m = await onPrint?.(ship);
                setBusy(false);
                if (m) setErr(m);
              }}
            >
              {busy ? "Printing…" : "Print my receipt"}
            </button>
            {err && <div className="mt-2">{err}</div>}
          </div>
        )}
      </form>
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
            <span className="holo-price sm">QAR {p.price.toFixed(2)}</span>
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
        <span className="holo-price">QAR {p.price.toFixed(2)}</span>
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

function CartView({ store, onClose, note, onCheckout }: { store: MachineStore; onClose: () => void; note?: string | null | undefined; onCheckout?: (() => void) | undefined }) {
  const lines = Object.entries(store.cart);
  if (!lines.length) {
    return (
      <>
        <h2 className="holo-h1">Your cart</h2>
        <div className="holo-dash" />
        {note && <div className="holo-beaten">{note}</div>}
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
      {note && <div className="holo-beaten">{note}</div>}
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
                QAR {p.price.toFixed(2)} each · {more ? `${more} more available` : "no more in stock"}
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
        <button type="button" className="btn-primary holo-add flex-1" onClick={onCheckout}>
          Checkout<span className="holo-sub">insert coins</span>
        </button>
        <button type="button" className="btn-secondary holo-big" onClick={onClose}>Keep shopping</button>
      </div>
    </>
  );
}

/** The floating hologram panel on the right (desktop). */
export function HoloPanel({ panel, store, onClose, onOpenProduct, onOpenCart, onAdd, email, signedIn = false, onSignIn, userName, cartNote, onCheckout, onRattle, onPrint, onBuyAgain }: HoloPanelProps) {
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
      {p?.kind === "cart" && <CartView store={store} onClose={onClose} note={cartNote} onCheckout={onCheckout} />}
      {p?.kind === "checkout" && (
        <CheckoutView store={store} email={email} userName={userName} onRattle={onRattle} onPrint={onPrint} />
      )}
      {p?.kind === "signin" && <SignInView />}
      {p?.kind === "orders" && <OrdersView signedIn={signedIn} onBuyAgain={onBuyAgain} />}
    </aside>
  );
}
