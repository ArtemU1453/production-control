import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  LoadingView,
  ScreenScaffold,
  SearchBar,
  StatusBadge,
} from "@/components";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { coatingTitle, machineTitle, type CuttingSession } from "@/models";
import { formatDateTime } from "@/extensions/date";
import { formatMeters } from "@/extensions/number";
import { useHistoryViewModel } from "@/viewmodels";

type HistoryGroup =
  | { type: "single"; session: CuttingSession }
  | { type: "chain"; chainId: string; sessions: CuttingSession[] };

/** Groups sessions that belong to the same multi-Jumbo order (shared chainId),
 *  preserving the incoming order; standalone sessions stay individual. */
function groupSessions(sessions: CuttingSession[]): HistoryGroup[] {
  const groups: HistoryGroup[] = [];
  const index = new Map<string, Extract<HistoryGroup, { type: "chain" }>>();
  for (const session of sessions) {
    if (session.chainId) {
      const existing = index.get(session.chainId);
      if (existing) {
        existing.sessions.push(session);
      } else {
        const group = { type: "chain" as const, chainId: session.chainId, sessions: [session] };
        index.set(session.chainId, group);
        groups.push(group);
      }
    } else {
      groups.push({ type: "single", session });
    }
  }
  for (const group of groups) {
    if (group.type === "chain") {
      group.sessions.sort((a, b) => (a.chainIndex ?? 0) - (b.chainIndex ?? 0));
    }
  }
  return groups;
}

/** Production history: a list of cutting sessions with search and deletion. */
export function HistoryView() {
  const { loading, query, setQuery, sessions, remove, clearAll } = useHistoryViewModel();

  return (
    <ScreenScaffold
      title={strings.history.title}
      toolbar={
        sessions.length > 0 ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-xl" aria-label="Очистить историю">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Очистить историю?</AlertDialogTitle>
                <AlertDialogDescription>
                  Все сохранённые заказы будут удалены. Действие необратимо.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={() => void clearAll()}>Очистить</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <SearchBar value={query} onChange={setQuery} placeholder="Заказчик, номер, Джамб, материал" />

        {loading ? (
          <LoadingView />
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={icons.history}
            title={strings.history.empty}
            message={strings.history.emptyHint}
          />
        ) : (
          <div className="space-y-3">
            {groupSessions(sessions).map((group) =>
              group.type === "single" ? (
                <div
                  key={group.session.id}
                  className="glass noise flex items-center gap-3 rounded-3xl border-card-border p-4"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                    <icons.cut className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">
                        {group.session.order.orderNumber || "Без номера"}
                        {group.session.order.customer ? ` · ${group.session.order.customer}` : ""}
                      </span>
                      <StatusBadge
                        label={`${group.session.result.waste_percent.toFixed(1)}%`}
                        tone={group.session.result.waste_percent > 7 ? "danger" : "neutral"}
                      />
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {formatDateTime(group.session.createdAt)} · Джамб № {group.session.jumboStockNumber} ·{" "}
                      {machineTitle(group.session.order.machine)}
                      {group.session.order.coating ? ` · ${coatingTitle(group.session.order.coating)}` : ""} · Рулонов:{" "}
                      {group.session.result.total_rolls}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl text-muted-foreground"
                    aria-label="Удалить заказ"
                    onClick={() => void remove(group.session.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                (() => {
                  const first = group.sessions[0];
                  const totalRolls = group.sessions.reduce(
                    (sum, s) => sum + s.result.total_main_rolls,
                    0,
                  );
                  return (
                    <div
                      key={group.chainId}
                      className="glass noise rounded-3xl border-card-border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                          <icons.history className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold">
                              {first.order.orderNumber || "Без номера"}
                              {first.order.customer ? ` · ${first.order.customer}` : ""}
                            </span>
                            <StatusBadge label={`Джамбо: ${group.sessions.length}`} tone="neutral" />
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {formatDateTime(first.createdAt)} · {machineTitle(first.order.machine)} ·
                            Изготовлено: {totalRolls} рул.
                          </div>
                        </div>
                      </div>

                      <ol className="mt-3 space-y-2">
                        {group.sessions.map((session, index) => (
                          <li key={session.id}>
                            <div className="flex items-center gap-3 rounded-2xl border bg-card/50 p-2.5">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                                {index + 1}
                              </span>
                              <div className="min-w-0 flex-1 text-xs">
                                <span className="font-semibold">№ {session.jumboStockNumber}</span>{" "}
                                <span className="text-muted-foreground">
                                  · изготовлено {session.result.total_main_rolls} рул. · остаток{" "}
                                  {formatMeters(session.result.remaining_jumbo_m)}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg text-muted-foreground"
                                aria-label="Удалить запись"
                                onClick={() => void remove(session.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            {index < group.sessions.length - 1 ? (
                              <div className="flex justify-center py-0.5 text-muted-foreground">↓</div>
                            ) : null}
                          </li>
                        ))}
                      </ol>
                    </div>
                  );
                })()
              ),
            )}
          </div>
        )}
      </div>
    </ScreenScaffold>
  );
}
