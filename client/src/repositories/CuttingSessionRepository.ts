import type { CuttingSession } from "../models";
import type { KeyValueStore } from "../storage/KeyValueStore";
import { storageKeys } from "../storage/StorageKeys";
import { CollectionRepository, type Repository } from "./Repository";

export type CuttingSessionRepository = Repository<CuttingSession>;

/** Persists production cutting sessions — the main production-history entity. */
export function createCuttingSessionRepository(
  store: KeyValueStore,
): CuttingSessionRepository {
  return new CollectionRepository<CuttingSession>(store, storageKeys.cuttingSessions);
}
