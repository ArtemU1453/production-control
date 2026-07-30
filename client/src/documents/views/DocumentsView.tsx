import { Link } from "wouter";
import { Plus, Send } from "lucide-react";
import {
  EmptyState,
  LoadingView,
  ScreenScaffold,
  StatusBadge,
} from "@/components";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { icons } from "@/resources/icons";
import { formatDateTime } from "@/extensions/date";
import { DocumentStatus, documentStatusTitle, type GeneratedDocument } from "../models";
import { useDocumentsViewModel } from "../viewmodels/useDocumentsViewModel";

function toneFor(status: DocumentStatus): "neutral" | "warning" | "danger" | "muted" {
  switch (status) {
    case DocumentStatus.sent:
      return "neutral";
    case DocumentStatus.failed:
      return "danger";
    case DocumentStatus.sending:
      return "warning";
    case DocumentStatus.generated:
      return "muted";
  }
}

function DocumentRow({
  document,
  resending,
  onResend,
}: {
  document: GeneratedDocument;
  resending: boolean;
  onResend: () => void;
}) {
  return (
    <div
      className={cn(
        "glass noise flex items-center gap-3 rounded-3xl border-l-4 border-card-border p-4",
        document.status === DocumentStatus.failed ? "border-l-destructive" : "border-l-border",
      )}
    >
      <Link href={`/documents/${document.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{document.title}</span>
          <StatusBadge label={documentStatusTitle(document.status)} tone={toneFor(document.status)} />
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {formatDateTime(document.createdAt)} · {Math.round(document.sizeBytes / 1024)} КБ ·{" "}
          {document.recipients.length > 0 ? document.recipients.join(", ") : "без получателей"}
          {document.automatic ? " · авто" : ""}
        </div>
        {document.error ? <div className="truncate text-xs text-destructive">{document.error}</div> : null}
      </Link>
      <Button
        variant="secondary"
        size="icon"
        className="rounded-xl"
        aria-label="Отправить повторно"
        disabled={resending}
        onClick={onResend}
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** History of generated documents with re-send. */
export function DocumentsView() {
  const vm = useDocumentsViewModel();

  return (
    <ScreenScaffold
      title="Документы"
      subtitle="История сформированных отчётов"
      toolbar={
        <Link href="/documents/new">
          <Button variant="default" size="icon" className="rounded-xl" aria-label="Создать документ">
            <Plus className="h-4 w-4" />
          </Button>
        </Link>
      }
    >
      {vm.loading ? (
        <LoadingView />
      ) : vm.documents.length === 0 ? (
        <EmptyState
          icon={icons.reports}
          title="Документы не сформированы"
          message="Создайте PDF-отчёт и отправьте его получателям."
        />
      ) : (
        <div className="space-y-3">
          {vm.documents.map((document) => (
            <DocumentRow
              key={document.id}
              document={document}
              resending={vm.resendingId === document.id}
              onResend={() => void vm.resend(document.id)}
            />
          ))}
        </div>
      )}
    </ScreenScaffold>
  );
}
