import { motion } from "framer-motion";

/**
 * Film grain, vignette and drifting haze blobs that give the machine its
 * corridor-at-3am atmosphere.
 */
export function Atmosphere({ haze = true }: { haze?: boolean }) {
  return (
    <>
      <motion.div
        aria-hidden
        className="haze-layer"
        initial={{ opacity: 0 }}
        animate={{ opacity: haze ? 1 : 0 }}
        transition={{ duration: haze ? 3 : 0.8 }}
      >
        <span className="haze-blob haze-blob-1" />
        <span className="haze-blob haze-blob-2" />
        <span className="haze-blob haze-blob-3" />
      </motion.div>
      <div aria-hidden className="vignette" />
      <div aria-hidden className="film-grain" />
    </>
  );
}
