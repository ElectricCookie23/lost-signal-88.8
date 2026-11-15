import { describe, expect, it } from "vitest";
import { cartTotals } from "@/data/products";
import { parseView } from "@/routes/_machine";

describe("cart rules", () => {
  it("applies no discount before C4 is kicked", () => {
    expect(cartTotals({ B1: 2 }, false)).toEqual({ subtotal: 440, discount: 0, total: 440 });
  });
  it("KICKIT takes 10% off the subtotal", () => {
    expect(cartTotals({ B1: 2 }, true)).toEqual({ subtotal: 440, discount: 44, total: 396 });
  });
});

describe("machine URLs", () => {
  it("/wear opens row B", () => expect(parseView("wear")).toEqual({ kind: "row", row: 1 }));
  it("/c4 opens the ON AIR lamp", () => expect(parseView("c4")).toEqual({ kind: "product", code: "C4" }));
  it("unknown paths open nothing", () => expect(parseView("e9")).toBeNull());
});
