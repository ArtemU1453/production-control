import { RefreshCw } from "lucide-react";
import {
  CardView,
  ListRow,
  PrimaryButton,
  ScreenScaffold,
  SecondaryButton,
  SectionHeader,
} from "@/components";
import { cn } from "@/lib/utils";
import { AppTypography } from "@/designsystem";
import { icons, type LucideIcon } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { useAppUpdate } from "@/core/update/useAppUpdate";

interface HubItem {
  href: string;
  title: string;
  hint: string;
  icon: LucideIcon;
}

interface HubGroup {
  title: string;
  items: HubItem[];
}

const groups: HubGroup[] = [
  {
    title: strings.admin.groupApp,
    items: [
      { href: "/settings/general", title: strings.admin.general, hint: strings.admin.generalHint, icon: icons.settings },
      { href: "/settings/production", title: strings.admin.production, hint: strings.admin.productionHint, icon: icons.cut },
      { href: "/settings/email", title: strings.admin.email, hint: strings.admin.emailHint, icon: icons.reports },
      { href: "/settings/security", title: strings.admin.security, hint: strings.admin.securityHint, icon: icons.security },
    ],
  },
  {
    title: strings.admin.groupData,
    items: [
      { href: "/settings/backup", title: strings.admin.backup, hint: strings.admin.backupHint, icon: icons.database },
      { href: "/settings/maintenance", title: strings.admin.maintenance, hint: strings.admin.maintenanceHint, icon: icons.maintenance },
      { href: "/settings/diagnostics", title: strings.admin.diagnostics, hint: strings.admin.diagnosticsHint, icon: icons.diagnostics },
    ],
  },
  {
    title: strings.admin.groupSystem,
    items: [
      { href: "/settings/logs", title: strings.admin.logs, hint: strings.admin.logsHint, icon: icons.logs },
      { href: "/settings/history", title: strings.intelligence.settingsHistoryTitle, hint: strings.intelligence.settingsHistorySubtitle, icon: icons.history },
      { href: "/settings/integrations", title: strings.intelligence.integrationsTitle, hint: strings.intelligence.integrationsSubtitle, icon: icons.integrations },
      { href: "/settings/about", title: strings.admin.about, hint: strings.admin.aboutHint, icon: icons.about },
    ],
  },
];

/** Manual "check for updates" card — runs the same version check as the
 *  automatic startup check and offers to reload when a new version exists. */
function UpdateCheckCard() {
  const { current, latest, hasUpdate, checkedOnce, checking, check, applyUpdate } = useAppUpdate();
  return (
    <CardView title="Обновление приложения" icon={icons.about}>
      <div className="space-y-2">
        <div className={cn(AppTypography.caption, "text-muted-foreground")}>Текущая версия: {current}</div>
        {checkedOnce ? (
          hasUpdate ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={AppTypography.footnote}>Найдена новая версия{latest ? ` (${latest})` : ""}.</span>
              <PrimaryButton onClick={() => void applyUpdate()}>Обновить</PrimaryButton>
            </div>
          ) : (
            <span className={cn(AppTypography.footnote, "text-muted-foreground")}>
              Используется последняя версия приложения.
            </span>
          )
        ) : null}
        <SecondaryButton icon={RefreshCw} disabled={checking} onClick={() => void check()}>
          {checking ? "Проверка…" : "Проверить обновления"}
        </SecondaryButton>
      </div>
    </CardView>
  );
}

/** Settings hub. Groups every configuration and administration area into a
 *  single navigable index; each row opens a focused sub-screen. */
export function SettingsView() {
  return (
    <ScreenScaffold title={strings.settings.title}>
      <div className="space-y-6">
        <UpdateCheckCard />
        {groups.map((group) => (
          <div key={group.title} className="space-y-3">
            <SectionHeader title={group.title} />
            <div className="space-y-3">
              {group.items.map((item) => (
                <ListRow
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  title={item.title}
                  subtitle={item.hint}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScreenScaffold>
  );
}
