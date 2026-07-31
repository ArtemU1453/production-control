import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Reports a caught render error to the logging layer. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time exceptions anywhere below it, keeping a crash from
 * blanking the whole app. React does not route render errors through
 * `window.onerror`, so this boundary is the only place they can be logged. The
 * fallback offers a reload; `onError` forwards the error to the crash log.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  private handleReload = (): void => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-destructive/10 text-destructive">
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" aria-hidden="true">
            <path
              d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Произошла ошибка</h1>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            Приложение столкнулось с непредвиденной ошибкой. Данные сохранены на устройстве.
            Перезагрузите экран, чтобы продолжить работу.
          </p>
        </div>
        <button
          type="button"
          onClick={this.handleReload}
          className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Перезагрузить
        </button>
      </div>
    );
  }
}
