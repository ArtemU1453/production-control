import type { FinishedRoll } from "../models";
import type { KeyValueStore } from "../storage/KeyValueStore";
import { storageKeys } from "../storage/StorageKeys";
import { CollectionRepository, type Repository } from "./Repository";

export type FinishedRollRepository = Repository<FinishedRoll>;

/** Persists finished-goods rolls — the finished-products warehouse ledger. A
 *  ledger distinct from the material (Jumbo) warehouse. */
export function createFinishedRollRepository(store: KeyValueStore): FinishedRollRepository {
  return new CollectionRepository<FinishedRoll>(store, storageKeys.finishedRolls);
}
