import { useLocation } from "wouter";
import {
  CardView,
  PrimaryButton,
  ScreenScaffold,
  SecondaryButton,
} from "@/components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { icons } from "@/resources/icons";
import { ReportKind } from "@/reports";
import { useDocumentComposeViewModel } from "../viewmodels/useDocumentComposeViewModel";
import { DocumentFrame } from "./DocumentFrame";

/** Manual document composition: choose report, period and recipients, preview
 *  the PDF, then generate and send. */
export function DocumentComposeView() {
  const vm = useDocumentComposeViewModel();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const onSend = async () => {
    const document = await vm.send();
    if (document) {
      toast({
        title: document.status === "sent" ? "Документ отправлен" : "Документ сформирован",
        description: document.error ?? `Получателей: ${document.recipients.length}`,
      });
      navigate("/documents");
    }
  };

  return (
    <ScreenScaffold title="Новый документ">
      <div className="space-y-4">
        <CardView title="Параметры" icon={icons.reports} animate>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Тип отчёта</Label>
              <Select value={vm.kind} onValueChange={(v) => vm.setKind(v as ReportKind)}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {vm.definitions.map((definition) => (
                    <SelectItem key={definition.kind} value={definition.kind}>
                      {definition.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="doc-start" className="text-xs">Дата начала</Label>
                <Input id="doc-start" type="date" className="rounded-2xl" value={vm.startDate} onChange={(e) => vm.setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="doc-end" className="text-xs">Дата окончания</Label>
                <Input id="doc-end" type="date" className="rounded-2xl" value={vm.endDate} onChange={(e) => vm.setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="doc-recipients" className="text-xs">Получатели (через запятую)</Label>
              <Textarea
                id="doc-recipients"
                className="rounded-2xl"
                value={vm.recipients}
                onChange={(e) => vm.setRecipients(e.target.value)}
                placeholder="name@company.com, chief@company.com"
              />
            </div>
            <SecondaryButton fullWidth disabled={vm.building} onClick={() => void vm.buildPreview()}>
              {vm.building ? "Формирование…" : "Предпросмотр"}
            </SecondaryButton>
          </div>
        </CardView>

        {vm.preview ? (
          <CardView title="Предпросмотр" icon={icons.dashboard} headerTone="accent" animate>
            <DocumentFrame content={vm.preview.content} />
          </CardView>
        ) : null}

        {vm.error ? <div className="text-sm text-destructive">{vm.error}</div> : null}

        <PrimaryButton fullWidth loading={vm.sending} icon={icons.reports} onClick={() => void onSend()}>
          Сформировать и отправить
        </PrimaryButton>
      </div>
    </ScreenScaffold>
  );
}
