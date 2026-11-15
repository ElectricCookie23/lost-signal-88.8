import { supabase } from "@/integrations/supabase/client";

export interface OrderItem {
  code: string;
  name: string;
  price: number;
  qty: number;
}
export interface Shipping {
  name: string;
  email: string;
  address: string;
  city: string;
  country: string;
}
export interface Order {
  id: string;
  order_no: string;
  email: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  shipping: Partial<Shipping>;
  status: string;
  created_at: string;
}

/** Round money to 2 decimals. */
export const money = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** Prefer the 2-decimal amount columns; fall back to the old whole-riyal ones. */
function norm(raw: unknown): Order {
  const o = raw as Order & { subtotal_qar?: number; discount_qar?: number; total_qar?: number };
  return {
    ...o,
    items: (o.items ?? []).map((i) => ({ ...i, price: money(i.price) })),
    subtotal: money(o.subtotal_qar ?? o.subtotal),
    discount: money(o.discount_qar ?? o.discount),
    total: money(o.total_qar ?? o.total),
  };
}

const IDS_KEY = "ls888_order_ids";
const SHIP_KEY = "ls888_ship";

function read<T>(k: string, f: T): T {
  try {
    const r = localStorage.getItem(k);
    return r ? (JSON.parse(r) as T) : f;
  } catch {
    return f;
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* blocked */
  }
}

export const guestOrderIds = () => read<string[]>(IDS_KEY, []);
export const lastShipping = () => read<Shipping | null>(SHIP_KEY, null);
export const rememberShipping = (s: Shipping) => write(SHIP_KEY, s);

export type PlaceResult =
  | { ok: true; order: Order }
  | { ok: false; short: { code: string; stock: number }[] }
  | { ok: false; error: string };

export async function placeOrder(
  cart: Record<string, number>,
  ship: Shipping,
  kicked: boolean,
  signedIn: boolean,
): Promise<PlaceResult> {
  const items = Object.entries(cart).map(([code, qty]) => ({ code, qty }));
  const { data, error } = await supabase.rpc("place_order", {
    p_items: items,
    p_email: ship.email,
    p_shipping: { name: ship.name, address: ship.address, city: ship.city, country: ship.country },
    p_kicked: kicked,
  });
  if (error) return { ok: false, error: error.message };
  const r = data as unknown as { ok: boolean; order?: Order; short?: { code: string; stock: number }[] };
  if (r.ok && r.order) {
    if (!signedIn) write(IDS_KEY, [r.order.id, ...guestOrderIds()].slice(0, 50));
    return { ok: true, order: norm(r.order) };
  }
  return { ok: false, short: r.short ?? [] };
}

export async function fetchOrders(signedIn: boolean): Promise<Order[]> {
  if (signedIn) {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    return ((data ?? []) as unknown[]).map(norm);
  }
  const ids = guestOrderIds();
  if (!ids.length) return [];
  const { data } = await supabase.rpc("guest_orders", { p_ids: ids });
  return ((data ?? []) as unknown[]).map(norm);
}

/** After sign-in: attach this device's guest orders that match the account email. */
export async function claimGuestOrders() {
  const ids = guestOrderIds();
  if (!ids.length) return;
  const { error } = await supabase.rpc("claim_orders", { p_ids: ids });
  if (!error) {
    // keep only ones still unclaimed (other emails)
    const { data } = await supabase.rpc("guest_orders", { p_ids: ids });
    write(IDS_KEY, ((data ?? []) as unknown as Order[]).map((o) => o.id));
  }
}

export function fmtDate(d: string) {
  const x = new Date(d);
  return (
    x.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " " +
    x.toTimeString().slice(0, 5)
  );
}
