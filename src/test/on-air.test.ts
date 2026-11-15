import { describe, expect, it } from "vitest";
import { qatarOnAir } from "@/hooks/use-on-air";

// Qatar is UTC+3
describe("on air hours (20:00–06:00 Qatar)", () => {
  it("is on air at 20:00 Qatar", () => expect(qatarOnAir(new Date("2026-11-15T17:00:00Z"))).toBe(true));
  it("is on air at 05:59 Qatar", () => expect(qatarOnAir(new Date("2026-11-15T02:59:00Z"))).toBe(true));
  it("is off air at 06:00 Qatar", () => expect(qatarOnAir(new Date("2026-11-15T03:00:00Z"))).toBe(false));
  it("is off air at 19:59 Qatar", () => expect(qatarOnAir(new Date("2026-11-15T16:59:00Z"))).toBe(false));
});
