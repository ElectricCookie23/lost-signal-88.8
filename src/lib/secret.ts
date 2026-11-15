export const SECRET_CODE = ["D4", "A1", "D4"] as const;
export const SECRET_WINDOW_MS = 6000;

/** True when the last three keypad presses are D4, A1, D4 within 6 seconds. */
export function secretMatch(p: { code: string; t: number }[]) {
  if (p.length < 3) return false;
  const last = p.slice(-3);
  return last.every((x, i) => x.code === SECRET_CODE[i]) && last[2]!.t - last[0]!.t <= SECRET_WINDOW_MS;
}
