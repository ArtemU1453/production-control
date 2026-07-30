import type { Material } from "../models";
import type { KeyValueStore } from "../storage/KeyValueStore";
import { storageKeys } from "../storage/StorageKeys";
import { CollectionRepository, type Repository } from "./Repository";

export interface MaterialRepository extends Repository<Material> {
  /** Finds a material by its unique code, if any. */
  findByCode(code: string): Promise<Material | undefined>;
}

class DefaultMaterialRepository
  extends CollectionRepository<Material>
  implements MaterialRepository
{
  constructor(store: KeyValueStore) {
    super(store, storageKeys.materials);
  }

  async findByCode(code: string): Promise<Material | undefined> {
    const all = await this.getAll();
    return all.find((material) => material.code === code);
  }
}

export function createMaterialRepository(store: KeyValueStore): MaterialRepository {
  return new DefaultMaterialRepository(store);
}
