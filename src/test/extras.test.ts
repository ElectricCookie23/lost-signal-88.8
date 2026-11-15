import { describe, expect, it } from "vitest";
import { secretMatch } from "@/lib/secret";
import { tunerMix } from "@/lib/audio";
import { snaps } from "@/components/intro/Gate";

describe("secret code", () => {
  it("D4 A1 D4 within 6s unlocks", () => {
    expect(secretMatch([{ code: "D4", t: 0 }, { code: "A1", t: 2000 }, { code: "D4", t: 6000 }])).toBe(true);
  });
  it("too slow does not unlock", () => {
    expect(secretMatch([{ code: "D4", t: 0 }, { code: "A1", t: 2000 }, { code: "D4", t: 6001 }])).toBe(false);
  });
  it("wrong order does not unlock", () => {
    expect(secretMatch([{ code: "A1", t: 0 }, { code: "D4", t: 1 }, { code: "D4", t: 2 }])).toBe(false);
  });
});

describe("tuner", () => {
  it("snaps within ±0.15 of 88.8 only", () => {
    expect(snaps(88.95)).toBe(true);
    expect(snaps(89.0)).toBe(false);
  });
  it("stations audible within ±0.4, clearest at the exact point", () => {
    expect(tunerMix(97.1).stations[1]).toBe(1);
    expect(tunerMix(97.6).stations[1]).toBe(0);
    expect(tunerMix(97.3).stations[1]).toBeGreaterThan(0);
  });
  it("static fades out near 88.8", () => {
    expect(tunerMix(88.8).static).toBe(0);
    expect(tunerMix(95).static).toBe(1);
  });
});
