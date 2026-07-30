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
import { machineTitle } from "@/models";
import { formatDateTime } from "@/extensions/date";
import { useHistoryViewModel } from "@/viewmodels";

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
            {sessions.map((session) => (
              <div
                key={session.id}
                className="glass noise flex items-center gap-3 rounded-3xl border-card-border p-4"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                  <icons.cut className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">
                      {session.order.orderNumber || "Без номера"}
                      {session.order.customer ? ` · ${session.order.customer}` : ""}
                    </span>
                    <StatusBadge
                      label={`${session.result.waste_percent.toFixed(1)}%`}
                      tone={session.result.waste_percent > 7 ? "danger" : "neutral"}
                    />
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {formatDateTime(session.createdAt)} · Джамб № {session.jumboStockNumber} ·{" "}
                    {machineTitle(session.order.machine)} · Рулонов:{" "}
                    {session.result.total_rolls}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl text-muted-foreground"
                  aria-label="Удалить заказ"
                  onClick={() => void remove(session.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScreenScaffold>
  );
}
