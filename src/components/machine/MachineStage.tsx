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
}

/**
 * The 2688x1152 machine photo with every overlay positioned in image-pixel
 * coordinates. The whole stage is scaled/translated by the "camera" so
 * overlays always line up with the photo at any screen size.
 */
export function MachineStage({ mode, row, children }: MachineStageProps) {
  const { w, h } = useViewport();
  const mobile = w <= 760;
  const cam: Camera = computeCamera(mode, row, w, h, mobile);

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
          transition={{ duration: 0.9, ease: EASE }}
        >
          <img
            src="/machine/machine-empty.jpg"
            alt="The Lost Signal 88.8 vending machine in a dark corridor"
            className="absolute inset-0 h-full w-full select-none"
            draggable={false}
          />
          {children}
        </motion.div>
      </div>
    </>
  );
}
