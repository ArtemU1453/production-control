import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingViewProps {
  message?: string;
  className?: string;
}

/** A centered spinner with an optional caption, used while data loads. */
export function LoadingView({ message = "Загрузка…", className }: LoadingViewProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground",
        className,
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
