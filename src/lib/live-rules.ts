export const ghostRange = (night: boolean) => night ? [12, 30] : [4, 9];
export const ghostDelayRange = (night: boolean) => night ? [120, 300] : [360, 720];
export const ghostCanBuy = (stock: number, base: number) => stock - 1 >= Math.ceil(base / 2);
export function driftViewers(n: number, random = Math.random()) { return Math.max(0, Math.min(3, n + (random < 0.33 ? -1 : random > 0.66 ? 1 : 0))); }