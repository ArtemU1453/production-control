import { CardView, ScreenScaffold, SectionHeader } from "@/components";
import { Badge } from "@/components/ui/badge";
import { icons } from "@/resources/icons";
import { strings } from "@/resources/strings";
import { useReportsViewModel } from "@/viewmodels";

/** Reports hub. The report kinds are laid out now as prepared, disabled cards;
 *  PDF generation and email delivery are implemented in a later phase. */
export function ReportsView() {
  const { kinds } = useReportsViewModel();

  return (
    <ScreenScaffold title={strings.reports.title}>
      <div className="space-y-4">
        <CardView animate>
          <SectionHeader title={strings.comingSoon} subtitle={strings.reports.description} icon={icons.reports} />
        </CardView>

        <div className="space-y-3">
          {kinds.map((kind) => {
            const Icon = icons[kind.icon];
            return (
              <div
                key={kind.key}
                className="glass noise flex items-center gap-3 rounded-3xl border-card-border p-4 opacity-80"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{kind.title}</span>
                    <Badge variant="secondary" className="rounded-full text-[10px]">
                      Скоро
                    </Badge>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{kind.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScreenScaffold>
  );
}
