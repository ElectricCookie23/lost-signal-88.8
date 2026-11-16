import { describe, expect, it } from "vitest";
import { ghostRange, ghostDelayRange, ghostCanBuy, driftViewers } from "@/lib/live-rules";
describe("live station rules", () => {
  it("uses 4–9 day listeners and 12–30 night listeners",()=>{ expect(ghostRange(false)).toEqual([4,9]); expect(ghostRange(true)).toEqual([12,30]); });
  it("spaces sales 6–12 minutes by day and 2–5 at night",()=>{ expect(ghostDelayRange(false)).toEqual([360,720]); expect(ghostDelayRange(true)).toEqual([120,300]); });
  it("never sells below half base stock",()=>{ expect(ghostCanBuy(5,8)).toBe(true); expect(ghostCanBuy(4,8)).toBe(false); expect(ghostCanBuy(2,3)).toBe(false); });
  it("product ghosts stay in 0–3 and drift one at a time",()=>{ expect(driftViewers(3,1)).toBe(3); expect(driftViewers(0,0)).toBe(0); expect(driftViewers(1,1)).toBe(2); });
});