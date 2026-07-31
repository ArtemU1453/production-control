# 6. Сервисы

Сервисы содержат бизнес-операции и не зависят от React. Конструируются в
композиционном корне и внедряются через `useServices()`.

## Ядро (`services/`)

### CalculationService
Тонкая обёртка над **замороженным** движком расчёта
(`core/calculator/calculatorLogic.ts`). Адаптирует структурированный
`CuttingOrderInput` к сигнатуре движка, вызывая его теми же аргументами в том
же порядке. Поведение движка не изменяется — сервис существует лишь ради
абстракции для UI. См. [07-calculation-algorithm.md](07-calculation-algorithm.md).

### WarehouseService
Центральный производственный сервис. Операции:

- `receiveBatch(batch)` — приём партии сырья: создаёт Джамбы (`onStock`) и
  операции «Приход».
- `startUsage(jumboId, operator?)` — перевод Джамба в работу (`inWork`).
- `completeCalculation(params)` — **атомарная транзакция**: списывает остаток,
  создаёт `CuttingSession`, обновляет накопители Джамба, пишет операцию
  «Расчёт», при остатке ниже порога помечает Джамб `toWriteOff`. Возвращает
  `transactionId`; есть `rollbackTransaction`.
- `updateJumbo(jumbo, {operator, type})` — редактирование/корректировка с
  записью в журнал.
- `closeJumbo(params)` — закрытие Джамба: фиксирует технологический остаток
  (`Waste`), формирует `ArchivedJumbo` со снимком и замороженной статистикой,
  переводит Джамб в `archived`.
- `operationsFor(jumboId)` — журнал операций Джамба.
- `summarizeForClose(jumbo)` — предварительная сводка перед закрытием (чтение).

Константа `LOW_REMAINDER_THRESHOLD_M` — порог перевода в списание.

### ReportBuilder
Строит детальный отчёт по одному (архивному) Джамбу — секции и строки для
карточки архива (`buildJumboReport`).

### validation
Чистые валидаторы (`validateRequired`, `validateMaterialCode`,
`validatePositive`, `validateNonNegative`, `firstError`) — единые правила
проверки пользовательского ввода.

## Модульные центры

### ReportCenter (`reports/`)
`service.definitions()` — список видов отчётов; `service.generate(kind, filter)`
→ `ReportData` (агрегация через `ReportRepository`, кэш `ReportCache`),
`exporter` и `emailProvider`. См. [08-reports-kpi.md](08-reports-kpi.md).

### DocumentsCenter (`documents/`)
`service.preview/generateAndSend/resend/history`, `pdfBuilder`, `emailService`,
`transport`, `scheduler`. См. [10-email-pdf.md](10-email-pdf.md).

### AnalyticsService (`analytics/`)
`overview(filter?)` → `AnalyticsOverview` (KPI, аналитика Джамбов, операторы/
станки/материалы, рейтинги, тренд), `comparison(kind)` — сравнение периодов.
Один источник KPI (`KpiEngine`), общий с Dashboard, с кэшем по ключу
«фильтр + сигнатура данных». См. [08-reports-kpi.md](08-reports-kpi.md#kpi).

### AdminCenter (`admin/`)
`errorLog`, `audit`, `users`, `backup`, `maintenance`, `diagnostics`,
`exportProviders`, `importProviders`, `storageProviders`. См.
[09-archiving-backup.md](09-archiving-backup.md) и
[11-maintenance-guide.md](11-maintenance-guide.md).
