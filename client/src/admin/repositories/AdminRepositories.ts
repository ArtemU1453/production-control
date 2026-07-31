import { CollectionRepository, type Repository } from "@/repositories";
import type { KeyValueStore } from "@/storage/KeyValueStore";
import { storageKeys } from "@/storage/StorageKeys";
import type { AuditEntry, ErrorLogEntry, User } from "../models";

export type ErrorLogRepository = Repository<ErrorLogEntry>;
export type AuditLogRepository = Repository<AuditEntry>;
export type UserRepository = Repository<User>;

export function createErrorLogRepository(store: KeyValueStore): ErrorLogRepository {
  return new CollectionRepository<ErrorLogEntry>(store, storageKeys.errorLogs);
}

export function createAuditLogRepository(store: KeyValueStore): AuditLogRepository {
  return new CollectionRepository<AuditEntry>(store, storageKeys.auditLogs);
}

export function createUserRepository(store: KeyValueStore): UserRepository {
  return new CollectionRepository<User>(store, storageKeys.users);
}
