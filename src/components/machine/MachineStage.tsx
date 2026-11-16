import { motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import {
  computeCamera,
  STAGE_H,
  STAGE_W,
  type Camera,
  type CameraMode,
} from "@/lib/machine-layout";

const EASE = [0.65, 0, 0.25, 1] as const;

function useViewport() {
  const [size, setSize] = useState({ w: 1280, h: 800 });
  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

interface MachineStageProps {
  mode: CameraMode;
  row: number | null;
  children: ReactNode;
  rattle?: number;
  /** Intro: camera pushed in close on the dark corridor. */
  intro?: boolean;
  /** Camera transition length in seconds (2.6 for the intro glide, 0 to cut). */
  duration?: number;
  /** Machine brightness 0–1 (flicker on/off, day dimming). */
  bright?: number;
  /** Menu + LCD visible. */
  uiOn?: boolean;
  /** Day mode: desaturate. */
  offAir?: boolean;
}

/**
 * The 2688x1152 machine photo with every overlay positioned in image-pixel
 * coordinates. The whole stage is scaled/translated by the "camera" so
 * overlays always line up with the photo at any screen size.
 */
export function MachineStage({ mode, row, children, rattle = 0, intro = false, duration = 0.9, bright = 1, uiOn = true, offAir = false }: MachineStageProps) {
  const { w, h } = useViewport();
  const mobile = w <= 760;
  let cam: Camera = computeCamera(mode, row, w, h, mobile);
  if (intro) {
    const s = Math.max(w / 900, h / 600);
    cam = { s, tx: w / 2 - 1340 * s, ty: h / 2 - 640 * s };
  }

  return (
    <>
      {/* blurred backdrop: no empty space ever shows behind the machine */}
      <div
        aria-hidden
        className="fixed -inset-10 bg-cover bg-center"
        style={{
          backgroundImage: "url(/machine/machine-empty.jpg)",
          filter: "blur(28px) brightness(0.45) saturate(1.2)",
        }}
      />
      <div className="fixed inset-0 overflow-hidden">
        <motion.div
          id="machine-stage"
          className="absolute left-0 top-0"
          style={{ width: STAGE_W, height: STAGE_H, transformOrigin: "0 0" }}
          initial={false}
          animate={{ x: cam.tx, y: cam.ty, scale: cam.s }}
          transition={{ duration: intro ? 0 : duration, ease: EASE }}
        >
          <div
            key={rattle}
            className={[rattle ? "stage-rattle" : "", uiOn ? "" : "ui-off", offAir ? "is-offair" : ""].join(" ")}
            style={{ position: "absolute", inset: 0, filter: bright < 1 ? `brightness(${bright})` : undefined }}
          >
          <img
            src="/machine/machine-empty.jpg"
            alt="The Lost Signal 88.8 vending machine in a dark corridor"
            className="machine-photo absolute inset-0 h-full w-full select-none"
            draggable={false}
          />
          {children}
          </div>
        </motion.div>
      </div>
    </>
  );
}
