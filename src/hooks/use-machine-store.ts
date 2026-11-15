import { useCallback, useEffect, useRef, useState } from "react";
import { PRODUCT_BY_CODE } from "@/data/products";
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

export function useMachineStore() {
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
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* storage full or blocked */
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    } catch {
      /* storage full or blocked */
    }
  }, [saved]);

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
    [cart],
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
