import type { ArchivedJumbo } from "../models";
import type { KeyValueStore } from "../storage/KeyValueStore";
import { storageKeys } from "../storage/StorageKeys";
import { CollectionRepository, type Repository } from "./Repository";

export type ArchivedJumboRepository = Repository<ArchivedJumbo>;

/** Persists archived Jumbos. Wired now; the migration that populates it is a
 *  later phase. */
export function createArchivedJumboRepository(
  store: KeyValueStore,
): ArchivedJumboRepository {
  return new CollectionRepository<ArchivedJumbo>(store, storageKeys.archivedJumbos);
}
