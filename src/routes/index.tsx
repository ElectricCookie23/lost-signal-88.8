import { createFileRoute } from "@tanstack/react-router";
import { useMachineStore } from "@/hooks/use-machine-store";
import { MachineStage } from "@/components/machine/MachineStage";
import { GlassMenu } from "@/components/machine/GlassMenu";
import { SlotGrid } from "@/components/machine/SlotGrid";
import { Keypad } from "@/components/machine/Keypad";
import { Lcd } from "@/components/machine/Lcd";
import { MachineButtons } from "@/components/machine/MachineButtons";
import { PickupTray } from "@/components/machine/PickupTray";
import { Faller } from "@/components/machine/Faller";
import { Atmosphere } from "@/components/machine/Atmosphere";
import { MobileDock } from "@/components/machine/MobileDock";
import { ProductSheet } from "@/components/machine/ProductSheet";
import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { SLOT_COLS, SLOT_ROWS } from "@/lib/machine-layout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lost Signal 88.8 — The Machine" },
      {
        name: "description",
        content:
          "A pirate radio station's merch store where the whole website is a vending machine. Tapes, wear, gear and paper — broadcasting 8pm to 6am.",
      },
      { property: "og:title", content: "Lost Signal 88.8 — The Machine" },
      {
        property: "og:description",
        content:
          "A pirate radio station's merch store where the whole website is a vending machine. Tapes, wear, gear and paper — broadcasting 8pm to 6am.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const store = useMachineStore();
  const [viewing, setViewing] = useState<string | null>(null);

  const cartItems = Object.entries(store.cart).flatMap(([code, qty]) =>
    Array.from({ length: qty }, () => code),
  );

  const handleAdd = () => {
    const code = store.selected;
    if (!code) {
      store.addToTray({ x: 0, y: 0 }); // flashes "PICK A SLOT FIRST"
      return;
    }
    const rowIdx = "ABCD".indexOf(code[0] ?? "");
    const colIdx = Number(code[1]) - 1;
    if (rowIdx < 0 || colIdx < 0 || colIdx > 3) return;
    store.addToTray({
      x: (SLOT_COLS[colIdx] ?? 0) + 11,
      y: (SLOT_ROWS[rowIdx] ?? 0) + 9,
    });
  };

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <MachineStage mode={store.mode} row={store.row}>
        <GlassMenu activeRow={store.mode === "row" ? store.row : null} onRow={store.goRow} />
        <SlotGrid
          selected={store.selected}
          available={store.available}
          onSelect={store.select}
          onOpen={setViewing}
        />
        <Lcd text={store.lcdText} />
        <Keypad
          selected={store.selected}
          available={store.available}
          onSelect={store.select}
        />
        <MachineButtons
          onAdd={handleAdd}
          onSave={store.toggleSave}
          onClear={store.clearSelection}
        />
        <PickupTray items={cartItems} />
        {store.faller && <Faller faller={store.faller} onDone={store.completeFall} />}
      </MachineStage>
      <Atmosphere />
      <MobileDock
        lcdText={store.lcdText}
        selected={store.selected}
        isSaved={!!store.selected && store.saved.includes(store.selected)}
        available={store.available}
        onSelect={store.select}
        onAdd={handleAdd}
        onSave={store.toggleSave}
      />
      {viewing && <ProductSheet code={viewing} onClose={() => setViewing(null)} />}
      <TopBar cartCount={store.cartCount} savedCount={store.saved.length} />
    </div>
  );
}
