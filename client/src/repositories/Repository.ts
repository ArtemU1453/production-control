import type { KeyValueStore } from "../storage/KeyValueStore";

/** An entity that can be stored in a collection repository. */
export interface Identifiable {
  id: string;
}

/**
 * Repository protocol. Repositories expose an async, UI-agnostic CRUD contract
 * over a collection of domain entities. Depending on this interface (not a
 * concrete class) keeps the ViewModel layer decoupled from storage.
 */
export interface Repository<T extends Identifiable> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | undefined>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Reusable collection repository backed by a {@link KeyValueStore}. Concrete
 * repositories subclass this and supply only their storage key, following
 * composition over inheritance for the actual persistence mechanism.
 */
export class CollectionRepository<T extends Identifiable>
  implements Repository<T>
{
  constructor(
    private readonly store: KeyValueStore,
    private readonly key: string,
  ) {}

  async getAll(): Promise<T[]> {
    return (await this.store.read<T[]>(this.key)) ?? [];
  }

  async getById(id: string): Promise<T | undefined> {
    const all = await this.getAll();
    return all.find((entity) => entity.id === id);
  }

  async save(entity: T): Promise<T> {
    const all = await this.getAll();
    const index = all.findIndex((existing) => existing.id === entity.id);
    if (index >= 0) {
      all[index] = entity;
    } else {
      all.unshift(entity);
    }
    await this.store.write(this.key, all);
    return entity;
  }

  async delete(id: string): Promise<void> {
    const all = await this.getAll();
    await this.store.write(
      this.key,
      all.filter((entity) => entity.id !== id),
    );
  }

  async clear(): Promise<void> {
    await this.store.remove(this.key);
  }
}
