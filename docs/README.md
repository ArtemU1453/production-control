# Техническая документация — Калькулятор нарезки

Промышленное приложение производственного учёта нарезки рулонных материалов
(Джамбов): расчёт раскроя, склад, полный жизненный цикл Джамба, отчёты,
PDF/e-mail, аналитика/KPI, администрирование, резервное копирование.

> **Платформа.** Репозиторий исторически назван «iOS», но фактически это
> **веб-PWA** (React 19 + TypeScript + Vite). Далее iOS-понятия соотнесены с
> веб-эквивалентами: SwiftData → `KeyValueStore`/репозитории; MVVM → хуки-
> ViewModel; Swift Concurrency → `async/await`; App Store → релиз PWA;
> `Localizable.strings` → `resources/strings.ts` + `resources/i18n.ts`.

## Карта документов (соответствие требованиям Этапа 10)

| # | Требование | Документ |
| --- | --- | --- |
| 1 | Описание архитектуры | [01-architecture.md](01-architecture.md) |
| 2 | Описание базы данных | [02-database.md](02-database.md) |
| 3 | ER Diagram | [02-database.md](02-database.md#er-диаграмма) |
| 4 | Описание всех моделей | [03-models.md](03-models.md) |
| 5 | Описание всех Repository | [04-repositories.md](04-repositories.md) |
| 6 | Описание всех Services | [05-services.md](05-services.md) |
| 7 | Описание бизнес-процессов | [06-business-processes.md](06-business-processes.md) |
| 8 | Описание алгоритма расчёта | [07-calculation-algorithm.md](07-calculation-algorithm.md) |
| 9 | Жизненный цикл Джамба | [06-business-processes.md](06-business-processes.md#жизненный-цикл-джамба) |
| 10 | Формирование отчётов | [08-reports-kpi.md](08-reports-kpi.md) |
| 11 | KPI | [08-reports-kpi.md](08-reports-kpi.md#kpi) |
| 12 | Система архивирования | [09-archiving-backup.md](09-archiving-backup.md#архивирование) |
| 13 | Резервное копирование | [09-archiving-backup.md](09-archiving-backup.md#резервное-копирование) |
| 14 | Email Service | [10-email-pdf.md](10-email-pdf.md#email-service) |
| 15 | PDF Builder | [10-email-pdf.md](10-email-pdf.md#pdf-builder) |
| 16 | Сопровождение проекта | [11-maintenance-guide.md](11-maintenance-guide.md) |
| 17 | Выпуск новых версий | [12-release-guide.md](12-release-guide.md) |
| 18 | Roadmap | [13-roadmap.md](13-roadmap.md) |
| + | Design System и UI-компоненты | [14-ui-design-system.md](14-ui-design-system.md) |
| + | Центр решений (Intelligence, v2.0) | [15-intelligence.md](15-intelligence.md) |
| + | Release Checklist | [16-release-checklist.md](16-release-checklist.md) |

## Быстрый старт для разработчика

```bash
npm install
npm run dev:client       # запуск клиента (Vite, порт 5000)
npm run check            # проверка типов (tsc)
npx vite build           # production-сборка
```

Инвариант всего проекта: **алгоритм расчёта нарезки
(`client/src/core/calculator/calculatorLogic.ts`) не изменяется** — он
проверен и заморожен, вся остальная система строится вокруг него.
