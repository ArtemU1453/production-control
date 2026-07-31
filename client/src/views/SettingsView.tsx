import { ListRow, ScreenScaffold, SectionHeader } from "@/components";
import { icons, type LucideIcon } from "@/resources/icons";
import { strings } from "@/resources/strings";

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

/** Settings hub. Groups every configuration and administration area into a
 *  single navigable index; each row opens a focused sub-screen. */
export function SettingsView() {
  return (
    <ScreenScaffold title={strings.settings.title}>
      <div className="space-y-6">
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
