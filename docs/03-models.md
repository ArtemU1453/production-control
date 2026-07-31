# 4. Модели

Доменные модели — простые сериализуемые записи (JSON, стабильный `id`, без
поведения и зависимостей от UI). Живут в `client/src/models/` и барреле
`models/index.ts`.

## Производственные модели

### Material — материал (справочник)
`id`, `code` (ровно 8 символов, уникальный), `name`, `manufacturer`,
`thicknessMicron`, `standardWidthMm`, `description`, `createdAt`, `status`
(`MaterialStatus`: `active` / `archived`).

### Jumbo — Джамб (мастер-рулон на складе)
`id`, `stockNumber` (складской номер, уникальный), `materialId`,
`materialCode` (денормализация), `widthMm`, `initialWindingM`,
`currentRemainderM` (≥ 0), `arrivalDate`, `usageStartDate?`, `usageEndDate?`,
`status` (`JumboStatus`), комментарий и **накопительные** поля:
`usedLength`, `usefulArea`, `wasteArea`, `scrapArea`, `efficiency`,
`ordersCount`, `rollsCount`. Накопители обновляются инкрементально после
каждой операции; экраны их не пересчитывают.

`JumboStatus`: `onStock` (на складе) → `inWork` (в работе) →
`toWriteOff` (подлежит списанию, остаток < порога) → `archived` (в архиве).

### JumboOperation — операция журнала Джамба
`id`, `jumboId`, `type` (`JumboOperationType`: `receipt`, `usageStart`,
`edit`, `adjustment`, `archive`, `calculation`, `defect`, `writeOff`),
`timestamp`, опционально `sessionId`, `transactionId`, дельты
(`usedLengthDeltaM`, `usefulAreaDeltaM2`, `wasteAreaDeltaM2`,
`scrapAreaDeltaM2`), производственный контекст (`machine`, `customer`,
`orderNumber`, `remainderAfterM`, `rollsCount`) и флаг `isReverted`
(история неизменяема, запись не удаляется).

### CuttingOrder — вход расчёта (`CuttingOrderInput`)
`materialWidthMm`, `usefulWidthMm`, `rollWidthMm`, `rollLengthM`,
`bigRollLengthM`, `orderRolls`, `additionalWidthMm?`. Передаётся в движок
расчёта без изменений.

### CuttingRoll / RollDestination
Произведённый рулон; `RollDestination`: `order` (в заказ) / `warehouse`
(на склад).

### CuttingSession — производственная сессия (выполненный заказ)
`id`, `jumboId`, `jumboStockNumber`, `order` (`OrderInfo`: дата/время,
заказчик, номер заказа, оператор, станок, комментарий), `input`, `result`
(результат расчёта), метки времени.

### Machine — станок
Перечисление станков (`machine1`, `machine2`) с человекочитаемым названием.

### Waste — потери
`id`, `jumboId?`, `kind` (брак / технологический остаток), площадь/метраж,
время, комментарий.

### ArchivedJumbo — архивный снимок Джамба
`id`, `jumbo` (финальная копия), `operations[]`, `sessions[]`, `wastes[]`,
`statistics` (`ArchivedJumboStatistics`: площади/проценты/остаток/счётчики/
эффективность — **заморожены**), `usageStartDate?`, `usageEndDate?`,
`archivedAt`, `archivedBy?`, `comment?`.

### Report / DocumentSchedule
`Report` — вспомогательные типы отчётного слоя; `DocumentSchedule` —
расписание авто-рассылки (никогда/ежедневно/еженедельно/ежемесячно).

### Settings — настройки приложения (`AppSettings`)
Профиль (предприятие, оператор, e-mail), рассылка (получатели, CC/BCC, тема,
текст, авто-отправка, расписание), производство (порог списания
`jumboThresholdM`, число/названия станков, форматы даты/времени),
безопасность (PIN, биометрия, автоблокировка, подтверждение удаления),
`autoBackup`. Значения по умолчанию — `defaultSettings`.

## Модели администрирования (`admin/models`)

- **User / UserRole** — `id`, `name`, `role` (`operator`/`master`/`admin`),
  `active`, `createdAt`.
- **ErrorLogEntry** — `id`, `timestamp`, `description`, `stack?`, `action?`,
  `appVersion`.
- **AuditEntry / AuditAction** — `id`, `timestamp`, `action` (создание/
  редактирование/архивирование Джамба, расчёт, отправка отчёта, restore,
  backup, обслуживание), `entity?`, `entityId?`, `user?`, `details?`.
- **BackupData / BackupMeta** — `version`, `appVersion`, `createdAt`, `data`;
  метки `lastBackupAt` / `lastRestoreAt`.
- **DiagnosticsInfo / RecordCounts** — версии, счётчики записей, размер БД.
- **IntegrityIssue / IntegrityReport / MaintenanceResult** — результаты
  проверок обслуживания.
