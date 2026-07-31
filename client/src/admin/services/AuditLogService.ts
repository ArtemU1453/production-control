import { nowIso } from "@/extensions/date";
import { makeId } from "@/utilities/id";
import { AuditAction, type AuditEntry } from "../models";
import type { AuditLogRepository } from "../repositories/AdminRepositories";

export interface AuditOptions {
  entity?: string;
  entityId?: string;
  user?: string;
  details?: string;
}

/** Records and lists auditable actions. */
export interface AuditLogService {
  record(action: AuditAction, options?: AuditOptions): Promise<AuditEntry>;
  list(): Promise<AuditEntry[]>;
  clear(): Promise<void>;
}

export function createAuditLogService(repository: AuditLogRepository): AuditLogService {
  return {
    async record(action, options) {
      const entry: AuditEntry = {
        id: makeId(),
        timestamp: nowIso(),
        action,
        entity: options?.entity,
        entityId: options?.entityId,
        user: options?.user,
        details: options?.details,
      };
      await repository.save(entry);
      return entry;
    },
    async list() {
      const all = await repository.getAll();
      return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },
    async clear() {
      await repository.clear();
    },
  };
}
