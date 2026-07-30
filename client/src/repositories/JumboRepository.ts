import type { Jumbo } from "../models";
import type { KeyValueStore } from "../storage/KeyValueStore";
import { storageKeys } from "../storage/StorageKeys";
import { CollectionRepository, type Repository } from "./Repository";

export type JumboRepository = Repository<Jumbo>;

/** Persists warehouse Jumbo records. Wired now; the warehouse UI arrives in a
 *  later phase. */
export function createJumboRepository(store: KeyValueStore): JumboRepository {
  return new CollectionRepository<Jumbo>(store, storageKeys.jumbos);
}
