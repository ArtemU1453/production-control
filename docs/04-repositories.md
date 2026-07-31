# 5. Репозитории

Repository Pattern изолирует доменную логику от хранилища. Все репозитории
реализуют интерфейс `Repository<T>` и, как правило, наследуют
`CollectionRepository<T>`.

## Базовый контракт

```ts
interface Repository<T extends Identifiable> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | undefined>;
  save(entity: T): Promise<T>;   // upsert по id, новые — в начало
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}
```

`CollectionRepository<T>` (`repositories/Repository.ts`) реализует контракт
над `KeyValueStore`, храня коллекцию под одним ключом. Конкретный репозиторий
задаёт только свой ключ — композиция вместо наследования механизма
персистентности.

## Производственные репозитории

| Репозиторий | Сущность | Ключ хранилища |
| --- | --- | --- |
| `MaterialRepository` | Material | `materials` |
| `JumboRepository` | Jumbo | `jumbos` |
| `JumboOperationRepository` | JumboOperation | `jumboOperations` |
| `CuttingSessionRepository` | CuttingSession | `cuttingSessions` |
| `WasteRepository` | Waste | `wastes` |
| `ArchivedJumboRepository` | ArchivedJumbo | `archivedJumbos` |

Некоторые из них добавляют доменные методы поверх базового CRUD (например,
выборки по `jumboId`), не нарушая контракт.

## SettingsRepository

Отдельный интерфейс (`load()` / `save(settings)`): настройки — единичный
объект, а не коллекция. Возвращает `defaultSettings` при отсутствии данных.

## Репозитории администрирования (`admin/repositories`)

`createErrorLogRepository`, `createAuditLogRepository`, `createUserRepository`
— тонкие обёртки над `CollectionRepository<T>` для `ErrorLogEntry`,
`AuditEntry`, `User` соответственно.

## Отчётный слой

`ReportRepository` (`reports/`) — не CRUD, а **агрегатор**: один раз через
`Promise.all` загружает все нужные коллекции и собирает `ReportContext`,
на котором работают построители отчётов и `KpiEngine`. Это единственный
источник агрегированных данных для отчётов и аналитики.
