import { CollectionRepository, type Repository } from "@/repositories";
import type { KeyValueStore } from "@/storage/KeyValueStore";
import { storageKeys } from "@/storage/StorageKeys";
import type { GeneratedDocument } from "../models/GeneratedDocument";

export interface DocumentRepository extends Repository<GeneratedDocument> {
  /** All documents, newest first. */
  recent(): Promise<GeneratedDocument[]>;
}

class DefaultDocumentRepository
  extends CollectionRepository<GeneratedDocument>
  implements DocumentRepository
{
  constructor(store: KeyValueStore) {
    super(store, storageKeys.documents);
  }

  async recent(): Promise<GeneratedDocument[]> {
    const all = await this.getAll();
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export function createDocumentRepository(store: KeyValueStore): DocumentRepository {
  return new DefaultDocumentRepository(store);
}
