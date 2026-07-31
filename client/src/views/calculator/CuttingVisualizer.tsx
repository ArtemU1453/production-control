import { useMemo } from "react";
import { Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMm } from "@/extensions/number";
import { AppTypography } from "@/designsystem";
import {
  STRIPE_FILL,
  STRIPE_LABEL_MIN_PERCENT,
  type CuttingModel,
  type StripeKind,
} from "./cuttingModel";

interface CuttingVisualizerProps {
  model: CuttingModel;
  /** Currently highlighted stripe kind (shared with the results grid). */
  activeKind: StripeKind | null;
  onActiveKindChange: (kind: StripeKind | null) => void;
  className?: string;
}

const KIND_LABEL: Record<StripeKind, string> = {
  main: "Основной ручей",
  additional: "Доп. ручей",
  waste: "Кромка (обрез)",
};

/** Diagonal hatch overlay used to mark the trimmed (waste) edges. */
const WASTE_HATCH =
  "repeating-linear-gradient(45deg, hsl(var(--destructive-foreground) / 0.25) 0 3px, transparent 3px 7px)";

/**
 * CuttingVisualizer — the hero cross-section ("вид сверху") of the Jumbo.
 *
 * The single largest element on the screen: it shows, at a glance, how the web
 * is split across its width — trimmed edges, every main knife lane, an optional
 * additional lane — with knife markers between lanes and the width dimension
 * under each band. Bands are keyed to the results grid: hovering/focusing a band
 * highlights its row and vice-versa via `activeKind`.
 *
 * Purely presentational — it renders the {@link CuttingModel} arrangement and
 * never computes production figures. On narrow screens the track keeps a
 * touch-sized minimum width and scrolls horizontally.
 */
export function CuttingVisualizer({
  model,
  activeKind,
  onActiveKindChange,
  className,
}: CuttingVisualizerProps) {
  const { stripes, materialWidthMm, knifeCount } = model;

  // Keep every band at least touch-sized; when many lanes exist the track
  // exceeds the viewport and scrolls instead of collapsing to slivers.
  const minTrackWidth = useMemo(
    () => Math.max(320, stripes.length * 44),
    [stripes.length],
  );

  const ariaSummary = useMemo(() => {
    const parts = model.groups.map((g) =>
      g.id === "waste"
        ? `кромка ${formatMm(g.widthMm)} с каждой стороны`
        : `${g.perCycle}×${formatMm(g.widthMm)} ${g.id === "main" ? "основных" : "доп."}`,
    );
    return `Схема раскроя материала шириной ${formatMm(materialWidthMm)}: ${parts.join(", ")}. Ножей: ${knifeCount}.`;
  }, [model.groups, materialWidthMm, knifeCount]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={cn(AppTypography.subheadline, "flex items-center gap-2")}>
          <Scissors className="h-4 w-4 text-primary" aria-hidden />
          Схема раскроя · вид сверху
        </div>
        <div className={cn(AppTypography.footnote, "flex items-center gap-3 text-muted-foreground")}>
          <span>
            Ширина: <span className="font-semibold text-foreground">{formatMm(materialWidthMm)}</span>
          </span>
          <span>
            Ножей: <span className="font-semibold text-foreground">{knifeCount}</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-card-border bg-muted/30 p-3">
        <div style={{ minWidth: minTrackWidth }}>
          {/* The web, viewed from above. */}
          <div
            className="relative flex h-40 w-full overflow-hidden rounded-xl bg-background/60 shadow-inner sm:h-52 lg:h-60"
            role="img"
            aria-label={ariaSummary}
          >
            {stripes.map((stripe, idx) => {
              const isActive = activeKind === stripe.kind;
              const dim = activeKind !== null && !isActive;
              const showLabel = stripe.widthPercent >= STRIPE_LABEL_MIN_PERCENT;
              const isCut = stripe.kind !== "waste";
              // Alternate main-lane brightness so adjacent identical lanes read
              // as separate rolls.
              const shade = stripe.kind === "main" && stripe.ordinal % 2 === 0 ? "brightness-110" : "";
              const showKnife = idx > 0 && (isCut || stripes[idx - 1].kind !== "waste");

              return (
                <button
                  key={stripe.id}
                  type="button"
                  title={`${KIND_LABEL[stripe.kind]} — ${formatMm(stripe.widthMm)}`}
                  aria-label={`${KIND_LABEL[stripe.kind]}, ширина ${formatMm(stripe.widthMm)}`}
                  aria-pressed={isActive}
                  onMouseEnter={() => onActiveKindChange(stripe.kind)}
                  onMouseLeave={() => onActiveKindChange(null)}
                  onFocus={() => onActiveKindChange(stripe.kind)}
                  onBlur={() => onActiveKindChange(null)}
                  className={cn(
                    "group relative flex h-full flex-col items-center justify-end outline-none transition-[opacity,transform] duration-200",
                    "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
                    dim && "opacity-40",
                  )}
                  style={{ width: `${stripe.widthPercent}%` }}
                >
                  {/* Knife marker between adjacent cut lanes. */}
                  {showKnife ? (
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 z-10 w-px -translate-x-1/2 bg-foreground/70"
                    >
                      <span className="absolute -top-0.5 left-1/2 flex h-3 w-3 -translate-x-1/2 items-center justify-center rounded-full bg-foreground text-background">
                        <Scissors className="h-2 w-2" />
                      </span>
                    </span>
                  ) : null}

                  {/* The lane fill. */}
                  <span
                    className={cn(
                      "flex h-full w-full flex-col items-center justify-center gap-0.5 border-x border-background/20 transition-transform duration-200",
                      shade,
                      isActive && "scale-[1.02]",
                    )}
                    style={{
                      background: STRIPE_FILL[stripe.kind],
                      backgroundImage: stripe.kind === "waste" ? WASTE_HATCH : undefined,
                    }}
                  >
                    {showLabel ? (
                      <span
                        className={cn(
                          "px-0.5 text-center text-[11px] font-semibold leading-none tracking-tight text-white drop-shadow-sm",
                          stripe.kind === "waste" && "rotate-[-90deg] whitespace-nowrap text-[10px]",
                        )}
                      >
                        {stripe.kind === "waste" ? "обрез" : formatMm(stripe.widthMm)}
                      </span>
                    ) : null}
                    {showLabel && isCut ? (
                      <span className="text-[9px] font-medium leading-none text-white/80">
                        №{stripe.ordinal}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Width dimension axis. */}
          <div className="mt-2 flex items-center gap-2 px-1" aria-hidden>
            <span className="h-2 w-px bg-muted-foreground/60" />
            <span className="h-px flex-1 bg-muted-foreground/40" />
            <span className={cn(AppTypography.caption, "whitespace-nowrap text-muted-foreground")}>
              {formatMm(materialWidthMm)}
            </span>
            <span className="h-px flex-1 bg-muted-foreground/40" />
            <span className="h-2 w-px bg-muted-foreground/60" />
          </div>
        </div>
      </div>

      {/* Legend. */}
      <div className={cn(AppTypography.caption, "flex flex-wrap items-center gap-x-4 gap-y-1")}>
        {(["main", "additional", "waste"] as const)
          .filter((kind) => model.groups.some((g) => g.id === kind))
          .map((kind) => (
            <button
              key={kind}
              type="button"
              onMouseEnter={() => onActiveKindChange(kind)}
              onMouseLeave={() => onActiveKindChange(null)}
              onFocus={() => onActiveKindChange(kind)}
              onBlur={() => onActiveKindChange(null)}
              className={cn(
                "flex items-center gap-2 rounded-md px-1 py-0.5 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring",
                activeKind !== null && activeKind !== kind && "opacity-40",
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: STRIPE_FILL[kind],
                  backgroundImage: kind === "waste" ? WASTE_HATCH : undefined,
                }}
              />
              <span className="text-muted-foreground">{KIND_LABEL[kind]}</span>
            </button>
          ))}
      </div>
    </div>
  );
}
