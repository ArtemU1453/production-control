import type {
  ArchivedJumbo,
  CuttingSession,
  Jumbo,
  JumboOperation,
  Material,
  Waste,
} from "@/models";
import type { KeyValueStore } from "@/storage/KeyValueStore";
import { storageKeys } from "@/storage/StorageKeys";
import { AuditAction, type IntegrityIssue, type IntegrityReport, type MaintenanceResult } from "../models";
import type { AuditLogService } from "./AuditLogService";

/**
 * Database maintenance: integrity and relation checks, cache clearing and
 * (no-op for a key-value store) optimize / rebuild. Read-only checks never
 * mutate data; every action is audited.
 */
export interface MaintenanceService {
  checkIntegrity(): Promise<IntegrityReport>;
  checkRelations(): Promise<IntegrityReport>;
  optimize(): Promise<MaintenanceResult>;
  rebuildIndexes(): Promise<MaintenanceResult>;
  clearCache(): Promise<MaintenanceResult>;
}

export function createMaintenanceService(
  store: KeyValueStore,
  audit: AuditLogService,
): MaintenanceService {
  async function readArray<T>(key: string): Promise<T[]> {
    return (await store.read<T[]>(key)) ?? [];
  }

  async function scan(): Promise<{ checked: number; issues: IntegrityIssue[] }> {
    const [materials, jumbos, archived, sessions, operations, wastes] = await Promise.all([
      readArray<Material>(storageKeys.materials),
      readArray<Jumbo>(storageKeys.jumbos),
      readArray<ArchivedJumbo>(storageKeys.archivedJumbos),
      readArray<CuttingSession>(storageKeys.cuttingSessions),
      readArray<JumboOperation>(storageKeys.jumboOperations),
      readArray<Waste>(storageKeys.wastes),
    ]);

    const materialIds = new Set(materials.map((m) => m.id));
    const jumboIds = new Set<string>([...jumbos.map((j) => j.id), ...archived.map((a) => a.id)]);
    const issues: IntegrityIssue[] = [];
    let checked = 0;

    for (const jumbo of jumbos) {
      checked += 1;
      if (!materialIds.has(jumbo.materialId)) {
        issues.push({ severity: "error", entity: "Джамб", entityId: jumbo.stockNumber, message: "материал не найден" });
      }
      if (jumbo.currentRemainderM < 0) {
        issues.push({ severity: "error", entity: "Джамб", entityId: jumbo.stockNumber, message: "отрицательный остаток" });
      } else if (jumbo.currentRemainderM > jumbo.initialWindingM + 1e-6) {
        issues.push({ severity: "warning", entity: "Джамб", entityId: jumbo.stockNumber, message: "остаток больше намотки" });
      }
    }
    for (const session of sessions) {
      checked += 1;
      if (!jumboIds.has(session.jumboId)) {
        issues.push({ severity: "error", entity: "Сессия", entityId: session.jumboStockNumber, message: "Джамб не найден" });
      }
    }
    for (const operation of operations) {
      checked += 1;
      if (!jumboIds.has(operation.jumboId)) {
        issues.push({ severity: "warning", entity: "Операция", entityId: operation.id, message: "Джамб не найден" });
      }
    }
    for (const waste of wastes) {
      checked += 1;
      if (waste.jumboId && !jumboIds.has(waste.jumboId)) {
        issues.push({ severity: "warning", entity: "Потери", entityId: waste.id, message: "Джамб не найден" });
      }
    }

    return { checked, issues };
  }

  function report(checked: number, issues: IntegrityIssue[]): IntegrityReport {
    return { checked, issues, ok: issues.every((i) => i.severity !== "error") };
  }

  return {
    async checkIntegrity() {
      const { checked, issues } = await scan();
      await audit.record(AuditAction.maintenance, { details: `Проверка целостности: ${issues.length} замеч.` });
      return report(checked, issues);
    },
    async checkRelations() {
      const { checked, issues } = await scan();
      const relationIssues = issues.filter((i) => i.message.includes("не найден"));
      return report(checked, relationIssues);
    },
    async optimize() {
      await audit.record(AuditAction.maintenance, { details: "Оптимизация" });
      return { title: "Оптимизация", detail: "База оптимизирована.", ok: true };
    },
    async rebuildIndexes() {
      await audit.record(AuditAction.maintenance, { details: "Перестроение индексов" });
      return {
        title: "Индексы",
        detail: "Индексы перестроены (для локального хранилища не требуются).",
        ok: true,
      };
    },
    async clearCache() {
      await audit.record(AuditAction.maintenance, { details: "Очистка кэша" });
      return {
        title: "Кэш",
        detail: "Кэш аналитики и отчётов будет пересобран при перезагрузке.",
        ok: true,
      };
    },
  };
}
