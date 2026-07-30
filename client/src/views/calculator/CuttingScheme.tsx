import { cn } from "@/lib/utils";
import { formatMm } from "@/extensions/number";
import type { CalcResult } from "@/services";

interface SchemePiece {
  label: string;
  width: number;
  kind: "primary" | "secondary" | "waste";
}

/**
 * Visualises the cross-section cutting layout of a Jumbo. Ported unchanged from
 * the original screen so the plan is drawn exactly as before.
 */
export function CuttingScheme({ plan }: { plan: CalcResult }) {
  const {
    material_width_mm,
    main_count,
    roll_width_mm,
    additional_width_mm,
    waste_per_side_mm,
  } = plan;

  const pieces: SchemePiece[] = [];

  if (waste_per_side_mm > 0.01) {
    pieces.push({ label: formatMm(waste_per_side_mm), width: waste_per_side_mm, kind: "waste" });
  }

  for (let i = 0; i < main_count; i++) {
    pieces.push({ label: formatMm(roll_width_mm), width: roll_width_mm, kind: "primary" });
  }

  if (additional_width_mm && additional_width_mm > 0) {
    pieces.push({ label: formatMm(additional_width_mm), width: additional_width_mm, kind: "secondary" });
  }

  if (waste_per_side_mm > 0.01) {
    pieces.push({ label: formatMm(waste_per_side_mm), width: waste_per_side_mm, kind: "waste" });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Схема раскроя</div>
        <div className="text-xs text-muted-foreground">Общая: {material_width_mm} мм</div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border bg-card p-3">
        <div className="absolute inset-0 noise" />
        <div className="relative flex h-24 w-full rounded-xl bg-muted/40 p-1">
          {(() => {
            let rollIndex = 0;
            return pieces.map((p, idx) => {
              const pct = (p.width / material_width_mm) * 100;
              const isRoll = p.kind === "primary" || p.kind === "secondary";

              let isTop = true;
              if (isRoll) {
                isTop = rollIndex % 2 === 0;
                rollIndex++;
              }

              const bg =
                p.kind === "primary"
                  ? "hsl(var(--muted-foreground))"
                  : p.kind === "secondary"
                    ? "hsl(var(--primary))"
                    : "hsl(var(--destructive) / 0.8)";

              return (
                <div
                  key={`${p.kind}-${idx}`}
                  className="relative flex h-full flex-col justify-center"
                  style={{ width: `${pct}%` }}
                  title={p.label}
                >
                  {isRoll ? (
                    <div
                      className={cn(
                        "absolute flex h-[48%] w-full items-center justify-center overflow-hidden rounded-[4px] border border-background/20 text-white shadow-sm",
                        isTop ? "top-0" : "bottom-0",
                      )}
                      style={{ background: bg }}
                    >
                      <div
                        className={cn(
                          "px-0.5 text-center text-[10px] font-medium leading-none tracking-tight sm:text-[11px]",
                          pct < 6 && "opacity-0",
                        )}
                      >
                        {p.label}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center overflow-hidden border-x border-background/10 text-muted-foreground opacity-50"
                      style={{ background: bg }}
                    >
                      {pct > 5 && (
                        <div className="rotate-[-90deg] whitespace-nowrap text-center text-[9px] leading-none">
                          {p.label}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>

        <div className="relative mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(var(--muted-foreground))" }} />
            Основная
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(var(--primary))" }} />
            Доп.
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(var(--destructive) / 0.8)" }} />
            Отход
          </div>
        </div>
      </div>
    </div>
  );
}
