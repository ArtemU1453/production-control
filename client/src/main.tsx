import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setMachineDisplayNames } from "./models";
import { storageKeys } from "./storage/StorageKeys";

// Seed the machine-name registry synchronously from persisted settings before
// the first render, so machine cards show the operator's names immediately on a
// page reload (localStorage is synchronous; the async settings repository keeps
// the registry updated afterwards on load/save).
try {
  const raw = window.localStorage.getItem(storageKeys.settings);
  if (raw) {
    const stored = JSON.parse(raw) as { machineNames?: unknown };
    if (typeof stored.machineNames === "string") {
      setMachineDisplayNames(stored.machineNames);
    }
  }
} catch {
  // Ignore — fall back to the numbered machine names.
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container #root was not found");
}

createRoot(container).render(<App />);
