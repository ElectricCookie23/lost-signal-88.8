import { useCallback, useEffect, useRef, useState } from "react";
import { PRODUCT_BY_CODE } from "@/data/products";
import type { CameraMode } from "@/lib/machine-layout";

const CART_KEY = "ls888_cart";
const SAVED_KEY = "ls888_saved";

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
    (slotPos: { x: number; y: number }) => {
      if (!selected) {
        flashLcd("PICK A\nSLOT FIRST");
        return;
      }
      if (available(selected) === 0) {
        flashLcd(`${selected}\nSOLD OUT`);
        return;
      }
      fallerId.current += 1;
      setFaller({ code: selected, from: slotPos, id: fallerId.current });
    },
    [selected, available, flashLcd],
  );

  const completedFalls = useRef(new Set<number>());
  const completeFall = useCallback(() => {
    setFaller((f) => {
      if (f && !completedFalls.current.has(f.id)) {
        completedFalls.current.add(f.id);
        setCart((c) => ({ ...c, [f.code]: (c[f.code] ?? 0) + 1 }));
      }
      return null;
    });
  }, []);

  const toggleSave = useCallback(() => {
    if (!selected) {
      flashLcd("PICK A\nSLOT FIRST");
      return;
    }
    setSaved((s) => {
      const has = s.includes(selected);
      flashLcd(has ? `${selected}\nUNSAVED` : `${selected}\nSAVED ♥`);
      return has ? s.filter((c) => c !== selected) : [...s, selected];
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
            ? "SOLD OUT"
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
