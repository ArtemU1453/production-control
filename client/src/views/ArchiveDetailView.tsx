import { Archive } from "lucide-react";
import {
  CardView,
  EmptyState,
  InfoRow,
  LoadingView,
  ScreenScaffold,
} from "@/components";
import { icons } from "@/resources/icons";
import {
  jumboOperationTitle,
  machineTitle,
  wasteKindTitle,
} from "@/models";
import { formatArea, formatMeters } from "@/extensions/number";
import { formatDate, formatDateTime } from "@/extensions/date";
import { useArchiveDetailViewModel } from "@/viewmodels";

export function ArchiveDetailView({ archiveId }: { archiveId: string }) {
  const vm = useArchiveDetailViewModel(archiveId);

  if (vm.loading) {
    return (
      <ScreenScaffold title="Карточка архива">
        <LoadingView />
      </ScreenScaffold>
    );
  }

  if (!vm.archived || !vm.report) {
    return (
      <ScreenScaffold title="Карточка архива">
        <EmptyState icon={Archive} title="Запись архива не найдена" />
      </ScreenScaffold>
    );
  }

  const { archived, report } = vm;

  return (
    <ScreenScaffold title={`Архив № ${archived.jumbo.stockNumber}`}>
      <div className="space-y-4">
        {report.sections.map((section) => (
          <CardView key={section.title} title={section.title} icon={icons.analytics} animate>
            <div className="space-y-2">
              {section.rows.map((row, index) => (
                <InfoRow
                  key={row.label}
                  label={row.label}
                  value={row.value}
                  last={index === section.rows.length - 1}
                />
              ))}
            </div>
          </CardView>
        ))}

        <CardView title="Заказы" icon={icons.history} animate>
          {archived.sessions.length === 0 ? (
            <div className="py-2 text-sm text-muted-foreground">Заказов не было</div>
          ) : (
            <div className="space-y-2">
              {archived.sessions.map((session, index) => (
                <InfoRow
                  key={session.id}
                  label={`${session.order.orderNumber || "Без номера"} · ${machineTitle(session.order.machine)}`}
                  value={`${session.result.total_rolls} рул.`}
                  last={index === archived.sessions.length - 1}
                />
              ))}
            </div>
          )}
        </CardView>

        <CardView title="Потери" icon={icons.gauge} headerTone="accent" animate>
          {archived.wastes.length === 0 ? (
            <div className="py-2 text-sm text-muted-foreground">Записей о потерях нет</div>
          ) : (
            <div className="space-y-2">
              {archived.wastes.map((waste, index) => (
                <InfoRow
                  key={waste.id}
                  label={`${wasteKindTitle(waste.kind)}${waste.lengthM ? ` · ${formatMeters(waste.lengthM)}` : ""}`}
                  value={formatArea(waste.areaM2)}
                  last={index === archived.wastes.length - 1}
                />
              ))}
            </div>
          )}
        </CardView>

        <CardView title="Журнал операций" icon={icons.clock} animate>
          <ol className="space-y-4">
            {archived.operations.map((operation, index) => (
              <li key={operation.id} className="relative flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  {index < archived.operations.length - 1 ? (
                    <span className="mt-1 w-px flex-1 bg-border" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <div className="text-sm font-medium">{jumboOperationTitle(operation.type)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(operation.timestamp)}
                    {operation.operator ? ` · ${operation.operator}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </CardView>

        <div className="px-1 text-center text-xs text-muted-foreground">
          Архивировано: {formatDate(archived.archivedAt)}
        </div>
      </div>
    </ScreenScaffold>
  );
}
