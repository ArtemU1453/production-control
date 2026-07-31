# 1. Архитектура

## Стиль

Clean Architecture + MVVM + Repository Pattern + Dependency Injection.
Зависимости направлены строго внутрь: UI зависит от абстракций, доменные
сервисы не знают о React, слой хранения скрыт за интерфейсом `KeyValueStore`.

## Слои

```
┌──────────────────────────────────────────────────────────────┐
│ Views (client/src/**/views)                                   │
│   экраны на React + дизайн-система (components/)               │
├──────────────────────────────────────────────────────────────┤
│ ViewModels (хуки use*.ts)                                      │
│   состояние экрана, вызовы сервисов, никакой разметки          │
├──────────────────────────────────────────────────────────────┤
│ Services / Centers                                            │
│   Calculation · Warehouse · ReportCenter · Documents ·        │
│   Analytics · Admin                                           │
├──────────────────────────────────────────────────────────────┤
│ Repositories (CollectionRepository<T>)                        │
│   CRUD над коллекциями доменных сущностей                      │
├──────────────────────────────────────────────────────────────┤
│ Storage — KeyValueStore (= StorageProvider)                   │
│   LocalStorageStore (активен) │ cloud (заготовка)              │
└──────────────────────────────────────────────────────────────┘
        ▲ Composition root: createAppContainer(store)
        │ React-контекст:   useServices() → AppContainer
```

## Композиционный корень и внедрение зависимостей

`client/src/core/di/container.ts` — единственное место, где создаются все
репозитории и сервисы. `AppServicesProvider` кладёт собранный `AppContainer`
в React-контекст, экраны получают зависимости через `useServices()`. Смена
бэкенда хранения или подстановка тест-двойников — изменение одного файла.

`AppContainer` содержит: репозитории (`materials`, `jumbos`, `jumboOperations`,
`cuttingSessions`, `wastes`, `archivedJumbos`, `settings`), сервисы
(`calculation`, `warehouse`, `reportBuilder`) и модульные центры
(`reportCenter`, `documents`, `analytics`, `admin`).

## Провайдеры приложения

`app/providers/AppProviders.tsx` собирает дерево провайдеров в порядке:

```
QueryClientProvider
  └ AppServicesProvider (DI)
      └ CrashLoggingBoundary (ErrorBoundary → admin.errorLog)
          └ ThemeManager (light/dark/system)
              └ MotionConfig reducedMotion="user"
                  └ TooltipProvider
                      └ <экраны> + Toaster
```

## Модули (высокая связность, слабое зацепление)

| Модуль | Назначение |
| --- | --- |
| `core/` | алгоритм расчёта (**заморожен**), DI, тема |
| `models/` | доменные модели (plain, сериализуемые) |
| `storage/` | `KeyValueStore`, `LocalStorageStore`, ключи |
| `repositories/` | `CollectionRepository<T>` + коллекции |
| `services/` | Calculation, Warehouse, ReportBuilder, validation |
| `reports/` | Report Center: агрегация, builders, кэш, экспорт |
| `documents/` | PDF (печать HTML), e-mail (симуляция), планировщик |
| `analytics/` | KpiEngine, AnalyticsService, графики (lazy) |
| `admin/` | журналы, аудит, пользователи, бэкап, обслуживание, диагностика |
| `app/` | провайдеры, навигация, ErrorBoundary |
| `components/` | дизайн-система |
| `resources/` | строки, i18n, иконки, appInfo |

Циклических зависимостей нет (проверено `madge --circular`, 247 файлов).

## Расширяемость (Open/Closed)

Точки расширения оформлены реестрами — новое подключается без правки
существующего кода:

- **Report builders** — реестр построителей отчётов (7 видов).
- **Export / email providers** — провайдеры экспорта и рассылки.
- **KPI engine** — чистые функции над `ReportContext`.
- **StorageProvider** — локальный/облачный бэкенд.
- **Export/Import providers** (админ) — JSON рабочий, CSV/Excel/импорт — заготовки.
- **Роли пользователей** — модель `User`/`UserRole` для многопользовательского режима.

## Тестируемость

Все зависимости абстрактны и внедряются. `createAppContainer(new MemoryStore())`
поднимает всю систему на in-memory хранилище — этим пользуются проверочные
harness'ы (полный производственный цикл, edge-cases, нагрузка). Чистый
`KpiEngine` и алгоритм расчёта тестируются как функции без окружения.
