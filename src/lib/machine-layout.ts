/**
 * Machine layout constants in image-pixel coordinates (2688x1152 photo).
 * Every overlay is absolutely positioned on the stage with these values,
 * so it always lines up with the machine photo at any screen size.
 */

export const STAGE_W = 2688;
export const STAGE_H = 1152;

/** 4x4 slot grid: column lefts and row tops */
export const SLOT_COLS = [878, 1065, 1252, 1438];
export const SLOT_ROWS = [258, 430, 597, 762]; // A, B, C, D
export const SLOT_W = 184;
export const SLOT_H = 166;

/** Keypad button centers */
export const KEY_X = [1726, 1776, 1826, 1872];
export const KEY_Y = [415, 460, 505, 548]; // A, B, C, D
export const KEY_W = 44;
export const KEY_H = 38;

export const GLASS_MENU = { left: 880, top: 150, width: 735, height: 76 };
export const LCD = { left: 1705, top: 276, width: 180, height: 84 };
export const BTN_ADD = { left: 1705, top: 597, width: 187, height: 46 };
export const BTN_SAVE = { left: 1703, top: 662, width: 92, height: 45 };
export const BTN_CLEAR = { left: 1810, top: 662, width: 86, height: 45 };
export const TRAY = { left: 942, top: 952, width: 652, height: 106 };

/** Camera view rectangles in image space: [x, y, w, h] */
export type CameraMode = "wide" | "focus" | "row" | "receipt";

export function viewRect(mode: CameraMode, row: number | null, mobile: boolean): [number, number, number, number] {
  // phones: glass (menu strip + 4x4 slots + tray) spans the full screen width
  if (mobile) return [866, 140, 762, 925];
  if (mode === "receipt") return mobile ? [1700, 700, 230, 300] : [1650, 690, 360, 340];
  if (mode === "row" && row != null) return [860, (SLOT_ROWS[row] ?? 0) - 70, 1060, 310];
  // wide + focus share the same rect; only the target screen area differs
  return mobile ? [860, 250, 780, 700] : [740, 0, 1210, 1152];
}

/** Height of the fixed bottom control dock on phones (CSS px). */
export const MOBILE_DOCK_H = 92;

export interface ScreenArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The part of the screen a view should fit into. */
export function targetArea(mode: CameraMode, vw: number, vh: number, mobile: boolean): ScreenArea {
  const topBar = mobile ? 52 : 56;
  if (mobile) return { x: 0, y: topBar, w: vw, h: vh - topBar - MOBILE_DOCK_H };
  if (mode === "wide" || mode === "receipt") {
    return { x: 0, y: topBar, w: vw, h: vh - topBar };
  }
  if (mobile) {
    return { x: 0, y: 44, w: vw, h: vh * 0.36 - 44 };
  }
  // focus/row: left 58% of the screen, right side reserved for the hologram (phase 2)
  const right = Math.min(600, vw * 0.4) + vw * 0.03;
  return { x: 0, y: 56, w: vw - right, h: vh - 66 };
}

export interface Camera {
  s: number;
  tx: number;
  ty: number;
}

/**
 * Fit an image-space rect into a screen area. On desktop the photo must
 * always cover the viewport (minimum cover scale, translation clamped so
 * no edge ever shows).
 */
export function computeCamera(
  mode: CameraMode,
  row: number | null,
  vw: number,
  vh: number,
  mobile: boolean,
): Camera {
  const [x, y, w, h] = viewRect(mode, row, mobile);
  const a = targetArea(mode, vw, vh, mobile);
  let s = Math.min(a.w / w, a.h / h);
  if (!mobile) s = Math.max(s, vw / STAGE_W, vh / STAGE_H);
  let tx = a.x + (a.w - w * s) / 2 - x * s;
  // phones: top-align right under the top bar; leftover space shows the backdrop
  let ty = mobile ? a.y - y * s : a.y + (a.h - h * s) / 2 - y * s;
  if (!mobile) {
    tx = Math.min(0, Math.max(vw - STAGE_W * s, tx));
    ty = Math.min(a.y, Math.max(vh - STAGE_H * s, ty));
  }
  return { s, tx, ty };
}
