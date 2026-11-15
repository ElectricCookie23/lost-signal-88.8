import { cn } from "@/lib/utils";

/** Unlit copy of the sign (image coords) laid over the photo; shown by day and during glitches. */
export function SignDark({ visible }: { visible: boolean }) {
  return <div aria-hidden className={cn("sign-dark", visible && "is-on")} />;
}

/** The paper note taped to the glass. */
export function OutOfOrderNote({ fallen }: { fallen: boolean }) {
  return (
    <div aria-hidden={fallen} className={cn("oo-note", fallen && "is-fallen")}>
      OUT OF<br />ORDER<br />TILL 8PM.<small>Still takes coins though.</small>
    </div>
  );
}
