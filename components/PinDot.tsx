import { PIN_LABELS, type PinState } from "@/lib/verdict";

/**
 * The map's whole vocabulary: filled means been, hollow means not yet.
 *
 * No glyph inside. A tick on a pin reads as a rating, and the map is not
 * rating anything — it is showing you where you have and haven't eaten.
 * Filled-versus-hollow also survives being small and being colour-blind, which
 * two hues would not.
 */
export function PinDot({
  state,
  className = "",
}: {
  state: PinState;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      title={PIN_LABELS[state]}
      className={`block shrink-0 rounded-full ${
        state === "been"
          ? "border-2 border-white bg-[#2f7d4f] shadow-sm"
          : "border-2 border-foreground bg-surface"
      } ${className}`}
    />
  );
}
