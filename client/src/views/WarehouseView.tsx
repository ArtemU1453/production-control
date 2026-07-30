import { CardView, EmptyState, LoadingView, ScreenScaffold, StatusBadge } from "@/components";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { formatMeters } from "@/extensions/number";
import { jumboStatusColorRole, jumboStatusTitle } from "@/models";
import { useWarehouseViewModel } from "@/viewmodels";

/** Warehouse of Jumbo rolls. The data layer is wired; the management UI arrives
 *  in a later phase, so an empty repository shows the prepared placeholder. */
export function WarehouseView() {
  const { loading, jumbos } = useWarehouseViewModel();

  return (
    <ScreenScaffold title={strings.warehouse.title}>
      {loading ? (
        <LoadingView />
      ) : jumbos.length === 0 ? (
        <CardView animate>
          <EmptyState
            icon={icons.warehouse}
            title={strings.comingSoon}
            message={strings.warehouse.description}
          />
        </CardView>
      ) : (
        <div className="space-y-3">
          {jumbos.map((jumbo) => (
            <div
              key={jumbo.id}
              className="glass noise flex items-center gap-3 rounded-3xl border-card-border p-4"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                <icons.jumbo className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">№ {jumbo.stockNumber}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {jumbo.materialCode} · Остаток: {formatMeters(jumbo.currentRemainderM)}
                </div>
              </div>
              <StatusBadge
                label={jumboStatusTitle(jumbo.status)}
                tone={jumboStatusColorRole(jumbo.status)}
              />
            </div>
          ))}
        </div>
      )}
    </ScreenScaffold>
  );
}
