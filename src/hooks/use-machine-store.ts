import { useCallback, useEffect, useRef, useState } from "react";
import { PRODUCT_BY_CODE } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";
import type { CameraMode } from "@/lib/machine-layout";

const CART_KEY = "ls888_cart";
const SAVED_KEY = "ls888_saved";
const KICKED_KEY = "ls888_kicked";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export interface Faller {
  code: string;
  from: { x: number; y: number };
  qty: number;
  id: number;
}

/** Write live stock into the shared product records. Returns codes whose count changed. */
function applyStock(rows: { code: string; stock: number }[]) {
  const changed: string[] = [];
  for (const r of rows) {
    const p = PRODUCT_BY_CODE[r.code];
    if (p && p.stock !== r.stock) {
      p.stock = r.stock;
      changed.push(r.code);
    }
  }
  return changed;
}

export function useMachineStore(userId: string | null = null) {
  const [cart, setCart] = useState<Record<string, number>>(() => load(CART_KEY, {}));
  const [saved, setSaved] = useState<string[]>(() => load(SAVED_KEY, []));
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<CameraMode>("wide");
  const [row, setRow] = useState<number | null>(null);
  const [lcdOverride, setLcdOverride] = useState<string | null>(null);
  const [faller, setFaller] = useState<Faller | null>(null);
  const [kicked, setKicked] = useState<boolean>(() => load(KICKED_KEY, false));
  const lcdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallerId = useRef(0);

  useEffect(() => {
    if (userId) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* storage full or blocked */
    }
  }, [cart, userId]);

  useEffect(() => {
    if (userId) return;
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    } catch {
      /* storage full or blocked */
    }
  }, [saved, userId]);

  // ---- live stock -------------------------------------------------------
  const [stockTick, setStockTick] = useState(0);
  const [ticks, setTicks] = useState<Record<string, number>>({});
  const [beaten, setBeaten] = useState<Record<string, number>>({});

  const onStock = useCallback((rows: { code: string; stock: number }[], animate: boolean) => {
    const changed = applyStock(rows);
    if (!changed.length) return;
    setStockTick((t) => t + 1);
    if (animate) setTicks((t) => Object.fromEntries([...Object.entries(t), ...changed.map((c) => [c, (t[c] ?? 0) + 1])]));
    // clamp carts that now exceed real stock
    setCart((c) => {
      let next = c;
      for (const code of changed) {
        const max = PRODUCT_BY_CODE[code]?.stock ?? 0;
        const have = c[code] ?? 0;
        if (have > max) {
          if (next === c) next = { ...c };
          if (max === 0) delete next[code];
          else next[code] = max;
          setBeaten((b) => ({ ...b, [code]: max }));
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    supabase
      .from("products")
      .select("code, stock")
      .then(({ data }) => data && onStock(data, false));
    const ch = supabase
      .channel(`products-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, (payload) => {
        const r = payload.new as { code: string; stock: number };
        onStock([r], true);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [onStock]);

  // ---- account sync -----------------------------------------------------
  const synced = useRef<{ user: string; cart: Record<string, number>; saved: string[] } | null>(null);
  const prevUser = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      if (prevUser.current) {
        // signed out: account cart stays with the account
        setCart({});
        setSaved([]);
      }
      prevUser.current = null;
      synced.current = null;
      return;
    }
    prevUser.current = userId;
    let cancelled = false;
    (async () => {
      const [{ data: dbCart }, { data: dbSaved }] = await Promise.all([
        supabase.from("cart_items").select("code, qty"),
        supabase.from("saved_items").select("code"),
      ]);
      if (cancelled) return;
      const localCart = load<Record<string, number>>(CART_KEY, {});
      const localSaved = load<string[]>(SAVED_KEY, []);
      const merged: Record<string, number> = {};
      for (const r of dbCart ?? []) merged[r.code] = r.qty;
      for (const [c, q] of Object.entries(localCart)) merged[c] = Math.max(merged[c] ?? 0, q);
      for (const c of Object.keys(merged)) {
        const max = PRODUCT_BY_CODE[c]?.stock ?? 0;
        if (merged[c]! > max) merged[c] = max;
        if (!merged[c]) delete merged[c];
      }
      const mergedSaved = Array.from(new Set([...(dbSaved ?? []).map((r) => r.code), ...localSaved]));
      // push merged guest items up, then forget the guest copy
      const upCart = Object.entries(merged).map(([code, qty]) => ({ user_id: userId, code, qty }));
      if (upCart.length) await supabase.from("cart_items").upsert(upCart);
      const upSaved = mergedSaved.map((code) => ({ user_id: userId, code }));
      if (upSaved.length) await supabase.from("saved_items").upsert(upSaved);
      try {
        localStorage.removeItem(CART_KEY);
        localStorage.removeItem(SAVED_KEY);
      } catch {
        /* blocked */
      }
      if (cancelled) return;
      synced.current = { user: userId, cart: merged, saved: mergedSaved };
      setCart(merged);
      setSaved(mergedSaved);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // write cart / saved diffs to the account
  useEffect(() => {
    const s = synced.current;
    if (!userId || !s || s.user !== userId) return;
    const prev = s.cart;
    const gone = Object.keys(prev).filter((c) => !cart[c]);
    const up = Object.entries(cart)
      .filter(([c, q]) => prev[c] !== q)
      .map(([code, qty]) => ({ user_id: userId, code, qty }));
    s.cart = cart;
    if (gone.length) void supabase.from("cart_items").delete().eq("user_id", userId).in("code", gone);
    if (up.length) void supabase.from("cart_items").upsert(up);
  }, [cart, userId]);

  useEffect(() => {
    const s = synced.current;
    if (!userId || !s || s.user !== userId) return;
    const prev = s.saved;
    const gone = prev.filter((c) => !saved.includes(c));
    const add = saved.filter((c) => !prev.includes(c)).map((code) => ({ user_id: userId, code }));
    s.saved = saved;
    if (gone.length) void supabase.from("saved_items").delete().eq("user_id", userId).in("code", gone);
    if (add.length) void supabase.from("saved_items").upsert(add);
  }, [saved, userId]);

  useEffect(() => {
    try {
      localStorage.setItem(KICKED_KEY, JSON.stringify(kicked));
    } catch {
      /* storage blocked */
    }
  }, [kicked]);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const available = useCallback(
    (code: string) => Math.max(0, (PRODUCT_BY_CODE[code]?.stock ?? 0) - (cart[code] ?? 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart, stockTick],
  );

  const flashLcd = useCallback((text: string, hold = 1600) => {
    if (lcdTimer.current) clearTimeout(lcdTimer.current);
    setLcdOverride(text);
    lcdTimer.current = setTimeout(() => setLcdOverride(null), hold);
  }, []);

  const select = useCallback(
    (code: string | null) => {
      if (code && available(code) === 0) {
        flashLcd(`${code}\nSOLD OUT`);
        return;
      }
      setSelected(code);
      setLcdOverride(null);
    },
    [available, flashLcd],
  );

  const goWide = useCallback(() => {
    setMode("wide");
    setRow(null);
  }, []);

  const goRow = useCallback((r: number) => {
    setMode("row");
    setRow(r);
  }, []);

  const addToTray = useCallback(
    (slotPos: { x: number; y: number }, code: string | null = selected, qty = 1) => {
      if (!code) {
        flashLcd("PICK A\nSLOT FIRST");
        return;
      }
      if (available(code) === 0) {
        flashLcd(`${code}\nSOLD OUT`);
        return;
      }
      fallerId.current += 1;
      const n = Math.max(1, Math.min(qty, available(code)));
      setFaller({ code, from: slotPos, qty: n, id: fallerId.current });
    },
    [selected, available, flashLcd],
  );

  const completedFalls = useRef(new Set<number>());
  const completeFall = useCallback(() => {
    setFaller((f) => {
      if (f && !completedFalls.current.has(f.id)) {
        completedFalls.current.add(f.id);
        setCart((c) => ({ ...c, [f.code]: (c[f.code] ?? 0) + f.qty }));
      }
      return null;
    });
  }, []);

  const setQty = useCallback((code: string, qty: number) => {
    setCart((c) => {
      const max = PRODUCT_BY_CODE[code]?.stock ?? 0;
      const n = Math.max(0, Math.min(max, qty));
      const next = { ...c };
      if (n === 0) delete next[code];
      else next[code] = n;
      return next;
    });
  }, []);

  const toggleSave = useCallback((target?: string) => {
    const selected_ = typeof target === "string" ? target : selected;
    if (!selected_) {
      flashLcd("PICK A\nSLOT FIRST");
      return;
    }
    setSaved((s) => {
      const has = s.includes(selected_);
      flashLcd(has ? `${selected_}\nUNSAVED` : `${selected_}\nSAVED ♥`);
      return has ? s.filter((c) => c !== selected_) : [...s, selected_];
    });
  }, [selected, flashLcd]);

  const clearSelection = useCallback(() => {
    setSelected(null);
    setLcdOverride(null);
  }, []);

  const selectedProduct = selected ? PRODUCT_BY_CODE[selected] : undefined;
  const lcdText =
    lcdOverride ??
    (selected && selectedProduct
      ? `${selected} · QAR ${selectedProduct.price}\n${
          available(selected) === 0
            ? selectedProduct.stock > 0
              ? "IN CART"
              : "SOLD OUT"
            : available(selected) <= 3
              ? `${available(selected)} LEFT`
              : `${available(selected)} IN`
        }`
      : `CART ${cartCount}\nSAVED ${saved.length}`);

  return {
    cart,
    saved,
    selected,
    stockTick,
    ticks,
    beaten,
    clearBeaten: (code: string) => setBeaten((b) => { const n = { ...b }; delete n[code]; return n; }),
    mode,
    row,
    lcdText,
    faller,
    cartCount,
    kicked,
    setKicked,
    setQty,
    flashLcd,
    setSelected,
    available,
    select,
    goWide,
    goRow,
    addToTray,
    completeFall,
    toggleSave,
    clearSelection,
  };
}

export type MachineStore = ReturnType<typeof useMachineStore>;
