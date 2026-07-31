# Калькулятор нарезки — производственный учёт

Промышленное приложение для участка нарезки рулонных материалов (Джамбов):
расчёт раскроя, склад, полный жизненный цикл Джамба, производственные отчёты
(PDF/e-mail), аналитика/KPI, центр решений (уведомления, прогнозы, качество,
рекомендации), администрирование и резервное копирование.

> **Платформа.** Репозиторий исторически назван «iOS», но фактически это
> **веб-PWA** (React 19 + TypeScript + Vite). iOS-понятия соотнесены с
> веб-эквивалентами (SwiftData → `KeyValueStore`/репозитории; MVVM → хуки-
> ViewModel; Swift Concurrency → `async/await`; App Store → релиз PWA).

## Технологии

React 19 · TypeScript (strict) · Vite 7 · wouter (роутинг) · Tailwind + shadcn/ui
· framer-motion · recharts (lazy) · react-hook-form + zod.

## Быстрый старт

```bash
npm install
npm run dev:client       # разработка (Vite, порт 5000)
npm run check            # проверка типов (tsc)
npx vite build           # production-сборка → dist/public/
```

Данные хранятся локально (`localStorage`); сеть и разрешения устройства не
требуются — приложение работает офлайн.

## Структура проекта

```
client/src/
├── core/          calculator (алгоритм — заморожен), di (composition root), theme
├── designsystem/  токены Apple-уровня (AppTheme/Colors/Typography/… + haptics)
├── models/        доменные модели (plain, сериализуемые)
├── storage/       KeyValueStore, LocalStorageStore, StorageKeys
├── repositories/  CollectionRepository<T> + коллекции
├── services/      Calculation, Warehouse, ReportBuilder, validation
├── reports/       Report Center (ReportContext, builders, cache, export)
├── documents/     PDF (печать HTML), e-mail (симуляция), планировщик
├── analytics/     KpiEngine, AnalyticsService, графики (lazy)
├── admin/         журналы, аудит, пользователи, backup, обслуживание, диагностика
├── intelligence/  центр решений: уведомления, прогнозы, качество, поиск, интеграции
├── app/           провайдеры, навигация, ErrorBoundary
├── components/    библиотека UI-компонентов (на Design System)
├── viewmodels/    хуки-ViewModel
├── views/         экраны
└── resources/     strings, i18n, icons, appInfo
```

## Архитектура

Clean Architecture + MVVM + Repository Pattern + Dependency Injection.
Слои: Models → Storage(`KeyValueStore`) → Repositories → Services → Composition
(`createAppContainer`) → ViewModels(хуки) → Views. Зависимости направлены
внутрь; всё внедряется через `useServices()`. Циклических зависимостей нет.

**Инвариант проекта:** алгоритм расчёта
(`client/src/core/calculator/calculatorLogic.ts`) заморожен и не изменяется.

## Документация

Полная техническая документация — в каталоге [`docs/`](docs/README.md):
архитектура, база данных (+ER), модели, репозитории, сервисы, бизнес-процессы,
алгоритм расчёта, отчёты/KPI, архивирование/бэкап, e-mail/PDF, Design System и
UI-компоненты, центр решений, сопровождение, выпуск версий, roadmap и
[release-checklist](docs/16-release-checklist.md).

История изменений по этапам — в [`CHANGELOG.md`](CHANGELOG.md).

## Проверки перед коммитом

- `npx tsc` — 0 ошибок; `--noUnusedLocals/Parameters` чисто в клиентском коде.
- `npx vite build` — без предупреждений; все чанки < 500 КБ.
- `git diff origin/main -- client/src/core/calculator/calculatorLogic.ts` — пусто.
