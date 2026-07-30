import {
  CardView,
  EmptyState,
  InfoRow,
  LoadingView,
  PrimaryButton,
  ScreenScaffold,
  StatusBadge,
} from "@/components";
import { icons } from "@/resources/icons";
import { formatDateTime } from "@/extensions/date";
import { DocumentStatus, documentStatusTitle } from "../models";
import { useDocumentPreviewViewModel } from "../viewmodels/useDocumentPreviewViewModel";
import { DocumentFrame } from "./DocumentFrame";

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

export function DocumentPreviewView({ documentId }: { documentId: string }) {
  const vm = useDocumentPreviewViewModel(documentId);

  if (vm.loading) {
    return (
      <ScreenScaffold title="Документ">
        <LoadingView />
      </ScreenScaffold>
    );
  }

  if (!vm.document) {
    return (
      <ScreenScaffold title="Документ">
        <EmptyState icon={icons.reports} title="Документ не найден" />
      </ScreenScaffold>
    );
  }

  const document = vm.document;

  return (
    <ScreenScaffold
      title={document.title}
      toolbar={<StatusBadge label={documentStatusTitle(document.status)} tone={toneFor(document.status)} />}
    >
      <div className="space-y-4">
        <CardView title="Сведения" icon={icons.reports} animate>
          <div className="space-y-2">
            <InfoRow label="Период" value={document.periodLabel} />
            <InfoRow label="Сформирован" value={formatDateTime(document.createdAt)} />
            <InfoRow label="Размер" value={`${Math.round(document.sizeBytes / 1024)} КБ`} />
            <InfoRow
              label="Получатели"
              value={document.recipients.length > 0 ? document.recipients.join(", ") : "—"}
            />
            {document.sentAt ? <InfoRow label="Отправлен" value={formatDateTime(document.sentAt)} /> : null}
            {document.error ? (
              <InfoRow label="Ошибка" value={<span className="text-destructive">{document.error}</span>} last />
            ) : null}
          </div>
        </CardView>

        <CardView title="Документ" icon={icons.dashboard} headerTone="accent" animate>
          <DocumentFrame content={document.content} />
        </CardView>

        <PrimaryButton fullWidth loading={vm.resending} icon={icons.reports} onClick={() => void vm.resend()}>
          {document.status === DocumentStatus.failed ? "Повторить отправку" : "Отправить повторно"}
        </PrimaryButton>
      </div>
    </ScreenScaffold>
  );
}
