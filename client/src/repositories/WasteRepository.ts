import type { Waste } from "../models";
import type { KeyValueStore } from "../storage/KeyValueStore";
import { storageKeys } from "../storage/StorageKeys";
import { CollectionRepository, type Repository } from "./Repository";

export interface WasteRepository extends Repository<Waste> {
  /** Returns the waste records for one Jumbo. */
  forJumbo(jumboId: string): Promise<Waste[]>;
}

class DefaultWasteRepository
  extends CollectionRepository<Waste>
  implements WasteRepository
{
  constructor(store: KeyValueStore) {
    super(store, storageKeys.wastes);
  }

  async forJumbo(jumboId: string): Promise<Waste[]> {
    const all = await this.getAll();
    return all.filter((waste) => waste.jumboId === jumboId);
  }
}

export function createWasteRepository(store: KeyValueStore): WasteRepository {
  return new DefaultWasteRepository(store);
}
