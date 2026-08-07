import { ScreenScaffold } from "@/components";
import { FinishedGoodsPanel } from "./FinishedGoodsPanel";

/**
 * Standalone «Склад готовых рулонов» screen (also embedded as a tab inside the
 * Склад screen). Renders the aggregated finished-goods table.
 */
export function FinishedGoodsView() {
  return (
    <ScreenScaffold title="Склад готовых рулонов" wide>
      <FinishedGoodsPanel />
    </ScreenScaffold>
  );
}
