import { cn } from "@/lib/utils";
import { AppRadius } from "@/designsystem";

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  /** Optional count badge (e.g. number of matches). */
  count?: number;
}

/**
 * FilterChip — a single selectable filter pill.
 *
 * Purpose: toggle a filter facet (status, material, machine…). Usage:
 * `<FilterChip label="В работе" active={f==='inWork'} onClick={…} count={3} />`.
 * Limits: single-select is the caller's concern; the chip only reflects `active`.
 * Depends on: Design System radius token.
 */
export function FilterChip({ label, active, onClick, count }: FilterChipProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition-colors",
        AppRadius.role.pill,
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card/60 text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      {count !== undefined ? (
        <span className={cn("rounded-full px-1.5 text-[10px]", active ? "bg-primary-foreground/20" : "bg-muted")}>
          {count}
        </span>
      ) : null}
    </button>
  );
}
