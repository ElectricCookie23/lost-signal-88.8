import { PRODUCTS } from "@/data/products";
import { KEY_H, KEY_W, KEY_X, KEY_Y } from "@/lib/machine-layout";
import { cn } from "@/lib/utils";

interface KeypadProps {
  selected: string | null;
  available: (code: string) => number;
  onSelect: (code: string) => void;
}

/** Transparent buttons over the machine's printed keypad. */
export function Keypad({ selected, available, onSelect }: KeypadProps) {
  return (
    <>
      {PRODUCTS.map((p, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const out = p.stock === 0 || available(p.code) === 0;
        return (
          <button
            key={p.code}
            type="button"
            aria-label={`Key ${p.code}`}
            disabled={out}
            onClick={() => onSelect(p.code)}
            className={cn("machine-key", selected === p.code && "is-on", out && "is-off")}
            style={{
              left: (KEY_X[col] ?? 0) - KEY_W / 2,
              top: (KEY_Y[row] ?? 0) - KEY_H / 2,
              width: KEY_W,
              height: KEY_H,
            }}
          />
        );
      })}
    </>
  );
}
