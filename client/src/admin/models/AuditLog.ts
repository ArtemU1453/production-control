/** Auditable action types. */
export enum AuditAction {
  jumboCreate = "jumboCreate",
  jumboEdit = "jumboEdit",
  jumboDelete = "jumboDelete",
  jumboArchive = "jumboArchive",
  calculation = "calculation",
  reportSend = "reportSend",
  restore = "restore",
  backup = "backup",
  maintenance = "maintenance",
}

const titles: Record<AuditAction, string> = {
  [AuditAction.jumboCreate]: "Создание Джамба",
  [AuditAction.jumboEdit]: "Редактирование",
  [AuditAction.jumboDelete]: "Удаление",
  [AuditAction.jumboArchive]: "Архивирование",
  [AuditAction.calculation]: "Расчёт",
  [AuditAction.reportSend]: "Отправка отчёта",
  [AuditAction.restore]: "Восстановление",
  [AuditAction.backup]: "Резервное копирование",
  [AuditAction.maintenance]: "Обслуживание",
};

export function auditActionTitle(action: AuditAction): string {
  return titles[action];
}

/** A recorded auditable action. */
export interface AuditEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  entity?: string;
  entityId?: string;
  user?: string;
  details?: string;
}
