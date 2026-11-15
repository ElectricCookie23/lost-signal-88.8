import { BTN_ADD, BTN_CLEAR, BTN_SAVE } from "@/lib/machine-layout";

interface MachineButtonsProps {
  onAdd: () => void;
  onSave: () => void;
  onClear: () => void;
}

/** Transparent hotspots over the machine's printed buttons. */
export function MachineButtons({ onAdd, onSave, onClear }: MachineButtonsProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Add selected item to tray"
        className="machine-btn"
        style={{ ...BTN_ADD }}
        onClick={onAdd}
      />
      <button
        type="button"
        aria-label="Save selected item"
        className="machine-btn"
        style={{ ...BTN_SAVE }}
        onClick={onSave}
      />
      <button
        type="button"
        aria-label="Clear selection"
        className="machine-btn"
        style={{ ...BTN_CLEAR }}
        onClick={onClear}
      />
    </>
  );
}
