import { CardView, InfoRow, StatusBadge } from "@/components";
import { SettingsScaffold } from "@/admin/views/SettingsScaffold";
import { useServices } from "@/core/di/AppServices";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { describeIntegration } from "../integrations/IntegrationProvider";

/** Integrations — staged connectors for ERP / 1С / SAP / REST / CSV. Only the
 *  protocols exist in v2.0; each provider reports its planned availability. */
export function IntegrationsView() {
  const { intelligence } = useServices();
  const infos = intelligence.integrations.map(describeIntegration);

  return (
    <SettingsScaffold
      title={strings.intelligence.integrationsTitle}
      subtitle={strings.intelligence.integrationsSubtitle}
    >
      <CardView title="Внешние системы" icon={icons.integrations} animate>
        <div className="space-y-2">
          {infos.map((info, index) => (
            <InfoRow
              key={info.kind}
              label={info.title}
              value={
                <StatusBadge
                  label={info.available ? "Подключено" : "Скоро"}
                  tone={info.available ? "neutral" : "muted"}
                />
              }
              last={index === infos.length - 1}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          В версии 2.0 определены только протоколы обмена. Реальные коннекторы подключаются
          реализацией интерфейса без изменения бизнес-логики.
        </p>
      </CardView>
    </SettingsScaffold>
  );
}
