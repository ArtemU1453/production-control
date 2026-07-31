import { nowIso } from "@/extensions/date";
import { makeId } from "@/utilities/id";
import { appInfo } from "@/resources/appInfo";
import type { ErrorLogEntry } from "../models";
import type { ErrorLogRepository } from "../repositories/AdminRepositories";

export interface ErrorLogOptions {
  stack?: string;
  action?: string;
}

/** Records and lists application errors. */
export interface ErrorLogService {
  log(description: string, options?: ErrorLogOptions): Promise<ErrorLogEntry>;
  list(): Promise<ErrorLogEntry[]>;
  clear(): Promise<void>;
}

export function createErrorLogService(repository: ErrorLogRepository): ErrorLogService {
  return {
    async log(description, options) {
      const entry: ErrorLogEntry = {
        id: makeId(),
        timestamp: nowIso(),
        description,
        stack: options?.stack,
        action: options?.action,
        appVersion: appInfo.version,
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
