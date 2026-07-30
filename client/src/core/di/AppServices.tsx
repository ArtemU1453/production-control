import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createAppContainer, type AppContainer } from "./container";

const AppServicesContext = createContext<AppContainer | null>(null);

/**
 * Provides the composed {@link AppContainer} to the React tree. A caller may
 * inject a custom container (e.g. for tests); otherwise the default one is
 * built from the local-storage backend.
 */
export function AppServicesProvider({
  container,
  children,
}: {
  container?: AppContainer;
  children: ReactNode;
}) {
  const value = useMemo(
    () => container ?? createAppContainer(),
    [container],
  );
  return (
    <AppServicesContext.Provider value={value}>
      {children}
    </AppServicesContext.Provider>
  );
}

export function useServices(): AppContainer {
  const container = useContext(AppServicesContext);
  if (!container) {
    throw new Error("useServices must be used within an AppServicesProvider");
  }
  return container;
}
