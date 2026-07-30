import type { JumboOperation } from "../models";
import type { KeyValueStore } from "../storage/KeyValueStore";
import { storageKeys } from "../storage/StorageKeys";
import { CollectionRepository, type Repository } from "./Repository";

export interface JumboOperationRepository extends Repository<JumboOperation> {
  /** Returns the operations for one Jumbo, newest first. */
  forJumbo(jumboId: string): Promise<JumboOperation[]>;
}

class DefaultJumboOperationRepository
  extends CollectionRepository<JumboOperation>
  implements JumboOperationRepository
{
  constructor(store: KeyValueStore) {
    super(store, storageKeys.jumboOperations);
  }

  async forJumbo(jumboId: string): Promise<JumboOperation[]> {
    const all = await this.getAll();
    return all
      .filter((operation) => operation.jumboId === jumboId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
}

export function createJumboOperationRepository(
  store: KeyValueStore,
): JumboOperationRepository {
  return new DefaultJumboOperationRepository(store);
}
