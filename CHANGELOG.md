# CHANGELOG

## Этап 1 — Рефакторинг архитектуры и полное обновление интерфейса

> Примечание о платформе. Репозиторий `Kalkuliator-nariezchika-iOS` — это
> веб-приложение (React + TypeScript + Vite, PWA для установки на iOS), а не
> нативный Swift/Xcode-проект. Нативного iOS-кода в репозитории нет. По
> согласованию с заказчиком цели этапа (архитектура, единый UI, модели склада /
> аналитики / отчётов, экраны-заглушки, настройки) реализованы на существующем
> веб-стеке. Понятия iOS отображены на веб-эквиваленты: MVVM → ViewModel-хуки,
> `NavigationStack`/`TabView` → `wouter` + постоянный `TabBar`, `AppStorage` →
> репозиторий настроек поверх `localStorage`, слой хранения спроектирован как
> заменяемый (переход на серверное/IndexedDB-хранилище не затронет вышестоящие
> слои).

### Главное

- **Алгоритм расчёта не изменён.** Файл движка перенесён без единой правки
  (`lib/calculator_logic.ts` → `core/calculator/calculatorLogic.ts`, diff:
  0 добавлений / 0 удалений). Все результаты идентичны прежним.
- Приложение полностью пересобрано по слоистой архитектуре (см. ниже).
- Интерфейс приведён к единому современному стилю: карточки, радиусы, отступы,
  кнопки, Toolbar, Navigation, TabBar, Alert, единые контролы.
- Добавлены Dashboard, TabBar на 6 разделов и экраны-заглушки с единым
  оформлением и пояснением «Раздел будет реализован на следующем этапе».
- Поддержаны Light/Dark Mode (единый `ThemeManager`), Dynamic Type
  (относительные единицы), iPad (адаптивная ширина и сетки).

### Added — новые возможности

- **Dashboard** с карточкой «Последний расчёт» и сеткой быстрых переходов:
  Быстрый расчёт, История, Склад (заглушка), Отчёты (заглушка), Архив
  (заглушка), Настройки.
- **TabBar / навигация** через `NavigationStack`-эквивалент: вкладки Обзор,
  Расчёт, История, Склад, Отчёты, Настройки.
- **История расчётов** — сохранение результата в хранилище, поиск, удаление,
  очистка (через Alert).
- **Экран настроек** на базе слоя хранения: Email, Название предприятия,
  Оператор, Автоматическая отправка, Тёмная тема, Версия приложения.
- **Переиспользуемые компоненты**: `PrimaryButton`, `SecondaryButton`,
  `CardView`, `SectionHeader`, `InfoRow`, `StatusBadge`, `MetricCard`,
  `LoadingView`, `EmptyState`, `SearchBar` (+ `TabBar`, `ScreenScaffold`).
- **ThemeManager** и единый набор токенов (цвета, шрифты, отступы, радиусы,
  иконки, анимации) — без «магических» значений в экранах.

### Changed — изменения

- `App.tsx` переписан: провайдеры + таблица маршрутов + постоянный `TabBar`.
- `main.tsx` — убран force-unwrap (`!`) при получении корневого элемента.
- `vite.config.ts` — разбиение крупных вендоров на отдельные чанки
  (сборка без предупреждений о размере бандла).

### Removed — удалено

- `client/src/pages/roll-cutting-calculator.tsx` — единый экран разбит на
  `CalculatorView` + `useCalculatorViewModel` + `CuttingScheme` (логика и UI
  сохранены).

---

## Новая архитектура

Слои (каталоги в `client/src/`):

| Группа | Назначение |
| --- | --- |
| `app/` | Точка входа, провайдеры, конфигурация навигации |
| `core/` | Тема (`ThemeManager`, токены), DI-контейнер, движок расчёта |
| `models/` | Доменные модели (данные, сериализуемые, с `id`) |
| `analytics/` | Модели KPI для будущей аналитики |
| `services/` | `CalculationService`, `ReportService`, `EmailService` |
| `repositories/` | Протокол репозитория и реализации (не зависят от UI) |
| `storage/` | Заменяемый слой хранения (`KeyValueStore` + `localStorage`) |
| `viewmodels/` | По одному ViewModel на каждый экран (MVVM) |
| `views/` | Экраны (только из переиспользуемых компонентов) |
| `components/` | Библиотека UI-компонентов |
| `resources/` | Строки, иконки, метаданные приложения |
| `extensions/` | Форматтеры чисел и дат |
| `utilities/` | Общие утилиты (генерация `id`) |
| `reports/` | Зарезервировано под генерацию отчётов следующего этапа |

Принципы: SOLID, DRY, KISS, композиция вместо наследования, Dependency
Injection (единый composition root в `core/di/container.ts`), протокол-
ориентированный дизайн (`Repository`, `*Service`), `async/await` в сервисах и
репозиториях. Бизнес-логики внутри View нет — каждый экран работает только со
своим ViewModel.

### Новые файлы (основное)

```
app/navigation.ts, app/providers/AppProviders.tsx
core/theme/theme.ts, core/theme/ThemeManager.tsx
core/di/container.ts, core/di/AppServices.tsx
core/calculator/calculatorLogic.ts            (перенос, без изменений)
models/{Material,Jumbo,CuttingOrder,CuttingRoll,Waste,JumboOperation,
        Settings,Report,JumboStatus,index}.ts
analytics/{statistics,index}.ts
services/{CalculationService,ReportService,EmailService,index}.ts
repositories/{Repository,CuttingOrderRepository,JumboRepository,
              SettingsRepository,index}.ts
storage/{KeyValueStore,LocalStorageStore,StorageKeys}.ts
viewmodels/{useCalculatorViewModel,useDashboardViewModel,useHistoryViewModel,
            useWarehouseViewModel,useReportsViewModel,useSettingsViewModel,
            calculatorSchema,index}.ts
views/{DashboardView,CalculatorView,HistoryView,WarehouseView,ReportsView,
       SettingsView,index}.tsx, views/calculator/CuttingScheme.tsx
components/{PrimaryButton,SecondaryButton,CardView,SectionHeader,InfoRow,
            StatusBadge,MetricCard,LoadingView,EmptyState,SearchBar,TabBar,
            ScreenScaffold,index}.tsx
resources/{strings,icons,appInfo}.ts
extensions/{number,date}.ts, utilities/id.ts
```

### Изменённые файлы

```
client/src/App.tsx
client/src/main.tsx
vite.config.ts
client/src/lib/calculator_logic.ts → client/src/core/calculator/calculatorLogic.ts (rename)
```

---

## Подготовка к следующим этапам

- **Склад Джамбов.** Модель `Jumbo` хранит поля учёта и аналитики: номер
  складского учёта, код материала, ширина, начальная намотка, текущий остаток,
  общий использованный метраж, полезная площадь, накопленный брак, накопленные
  технологические остатки, коэффициент использования, даты поступления / начала
  / окончания использования, статус.
- **Инкрементальный учёт.** Накопительные значения хранятся прямо в записи
  Джамба, а модель `JumboOperation` фиксирует дельты каждой операции. Это
  заложено так, чтобы после каждой операции остаток и показатели обновлялись
  инкрементально, а не пересчитывались по всей истории.
- **Статусы.** `JumboStatus` (На складе / В работе / Подлежит списанию / Архив)
  с цветовой схемой (обычный / жёлтый / красный / серый) через `StatusBadge`.
- **Аналитика (KPI).** Подготовлены модели `MaterialStatistics`,
  `MachineStatistics`, `OperatorStatistics`, `WasteStatistics`,
  `ProductionStatistics` (структура без расчётов).
- **Отчёты.** `ReportService` — интерфейс + запись запроса без генерации PDF.
- **Email.** `EmailService` — API определён, реализация появится позже.
- **Хранение.** `Repository`-протокол и заменяемый `KeyValueStore` позволяют
  перейти на другое хранилище (сервер / IndexedDB / SwiftData-эквивалент) без
  изменений в ViewModel и View.
