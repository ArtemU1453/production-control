# 17. Масштабируемость и инфраструктура (подготовка к развитию)

Слой «foundation», подготавливающий проект к многолетнему развитию без
накопления технического долга. Инфраструктура **аддитивна**: бизнес-логика,
UI, алгоритм расчёта и пользовательские сценарии не изменяются.

## Конфигурация (`client/src/config/`)

Единый источник конфигурации — без «магических» констант в коде.

- **AppEnvironment** — окружение (`development`/`test`/`production`), выводится из
  `import.meta.env` на этапе сборки.
- **FeatureFlags** — центральные флаги подготовленных, но не включённых
  возможностей (облако, многопользовательский режим, CSV/Excel-экспорт, импорт,
  английская локаль, реальный e-mail, автобэкап по расписанию, внешние
  интеграции). Сегодня все выключены — отражают выпущенное поведение; включение
  функции = переключение флага, а не рефакторинг.
- **AppConfig** — агрегат окружения, флагов и метаданных (`appInfo`).

## Логирование (`client/src/core/logging/Logger.ts`)

Единый leveled-логгер: `debug < info < warn < error`. В production минимальный
уровень — `warn`, консольный sink полностью отключён (Release-сборка «тихая»).
Sinks подключаемы (крэш-бэкенд, аналитика). Заменяет ad-hoc `console.*`.

## Обработка ошибок (`client/src/core/errors/`)

- **AppError** — единая структура ошибки: `code`, `severity`
  (`warning/error/critical`), технический `message`, `userMessage`, `context`,
  `cause`. `toAppError` нормализует любой брошенный объект.
- **ErrorHandler** — единая точка: нормализует → логирует (Logger) → сохраняет
  (журнал ошибок) → передаёт в крэш-репортер (no-op) → возвращает безопасное
  сообщение пользователю. Ошибка не пробрасывается повторно — обработанный сбой
  не роняет приложение. Глобальный обработчик `window.onerror`/
  `unhandledrejection` и React `ErrorBoundary` переведены на него.

## Мониторинг (`client/src/core/monitoring/Monitoring.ts`)

Только **точки интеграции** (протоколы), без SDK: `CrashReporter`,
`AnalyticsTracker`, `PerformanceMonitor`. По умолчанию — no-op. Реальный бэкенд
(Sentry/Firebase/собственный) подключается реализацией интерфейса и передачей в
`createMonitoring`, без изменения бизнес-кода.

## Диаграмма модулей

```
config ──► core/logging ──► core/errors ──► core/monitoring
                                   │
                                   ▼
        core/di (createAppContainer) собирает всё
        ▲            ▲          ▲         ▲          ▲
   repositories   services   reports/  admin/    intelligence/
                             documents/
                             analytics/
```

## Диаграмма зависимостей (foundation)

```
AppConfig ─uses→ AppEnvironment, FeatureFlags, appInfo
Logger    ─uses→ AppConfig                (гейт уровня по окружению)
ErrorHandler ─uses→ Logger, AppError      (+ report-sinks: errorLog, crash)
Monitoring ─uses→ AppError                (no-op по умолчанию)
container ─uses→ всё вышеперечисленное; экраны получают через useServices()
```
Зависимости направлены внутрь; циклов нет (`madge --circular`).

## Потоки данных (ошибки)

```
window.onerror / unhandledrejection / ErrorBoundary
        └► errorHandler.handle(error, code)
              → toAppError → logger.(warn|error)
              → report-sinks: admin.errorLog.log (персист) + monitoring.crash (no-op)
              → возвращает userMessage (для тоста/inline)
```

## Точки расширения (проверка масштабируемости)

| Расширение | Как добавляется (без рефакторинга) |
| --- | --- |
| Новый тип материала | данные (`Material`), справочник — без изменения кода |
| Новый станок | значение `Machine` + строка названия |
| Дополнительный отчёт | построитель в реестр `reports/builders` |
| Новая роль пользователя | значение `UserRole` |
| Облачная синхронизация | реализация `StorageProvider` + флаг `cloudSync` |
| Многопользовательский режим | модель `User` уже есть + флаг `multiUser` |
| Крэш-репортинг/аналитика/перф | реализация протоколов `Monitoring` |
| Внешние интеграции | реализация `IntegrationProvider` + флаг |
| Экспорт/импорт форматов | провайдеры `DataExport`/импорта + флаги |

## Рекомендации по дальнейшему развитию

- Включать возможности через `FeatureFlags`, а не ветвлением по окружению.
- Новые сервисы конструировать только в композиционном корне и внедрять через
  `useServices()`; зависеть от интерфейсов, не от реализаций.
- При росте объёмов — реализовать `KeyValueStore` поверх IndexedDB (интерфейс
  готов), затем включить облачный провайдер.
- Подключить реальный `Monitoring`-бэкенд и реальный `EmailTransport` заменой
  реализаций, без изменения вызывающего кода.
- Логи и ошибки уже единообразны — новые модули используют `logger` и
  `errorHandler`, не `console.*` и не собственные форматы.
