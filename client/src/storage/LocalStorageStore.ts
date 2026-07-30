import type { KeyValueStore } from "./KeyValueStore";

/**
 * `localStorage`-backed implementation of {@link KeyValueStore}.
 *
 * Reads/writes are wrapped in promises so call sites use async/await
 * uniformly and can be swapped for a genuinely asynchronous backend later
 * without changes.
 */
export class LocalStorageStore implements KeyValueStore {
  private get storage(): Storage | undefined {
    if (typeof window === "undefined") {
      return undefined;
    }
    return window.localStorage;
  }

  async read<T>(key: string): Promise<T | undefined> {
    const raw = this.storage?.getItem(key);
    if (raw === null || raw === undefined) {
      return undefined;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  async write<T>(key: string, value: T): Promise<void> {
    this.storage?.setItem(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    this.storage?.removeItem(key);
  }
}
