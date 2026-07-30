import type { CuttingOrder } from "../models";
import type { KeyValueStore } from "../storage/KeyValueStore";
import { storageKeys } from "../storage/StorageKeys";
import { CollectionRepository, type Repository } from "./Repository";

export type CuttingOrderRepository = Repository<CuttingOrder>;

/** Persists saved cutting orders (the calculation history). */
export function createCuttingOrderRepository(
  store: KeyValueStore,
): CuttingOrderRepository {
  return new CollectionRepository<CuttingOrder>(store, storageKeys.cuttingOrders);
}
