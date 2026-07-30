/**
 * Low-level persistence abstraction.
 *
 * Repositories depend on this interface, never on a concrete backend. Today it
 * is backed by `localStorage`; a future phase can supply an IndexedDB- or
 * server-backed implementation with no changes above this line.
 */
export interface KeyValueStore {
  read<T>(key: string): Promise<T | undefined>;
  write<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}
